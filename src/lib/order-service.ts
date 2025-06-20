
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit, Timestamp, doc, updateDoc } from 'firebase/firestore';

// Track processed orders to prevent duplicates
const processedOrders = new Set<string>();

export const markOrderAsProcessed = (orderId: string) => {
  processedOrders.add(orderId);
  console.log("Marked order as processed:", orderId);
};

export const isOrderProcessed = (orderId: string): boolean => {
  return processedOrders.has(orderId);
};

export const checkForRecentDuplicateOrder = async (
  userId: string,
  email: string,
  amount: number
): Promise<{ isDuplicate: boolean; existingOrderId?: string }> => {
  try {
    console.log("Checking for recent duplicate orders...");
    
    // Check for orders within the last 5 minutes with same user and amount
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const recentOrdersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('totalAmount', '==', amount),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    const recentOrdersSnapshot = await getDocs(recentOrdersQuery);
    
    for (const doc of recentOrdersSnapshot.docs) {
      const orderData = doc.data();
      const orderTimestamp = orderData.timestamp;
      
      let orderDate: Date;
      if (orderTimestamp && typeof orderTimestamp === 'object' && orderTimestamp.toDate) {
        orderDate = orderTimestamp.toDate();
      } else if (orderTimestamp instanceof Date) {
        orderDate = orderTimestamp;
      } else if (orderData.createdAt instanceof Date) {
        orderDate = orderData.createdAt;
      } else {
        continue;
      }
      
      if (orderDate > fiveMinutesAgo) {
        console.log("Found recent duplicate order:", doc.id);
        return {
          isDuplicate: true,
          existingOrderId: doc.id
        };
      }
    }
    
    return { isDuplicate: false };
    
  } catch (error) {
    console.error("Error checking for duplicate orders:", error);
    return { isDuplicate: false };
  }
};

// Simple function to move order from pending to completed after payment verification
export const moveOrderToCompleted = async (orderId: string, razorpayPaymentId: string): Promise<boolean> => {
  try {
    console.log("Moving order to completed:", orderId, razorpayPaymentId);
    
    const orderRef = doc(db, 'orders', orderId);
    await updateDoc(orderRef, {
      status: 'received',
      paymentStatus: 'paid',
      razorpayPaymentId: razorpayPaymentId,
      paymentCompletedAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    });
    
    console.log("Order moved to completed successfully");
    return true;
    
  } catch (error) {
    console.error("Error moving order to completed:", error);
    return false;
  }
};

export const getOrdersByStatus = async (status: string): Promise<any[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', '==', status),
      orderBy('timestamp', 'desc')
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error(`Error fetching orders with status ${status}:`, error);
    return [];
  }
};

export const getPendingPaymentOrders = async (userId: string): Promise<any[]> => {
  try {
    const pendingQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('paymentStatus', '==', 'pending'),
      orderBy('timestamp', 'desc')
    );
    
    const pendingSnapshot = await getDocs(pendingQuery);
    return pendingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Error fetching pending payment orders:", error);
    return [];
  }
};

export const getCompletedOrders = async (userId: string): Promise<any[]> => {
  try {
    const completedQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('paymentStatus', '==', 'paid'),
      orderBy('timestamp', 'desc')
    );
    
    const completedSnapshot = await getDocs(completedQuery);
    return completedSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Error fetching completed orders:", error);
    return [];
  }
};

export const getAllUserOrders = async (userId: string): Promise<any[]> => {
  try {
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    return ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};
