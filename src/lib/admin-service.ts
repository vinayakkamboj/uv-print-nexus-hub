
import { db } from './firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, limit, where, Timestamp } from 'firebase/firestore';
import { SimpleOrderData } from './invoice-service';

export interface AdminStats {
  totalOrders: number;
  totalUsers: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  activeUsers: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  createdAt: any;
  lastLogin?: any;
  totalOrders: number;
  totalSpent: number;
  recentOrders: SimpleOrderData[];
}

export const fetchAdminStats = async (): Promise<AdminStats> => {
  try {
    console.log("🔄 Fetching admin statistics...");
    
    // Fetch all orders
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimpleOrderData[];
    
    // Fetch all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs;
    
    // Calculate stats
    const totalOrders = orders.length;
    const totalUsers = users.length;
    const totalRevenue = orders
      .filter(order => order.paymentStatus === 'paid')
      .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    
    const pendingOrders = orders.filter(order => 
      order.status === 'pending' || order.status === 'pending_payment'
    ).length;
    
    const completedOrders = orders.filter(order => 
      order.status === 'delivered' || order.status === 'completed'
    ).length;
    
    // Active users in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const activeUsers = users.filter(doc => {
      const userData = doc.data();
      if (userData.lastLogin) {
        const lastLogin = userData.lastLogin.seconds ? 
          new Date(userData.lastLogin.seconds * 1000) : 
          new Date(userData.lastLogin);
        return lastLogin > thirtyDaysAgo;
      }
      return false;
    }).length;
    
    console.log("✅ Admin stats fetched successfully");
    return {
      totalOrders,
      totalUsers,
      totalRevenue,
      pendingOrders,
      completedOrders,
      activeUsers
    };
    
  } catch (error) {
    console.error("❌ Error fetching admin stats:", error);
    return {
      totalOrders: 0,
      totalUsers: 0,
      totalRevenue: 0,
      pendingOrders: 0,
      completedOrders: 0,
      activeUsers: 0
    };
  }
};

export const fetchAllUsers = async (): Promise<UserProfile[]> => {
  try {
    console.log("🔄 Fetching all users...");
    
    // Fetch users
    const usersSnapshot = await getDocs(
      query(collection(db, 'users'), orderBy('createdAt', 'desc'))
    );
    
    // Fetch all orders
    const ordersSnapshot = await getDocs(collection(db, 'orders'));
    const allOrders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SimpleOrderData[];
    
    const users: UserProfile[] = usersSnapshot.docs.map(doc => {
      const userData = doc.data();
      const userOrders = allOrders.filter(order => order.userId === doc.id);
      const totalSpent = userOrders
        .filter(order => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      
      // Get recent orders (last 5)
      const recentOrders = userOrders
        .sort((a, b) => {
          const aTime = a.timestamp?.seconds || 0;
          const bTime = b.timestamp?.seconds || 0;
          return bTime - aTime;
        })
        .slice(0, 5);
      
      return {
        uid: doc.id,
        name: userData.name || 'Unknown',
        email: userData.email || '',
        phone: userData.phone,
        gstNumber: userData.gstNumber,
        address: userData.address,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        totalOrders: userOrders.length,
        totalSpent,
        recentOrders
      };
    });
    
    console.log(`✅ Fetched ${users.length} users successfully`);
    return users;
    
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return [];
  }
};

export const fetchAllOrders = async (): Promise<SimpleOrderData[]> => {
  try {
    console.log("🔄 Fetching all orders...");
    
    const ordersSnapshot = await getDocs(
      query(collection(db, 'orders'), orderBy('timestamp', 'desc'))
    );
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Ensure backward compatibility
      executionStatus: doc.data().executionStatus || 'order_created',
      executionProgress: doc.data().executionProgress || 20
    })) as SimpleOrderData[];
    
    console.log(`✅ Fetched ${orders.length} orders successfully`);
    return orders;
    
  } catch (error) {
    console.error("❌ Error fetching orders:", error);
    return [];
  }
};

export const fetchRecentOrders = async (limitCount: number = 10): Promise<SimpleOrderData[]> => {
  try {
    console.log("🔄 Fetching recent orders...");
    
    const ordersSnapshot = await getDocs(
      query(
        collection(db, 'orders'), 
        orderBy('timestamp', 'desc'),
        limit(limitCount)
      )
    );
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      executionStatus: doc.data().executionStatus || 'order_created',
      executionProgress: doc.data().executionProgress || 20
    })) as SimpleOrderData[];
    
    console.log(`✅ Fetched ${orders.length} recent orders successfully`);
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
    
    // Update execution status based on main status
    switch (newStatus) {
      case 'received':
        updateData.executionStatus = 'processing';
        updateData.executionProgress = 40;
        break;
      case 'processing':
        updateData.executionStatus = 'quality_check';
        updateData.executionProgress = 60;
        break;
      case 'shipped':
        updateData.executionStatus = 'shipped';
        updateData.executionProgress = 80;
        break;
      case 'delivered':
        updateData.executionStatus = 'delivered';
        updateData.executionProgress = 100;
        break;
    }
    
    await updateDoc(doc(db, 'orders', orderId), updateData);
    
    console.log("✅ Order status updated successfully");
    return { success: true };
    
  } catch (error) {
    console.error("❌ Error updating order status:", error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : "Failed to update order" 
    };
  }
};
