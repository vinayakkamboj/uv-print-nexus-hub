
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

export interface SimpleOrderData {
  id?: string;
  userId: string;
  productType: string;
  quantity: number;
  specifications?: string;
  deliveryAddress: string;
  gstNumber?: string;
  fileUrl: string;
  fileName: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  hsnCode: string;
  trackingId: string;
  status: 'pending_payment' | 'received' | 'processing' | 'printed' | 'shipped' | 'delivered';
  paymentStatus: 'pending' | 'paid' | 'failed';
  timestamp: any;
  razorpayPaymentId?: string;
  paymentCompletedAt?: any;
  invoiceId?: string;
  lastUpdated?: any;
}

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing database connection...");
    
    // Simple test query with limit to avoid large data fetch
    const testQuery = query(collection(db, 'orders'), limit(1));
    await getDocs(testQuery);
    
    console.log("✅ Database connection successful");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
};

export const createOrder = async (orderData: Omit<SimpleOrderData, 'id' | 'status' | 'paymentStatus' | 'timestamp' | 'lastUpdated'>): Promise<{ success: boolean; orderId?: string; message?: string }> => {
  try {
    console.log("🔄 Creating order...");
    
    // Validate required fields
    if (!orderData.userId || !orderData.customerEmail) {
      return { success: false, message: "Missing required fields" };
    }
    
    // Create order with default status
    const orderWithDefaults: Omit<SimpleOrderData, 'id'> = {
      ...orderData,
      status: 'pending_payment',
      paymentStatus: 'pending',
      timestamp: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };

    console.log("📤 Adding order to Firestore...");
    const docRef = await addDoc(collection(db, 'orders'), orderWithDefaults);
    console.log("✅ Order created with ID:", docRef.id);
    
    return {
      success: true,
      orderId: docRef.id
    };
    
  } catch (error) {
    console.error("❌ Error creating order:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create order"
    };
  }
};

export const updateOrderAfterPayment = async (orderId: string, razorpayPaymentId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("🔄 Updating order after payment:", orderId);
    
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      return { success: false, message: "Order not found" };
    }
    
    const orderData = orderDoc.data() as SimpleOrderData;
    const invoiceId = `INV-${orderData.trackingId}-${Date.now().toString().slice(-6)}`;
    
    const updateData = {
      status: 'received',
      paymentStatus: 'paid',
      razorpayPaymentId: razorpayPaymentId,
      paymentCompletedAt: Timestamp.now(),
      invoiceId: invoiceId,
      lastUpdated: Timestamp.now()
    };
    
    await updateDoc(orderRef, updateData);
    console.log("✅ Order updated successfully");
    
    return { success: true };
    
  } catch (error) {
    console.error("❌ Error updating order:", error);
    return { success: false, message: "Failed to update order" };
  }
};

export const createAndSendInvoice = async (orderData: SimpleOrderData): Promise<{ success: boolean; invoiceId?: string; message?: string }> => {
  try {
    console.log("🔄 Creating invoice for order:", orderData.id);
    
    const invoiceId = orderData.invoiceId || `INV-${orderData.trackingId}-${Date.now().toString().slice(-6)}`;
    
    if (orderData.id && !orderData.invoiceId) {
      try {
        await updateDoc(doc(db, 'orders', orderData.id), {
          invoiceId,
          lastUpdated: Timestamp.now()
        });
      } catch (updateError) {
        console.error("❌ Error updating invoice ID:", updateError);
      }
    }
    
    return {
      success: true,
      invoiceId
    };
    
  } catch (error) {
    console.error("❌ Error creating invoice:", error);
    return {
      success: false,
      message: "Failed to create invoice"
    };
  }
};

export const getUserOrders = async (userId: string): Promise<SimpleOrderData[]> => {
  try {
    console.log("🔄 Fetching orders for user:", userId);
    
    if (!userId) {
      console.log("❌ No user ID provided");
      return [];
    }
    
    // Simple query without orderBy first to avoid issues
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId)
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    console.log("📊 Query completed. Documents found:", ordersSnapshot.docs.length);
    
    if (ordersSnapshot.docs.length === 0) {
      console.log("⚠️ No orders found for user:", userId);
      return [];
    }
    
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data
      };
    }) as SimpleOrderData[];
    
    // Sort in JavaScript instead of Firestore to avoid indexing issues
    orders.sort((a, b) => {
      if (!a.timestamp || !b.timestamp) return 0;
      if (typeof a.timestamp === 'object' && a.timestamp.seconds) {
        return b.timestamp.seconds - a.timestamp.seconds;
      }
      return 0;
    });
    
    console.log(`✅ Returning ${orders.length} orders for user`);
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    return [];
  }
};
