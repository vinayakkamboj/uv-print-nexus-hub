
import { db } from './firebase';
import { collection, getDocs, query, orderBy, where, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { SimpleOrderData } from './invoice-service';

export interface AdminStats {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: Date;
  orders: SimpleOrderData[];
}

export const getAdminStats = async (): Promise<AdminStats> => {
  try {
    console.log("🔄 Fetching admin stats...");
    
    // Fetch all orders
    const ordersSnapshot = await getDocs(
      query(collection(db, "orders"), orderBy("timestamp", "desc"))
    );
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimpleOrderData[];

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    // Count pending orders (pending_payment, received, processing)
    const pendingOrders = orders.filter(order => 
      order.status === 'pending_payment' || 
      order.status === 'received' || 
      order.status === 'processing'
    ).length;
    
    // Count completed orders (shipped, delivered)
    const completedOrders = orders.filter(order => 
      order.status === 'shipped' || 
      order.status === 'delivered'
    ).length;

    // Get unique users count
    const uniqueUsers = new Set(orders.map(order => order.userId));
    const totalUsers = uniqueUsers.size;

    console.log("✅ Admin stats fetched successfully");
    
    return {
      totalOrders,
      totalUsers,
      totalRevenue,
      pendingOrders,
      completedOrders
    };
    
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    return {
      totalOrders: 0,
      totalUsers: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0
    };
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  try {
    console.log("🔄 Fetching all users...");
    
    // Fetch all orders
    const ordersSnapshot = await getDocs(
      query(collection(db, "orders"), orderBy("timestamp", "desc"))
    );
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimpleOrderData[];

    // Group orders by user
    const userMap = new Map<string, UserProfile>();
    
    orders.forEach(order => {
      const userId = order.userId;
      const userEmail = order.customerEmail;
      const userName = order.customerName;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          id: userId,
          name: userName,
          email: userEmail,
          totalOrders: 0,
          totalSpent: 0,
          orders: []
        });
      }
      
      const userProfile = userMap.get(userId)!;
      userProfile.orders.push(order);
      userProfile.totalOrders++;
      
      if (order.paymentStatus === 'paid') {
        userProfile.totalSpent += order.totalAmount || 0;
      }
      
      // Update last order date
      if (order.timestamp) {
        const orderDate = order.timestamp.seconds 
          ? new Date(order.timestamp.seconds * 1000)
          : new Date(order.timestamp);
        
        if (!userProfile.lastOrderDate || orderDate > userProfile.lastOrderDate) {
          userProfile.lastOrderDate = orderDate;
        }
      }
    });

    const users = Array.from(userMap.values());
    console.log(`✅ Fetched ${users.length} users`);
    
    return users;
    
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return [];
  }
};

export const getRecentOrders = async (limit: number = 10): Promise<SimpleOrderData[]> => {
  try {
    console.log(`🔄 Fetching ${limit} recent orders...`);
    
    const ordersSnapshot = await getDocs(
      query(collection(db, "orders"), orderBy("timestamp", "desc"))
    );
    
    const orders = ordersSnapshot.docs
      .slice(0, limit)
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimpleOrderData[];

    console.log(`✅ Fetched ${orders.length} recent orders`);
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching recent orders:", error);
    return [];
  }
};

export const updateOrderStatus = async (
  orderId: string, 
  newStatus: SimpleOrderData['status'], 
  paymentStatus?: SimpleOrderData['paymentStatus']
): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("🔄 Updating order status:", orderId, newStatus);
    
    const updateData: any = {
      status: newStatus,
      lastUpdated: Timestamp.now()
    };
    
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }

    await updateDoc(doc(db, "orders", orderId), updateData);
    
    console.log("✅ Order status updated successfully");
    return { success: true };
    
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to update order status" 
    };
  }
};
