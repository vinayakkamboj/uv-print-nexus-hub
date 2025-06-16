
import { collection, addDoc, updateDoc, doc, getDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface OrderData {
  id?: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerGST?: string;
  productType: string;
  quantity: number;
  specifications: string;
  deliveryAddress: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentDetails?: {
    id: string;
    method: string;
    paymentId?: string;
  };
  trackingId?: string;
  timestamp: any;
  lastUpdated?: any;
}

// Track orders being created to prevent duplicates
const ordersBeingCreated = new Set<string>();

export const createOrder = async (orderData: Omit<OrderData, 'id' | 'timestamp' | 'lastUpdated'>): Promise<string> => {
  console.log("Creating order for user:", orderData.userId);
  
  // Create a unique key for this order attempt
  const orderKey = `${orderData.userId}_${orderData.productType}_${orderData.totalAmount}_${Date.now()}`;
  
  // Check if this exact order is already being created
  if (ordersBeingCreated.has(orderKey)) {
    console.log("Order creation already in progress, preventing duplicate");
    throw new Error("Order creation already in progress");
  }
  
  // Mark order as being created
  ordersBeingCreated.add(orderKey);
  
  try {
    // Check for recent duplicate orders (within last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const duplicateCheck = query(
      collection(db, "orders"),
      where("userId", "==", orderData.userId),
      where("productType", "==", orderData.productType),
      where("totalAmount", "==", orderData.totalAmount)
    );
    
    const duplicateSnapshot = await getDocs(duplicateCheck);
    const recentOrders = duplicateSnapshot.docs.filter(doc => {
      const orderTimestamp = doc.data().timestamp;
      if (orderTimestamp && orderTimestamp.toDate) {
        return orderTimestamp.toDate() > fiveMinutesAgo;
      }
      return false;
    });
    
    if (recentOrders.length > 0) {
      console.log("Recent duplicate order found, preventing creation");
      throw new Error("Duplicate order detected within 5 minutes");
    }
    
    // Generate tracking ID
    const trackingId = `MUV${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
    
    // Create the order
    const orderDoc = await addDoc(collection(db, "orders"), {
      ...orderData,
      trackingId,
      timestamp: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
    
    console.log("Order created successfully:", orderDoc.id);
    return orderDoc.id;
  } catch (error) {
    console.error("Error creating order:", error);
    throw error;
  } finally {
    // Always remove from tracking set
    ordersBeingCreated.delete(orderKey);
  }
};

export const updateOrderStatus = async (
  orderId: string, 
  status: string, 
  paymentStatus?: string,
  paymentDetails?: any
): Promise<void> => {
  console.log("Updating order status:", orderId, status, paymentStatus);
  
  try {
    const updateData: any = {
      status,
      lastUpdated: serverTimestamp()
    };
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    
    if (paymentDetails) {
      updateData.paymentDetails = paymentDetails;
    }
    
    await updateDoc(doc(db, "orders", orderId), updateData);
    console.log("Order status updated successfully");
  } catch (error) {
    console.error("Error updating order status:", error);
    throw error;
  }
};

export const getOrder = async (orderId: string): Promise<OrderData | null> => {
  try {
    const orderDoc = await getDoc(doc(db, "orders", orderId));
    if (orderDoc.exists()) {
      return { id: orderDoc.id, ...orderDoc.data() } as OrderData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching order:", error);
    throw error;
  }
};

export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", userId)
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderData[];
  } catch (error) {
    console.error("Error fetching user orders:", error);
    throw error;
  }
};

// Clear tracking sets (useful for cleanup)
export const clearOrderTracking = () => {
  ordersBeingCreated.clear();
  console.log("Cleared order creation tracking");
};
