import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp, query, where, getDocs, orderBy, enableNetwork, disableNetwork } from 'firebase/firestore';
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

export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log("🧪 Testing Firestore connection...");
    console.log("🔥 Firebase project:", db.app.options.projectId);
    
    // Test basic connection
    await enableNetwork(db);
    console.log("✅ Network enabled for Firestore");
    
    // Try to get any document to test read permissions
    console.log("🔍 Testing read permissions...");
    const testQuery = query(collection(db, 'orders'));
    const snapshot = await getDocs(testQuery);
    
    console.log("✅ Database connection successful");
    console.log(`📊 Found ${snapshot.docs.length} orders in database`);
    
    // Log some sample data if available
    if (snapshot.docs.length > 0) {
      const sampleOrder = snapshot.docs[0].data();
      console.log("📋 Sample order structure:", {
        id: snapshot.docs[0].id,
        userId: sampleOrder.userId,
        status: sampleOrder.status,
        timestamp: sampleOrder.timestamp
      });
    }
    
    return true;
  } catch (error) {
    console.error("❌ Database connection test failed:", error);
    console.error("❌ Error code:", error.code);
    console.error("❌ Error message:", error.message);
    
    if (error.code === 'permission-denied') {
      console.error("🚫 Permission denied - Firebase security rules need to be updated");
      console.error("📋 Required rules for orders collection:");
      console.error(`
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /orders/{orderId} {
              allow read, write: if request.auth != null;
            }
            match /users/{userId} {
              allow read, write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
      `);
    }
    
    return false;
  }
};

export const createOrder = async (orderData: Omit<SimpleOrderData, 'id' | 'status' | 'paymentStatus' | 'timestamp' | 'lastUpdated'>): Promise<{ success: boolean; orderId?: string; message?: string }> => {
  try {
    console.log("🔄 Creating order with enhanced debugging...");
    console.log("📊 Order data:", JSON.stringify(orderData, null, 2));
    
    // Validate Firebase connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      return { success: false, message: "Database connection failed. Check Firebase security rules." };
    }
    
    // Validate required fields
    if (!orderData.userId) {
      console.error("❌ User ID is missing");
      return { success: false, message: "User ID is required" };
    }
    
    if (!orderData.customerEmail) {
      console.error("❌ Customer email is missing");
      return { success: false, message: "Customer email is required" };
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
    console.log("🏪 Collection: orders");
    console.log("📋 Data being saved:", JSON.stringify(orderWithDefaults, null, 2));
    
    const docRef = await addDoc(collection(db, 'orders'), orderWithDefaults);
    console.log("✅ Order created with ID:", docRef.id);
    
    // Verify the order was created
    console.log("🔍 Verifying order creation...");
    const createdOrder = await getDoc(docRef);
    if (createdOrder.exists()) {
      const orderData = createdOrder.data();
      console.log("✅ Order verification successful");
      console.log("📊 Created order data:", orderData);
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
    console.error("❌ Full error object:", JSON.stringify(error, null, 2));
    
    if (error.code === 'permission-denied') {
      return {
        success: false,
        message: "Permission denied. Please update Firebase security rules to allow authenticated users to create orders."
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
    console.log("🔄 Fetching orders for user with enhanced debugging:", userId);
    
    if (!userId) {
      console.error("❌ User ID is empty");
      return [];
    }
    
    // Test database connection first
    const dbConnected = await testDatabaseConnection();
    if (!dbConnected) {
      console.error("❌ Database not connected, cannot fetch orders");
      return [];
    }
    
    console.log("📋 Querying orders collection...");
    console.log("🔍 Query: collection('orders').where('userId', '==', '" + userId + "')");
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    console.log("📊 Query completed. Documents found:", ordersSnapshot.docs.length);
    
    if (ordersSnapshot.docs.length === 0) {
      console.log("⚠️ No orders found for user:", userId);
      console.log("🔍 Possible reasons:");
      console.log("  1. User hasn't placed any orders yet");
      console.log("  2. Orders were created with different userId");
      console.log("  3. Firebase security rules are blocking access");
      console.log("  4. User is not authenticated properly");
      
      // Let's check if there are any orders in the database at all
      const allOrdersQuery = query(collection(db, 'orders'));
      try {
        const allOrdersSnapshot = await getDocs(allOrdersQuery);
        console.log("📊 Total orders in database:", allOrdersSnapshot.docs.length);
        
        if (allOrdersSnapshot.docs.length > 0) {
          console.log("📋 Sample userIds in database:");
          allOrdersSnapshot.docs.slice(0, 3).forEach((doc, index) => {
            const data = doc.data();
            console.log(`  ${index + 1}. Document ID: ${doc.id}, userId: ${data.userId}`);
          });
        }
      } catch (allOrdersError) {
        console.log("❌ Cannot read all orders (permission denied)");
      }
    }
    
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      console.log("📄 Processing order document:", doc.id);
      return {
        id: doc.id,
        ...data
      };
    }) as SimpleOrderData[];
    
    console.log(`✅ Returning ${orders.length} orders for user ${userId}`);
    orders.forEach((order, index) => {
      console.log(`📋 Order ${index + 1}:`, {
        id: order.id,
        trackingId: order.trackingId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        totalAmount: order.totalAmount
      });
    });
    
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    console.error("❌ Error details:", JSON.stringify(error, null, 2));
    
    if (error.code === 'permission-denied') {
      console.error("🚫 Permission denied when fetching orders");
      console.error("📋 Update your Firebase security rules to:");
      console.error(`
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /orders/{orderId} {
              allow read, write: if request.auth != null;
            }
          }
        }
      `);
    }
    
    return [];
  }
};
