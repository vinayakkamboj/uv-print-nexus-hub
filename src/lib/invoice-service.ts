
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp, query, where, getDocs, orderBy } from 'firebase/firestore';
import { generateInvoicePDF } from './invoice-generator';
import { sendInvoiceEmail } from './email-service';
import { PaymentDetails } from './payment-service';

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

export const createOrder = async (orderData: Omit<SimpleOrderData, 'id' | 'status' | 'paymentStatus' | 'timestamp' | 'lastUpdated'>): Promise<{ success: boolean; orderId?: string; message?: string }> => {
  try {
    console.log("🔄 Creating order with data:", orderData);
    
    // Validate required fields
    if (!orderData.userId) {
      console.error("❌ User ID is missing");
      return { success: false, message: "User ID is required" };
    }
    
    if (!orderData.customerEmail) {
      console.error("❌ Customer email is missing");
      return { success: false, message: "Customer email is required" };
    }
    
    // Test write permission before creating order
    console.log("🧪 Testing write permission to orders collection...");
    
    // Create order with default pending payment status
    const orderWithDefaults: Omit<SimpleOrderData, 'id'> = {
      ...orderData,
      status: 'pending_payment',
      paymentStatus: 'pending',
      timestamp: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };

    console.log("📤 Adding order to Firestore collection 'orders'...");
    console.log("📊 Order data being saved:", JSON.stringify(orderWithDefaults, null, 2));
    
    const docRef = await addDoc(collection(db, 'orders'), orderWithDefaults);
    
    console.log("✅ Order created successfully with ID:", docRef.id);
    
    // Force a small delay to ensure Firestore consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the order was actually created by reading it back
    const createdOrder = await getDoc(docRef);
    if (createdOrder.exists()) {
      const orderData = createdOrder.data();
      console.log("✅ Order verification successful, data:", orderData);
      console.log("✅ Order userId matches:", orderData.userId === orderWithDefaults.userId);
    } else {
      console.error("❌ Order verification failed - document doesn't exist");
      return { success: false, message: "Order creation verification failed" };
    }
    
    return {
      success: true,
      orderId: docRef.id
    };
    
  } catch (error) {
    console.error("❌ Error creating order:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error details:", error instanceof Error ? error.message : "Unknown error");
    console.error("❌ Error stack:", error instanceof Error ? error.stack : "No stack trace");
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        message: "Permission denied. Please check Firebase security rules."
      };
    }
    
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create order"
    };
  }
};

export const updateOrderAfterPayment = async (orderId: string, razorpayPaymentId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("🔄 Updating order after successful payment:", orderId, razorpayPaymentId);
    
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      console.error("❌ Order not found:", orderId);
      return { success: false, message: "Order not found" };
    }
    
    const orderData = orderDoc.data() as SimpleOrderData;
    console.log("📊 Existing order data:", orderData);
    
    // Generate unique invoice ID
    const invoiceId = `INV-${orderData.trackingId}-${Date.now().toString().slice(-6)}`;
    
    const updateData = {
      status: 'received',
      paymentStatus: 'paid',
      razorpayPaymentId: razorpayPaymentId,
      paymentCompletedAt: Timestamp.now(),
      invoiceId: invoiceId,
      lastUpdated: Timestamp.now()
    };
    
    console.log("📤 Updating order with data:", updateData);
    
    // Update order with payment success and move to received status
    await updateDoc(orderRef, updateData);
    
    // Force a small delay to ensure Firestore consistency
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify the update was successful
    const updatedOrder = await getDoc(orderRef);
    if (updatedOrder.exists()) {
      const updatedData = updatedOrder.data();
      console.log("✅ Order update verification successful, data:", updatedData);
      console.log("✅ Payment status updated to:", updatedData.paymentStatus);
      console.log("✅ Invoice ID set to:", updatedData.invoiceId);
    } else {
      console.error("❌ Order update verification failed");
      return { success: false, message: "Order update verification failed" };
    }
    
    console.log("✅ Order updated successfully after payment with invoice ID:", invoiceId);
    return { success: true };
    
  } catch (error) {
    console.error("❌ Error updating order after payment:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error details:", error instanceof Error ? error.message : "Unknown error");
    
    if (error.code === 'permission-denied') {
      return { success: false, message: "Permission denied. Cannot update order." };
    }
    
    return { success: false, message: "Failed to update order" };
  }
};

export const createAndSendInvoice = async (orderData: SimpleOrderData): Promise<{ success: boolean; invoiceId?: string; message?: string }> => {
  try {
    console.log("🔄 Creating and sending invoice for order:", orderData.id);
    
    // Generate invoice ID if not exists
    const invoiceId = orderData.invoiceId || `INV-${orderData.trackingId}-${Date.now().toString().slice(-6)}`;
    
    // Update order with invoice ID if not already set
    if (orderData.id && !orderData.invoiceId) {
      try {
        await updateDoc(doc(db, 'orders', orderData.id), {
          invoiceId,
          lastUpdated: Timestamp.now()
        });
        console.log("✅ Order updated with invoice ID");
      } catch (updateError) {
        console.error("❌ Error updating order with invoice ID:", updateError);
      }
    }
    
    console.log("✅ Invoice process completed");
    return {
      success: true,
      invoiceId
    };
    
  } catch (error) {
    console.error("❌ Error creating and sending invoice:", error);
    return {
      success: false,
      message: "Failed to create invoice"
    };
  }
};

export const getUserOrders = async (userId: string): Promise<SimpleOrderData[]> => {
  try {
    console.log("🔄 Fetching orders for user:", userId);
    console.log("🔍 Attempting to query orders collection...");
    
    if (!userId) {
      console.error("❌ User ID is empty or undefined");
      return [];
    }
    
    // Test read permission first
    console.log("🧪 Testing read permission to orders collection...");
    
    // Query orders directly from Firestore with better error handling
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    console.log("📤 Executing Firestore query for user orders...");
    const ordersSnapshot = await getDocs(ordersQuery);
    
    console.log("📊 Query completed, processing results...");
    console.log("📊 Number of documents found:", ordersSnapshot.docs.length);
    
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log("📄 Processing order document:", doc.id, data);
      return {
        id: doc.id,
        ...data
      };
    }) as SimpleOrderData[];
    
    console.log(`✅ Found ${orders.length} orders for user ${userId}`);
    console.log("📊 Orders data:", orders);
    
    // Log each order for debugging
    orders.forEach((order, index) => {
      console.log(`📋 Order ${index + 1}:`, {
        id: order.id,
        userId: order.userId,
        trackingId: order.trackingId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount
      });
    });
    
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    console.error("❌ Error details:", error instanceof Error ? error.message : "Unknown error");
    
    if (error.code === 'permission-denied') {
      console.error("❌ Permission denied when fetching orders. Check Firebase security rules.");
    }
    
    return [];
  }
};

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🔄 Testing database connection...");
    console.log("🧪 Testing read permission to orders collection...");
    
    // Try to read from the orders collection with a limit to test permissions
    const testQuery = query(
      collection(db, 'orders'), 
      orderBy('timestamp', 'desc')
    );
    const testSnapshot = await getDocs(testQuery);
    
    console.log("✅ Database connection test successful");
    console.log(`📊 Total orders in database: ${testSnapshot.docs.length}`);
    
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    
    if (error.code === 'permission-denied') {
      console.error("❌ Permission denied. Firebase security rules need to be updated.");
    }
    
    return false;
  }
};
