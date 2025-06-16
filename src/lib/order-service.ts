
import { db } from './firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface RecentOrder {
  id: string;
  userId: string;
  customerEmail: string;
  totalAmount: number;
  timestamp: any;
  status: string;
  paymentStatus: string;
}

// Track processed orders to prevent duplicates
const processedOrders = new Set<string>();

// Check if an order was recently created to prevent duplicates
export const checkForRecentDuplicateOrder = async (
  userId: string,
  customerEmail: string,
  totalAmount: number,
  timeWindowMinutes: number = 5
): Promise<{ isDuplicate: boolean; existingOrderId?: string }> => {
  try {
    console.log("Checking for recent duplicate orders...");
    
    const timeThreshold = new Date();
    timeThreshold.setMinutes(timeThreshold.getMinutes() - timeWindowMinutes);
    
    // Query for recent orders by this user with same amount
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      where('customerEmail', '==', customerEmail),
      where('totalAmount', '==', totalAmount),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    const querySnapshot = await getDocs(ordersQuery);
    
    for (const doc of querySnapshot.docs) {
      const order = doc.data() as RecentOrder;
      const orderTime = order.timestamp?.toDate ? order.timestamp.toDate() : new Date(order.timestamp);
      
      if (orderTime > timeThreshold) {
        console.log("Found recent duplicate order:", doc.id);
        return { isDuplicate: true, existingOrderId: doc.id };
      }
    }
    
    return { isDuplicate: false };
    
  } catch (error) {
    console.error("Error checking for duplicate orders:", error);
    return { isDuplicate: false };
  }
};

// Mark an order as processed to prevent duplicate processing
export const markOrderAsProcessed = (orderId: string) => {
  processedOrders.add(orderId);
  console.log("Marked order as processed:", orderId);
};

// Check if an order is already being processed
export const isOrderBeingProcessed = (orderId: string): boolean => {
  return processedOrders.has(orderId);
};

// Clear processed orders tracking (useful for cleanup)
export const clearProcessedOrders = () => {
  processedOrders.clear();
  console.log("Cleared processed orders tracking");
};

// Get orders by status for proper filtering
export const getOrdersByStatus = async (status: 'pending' | 'completed' | 'all', userId?: string) => {
  try {
    let ordersQuery;
    
    if (userId) {
      if (status === 'pending') {
        ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          where('paymentStatus', 'in', ['pending', 'failed']),
          orderBy('timestamp', 'desc')
        );
      } else if (status === 'completed') {
        ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          where('paymentStatus', '==', 'paid'),
          orderBy('timestamp', 'desc')
        );
      } else {
        ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          orderBy('timestamp', 'desc')
        );
      }
    } else {
      if (status === 'pending') {
        ordersQuery = query(
          collection(db, 'orders'),
          where('paymentStatus', 'in', ['pending', 'failed']),
          orderBy('timestamp', 'desc')
        );
      } else if (status === 'completed') {
        ordersQuery = query(
          collection(db, 'orders'),
          where('paymentStatus', '==', 'paid'),
          orderBy('timestamp', 'desc')
        );
      } else {
        ordersQuery = query(
          collection(db, 'orders'),
          orderBy('timestamp', 'desc')
        );
      }
    }
    
    const querySnapshot = await getDocs(ordersQuery);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
  } catch (error) {
    console.error("Error fetching orders by status:", error);
    return [];
  }
};
