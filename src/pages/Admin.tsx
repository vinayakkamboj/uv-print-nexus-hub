import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, Users, DollarSign, TrendingUp, Shield, LogOut } from "lucide-react";
import AdminAuth from "@/components/admin/AdminAuth";
import AdminUserManager from "@/components/admin/AdminUserManager";
import OrderManagement from "@/components/admin/OrderManagement";
import UserManagement from "@/components/admin/UserManagement";
import PaymentManagement from "@/components/admin/PaymentManagement";
import AdminStats from "@/components/admin/AdminStats";
import RecentOrdersManagement from "@/components/admin/RecentOrdersManagement";

const Admin = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    adminUsers: 3
  });

  // Check if user is authorized admin
  const getAuthorizedEmails = (): string[] => {
    const storedAdmins = localStorage.getItem('admin_users');
    if (storedAdmins) {
      const adminUsers = JSON.parse(storedAdmins);
      return adminUsers.map((admin: any) => admin.email);
    }
    return [
      "help@microuvprinters.com",
      "laxmankamboj@gmail.com", 
      "vinayakkamboj01@gmail.com"
    ];
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardStats();
    }
  }, [isAuthenticated]);

  const fetchDashboardStats = async () => {
    try {
      const { fetchAdminStats } = await import('@/lib/admin-service');
      const adminStats = await fetchAdminStats();
      
      setStats({
        totalOrders: adminStats.totalOrders,
        totalUsers: adminStats.totalUsers,
        totalRevenue: adminStats.totalRevenue,
        adminUsers: getAuthorizedEmails().length
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const checkAuthStatus = () => {
    const authenticated = sessionStorage.getItem('admin_authenticated');
    const sessionEmail = sessionStorage.getItem('admin_session_email');
    const sessionStart = sessionStorage.getItem('admin_session_start');

    if (authenticated === 'true' && sessionEmail && sessionStart) {
      // Check if session is still valid (24 hours)
      const sessionAge = Date.now() - parseInt(sessionStart);
      const maxSessionAge = 24 * 60 * 60 * 1000; // 24 hours

      if (sessionAge < maxSessionAge) {
        const authorizedEmails = getAuthorizedEmails();
        if (authorizedEmails.includes(sessionEmail)) {
          setIsAuthenticated(true);
          setAdminEmail(sessionEmail);
        } else {
          handleLogout();
        }
      } else {
        handleLogout();
      }
    }
    setLoading(false);
  };

  const handleAuthenticated = (email: string) => {
    setIsAuthenticated(true);
    setAdminEmail(email);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('admin_authenticated');
    sessionStorage.removeItem('admin_session_email');
    sessionStorage.removeItem('admin_session_start');
    sessionStorage.removeItem('admin_otp');
    sessionStorage.removeItem('admin_email');
    setIsAuthenticated(false);
    setAdminEmail('');
    
    toast({
      title: "Logged Out",
      description: "You have been logged out of the admin portal.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Admin Portal</h1>
              <p className="text-gray-600 mt-1 lg:mt-2 text-sm lg:text-base">
                Welcome, {adminEmail} | Manage orders, users, and business operations
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="self-start sm:self-auto">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-6 lg:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                  <Package className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-blue-800">Total Orders</p>
                  <p className="text-xl lg:text-2xl font-bold text-blue-900">{stats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg shrink-0">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-green-800">Total Users</p>
                  <p className="text-xl lg:text-2xl font-bold text-green-900">{stats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg shrink-0">
                  <DollarSign className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-purple-800">Revenue</p>
                  <p className="text-xl lg:text-2xl font-bold text-purple-900">₹{stats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg shrink-0">
                  <Shield className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-orange-800">Admin Users</p>
                  <p className="text-xl lg:text-2xl font-bold text-orange-900">{stats.adminUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <AdminStats />

        {/* Main Content Tabs */}
        <Tabs defaultValue="recent-orders" className="mt-6 lg:mt-8">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-5 min-w-[500px] lg:min-w-0">
              <TabsTrigger value="recent-orders" className="flex items-center gap-2 text-xs lg:text-sm">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">Recent Orders</span>
                <span className="sm:hidden">Recent</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2 text-xs lg:text-sm">
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Users</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex items-center gap-2 text-xs lg:text-sm">
                <Package className="h-4 w-4" />
                <span className="hidden sm:inline">All Orders</span>
                <span className="sm:hidden">All</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-2 text-xs lg:text-sm">
                <DollarSign className="h-4 w-4" />
                <span className="hidden sm:inline">Payments</span>
                <span className="sm:hidden">Pay</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-2 text-xs lg:text-sm">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Admins</span>
                <span className="sm:hidden">Admin</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="recent-orders">
            <RecentOrdersManagement onStatsUpdate={fetchDashboardStats} />
          </TabsContent>

          <TabsContent value="users">
            <UserManagement />
          </TabsContent>

          <TabsContent value="orders">
            <OrderManagement onStatsUpdate={fetchDashboardStats} />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="admins">
            <AdminUserManager currentAdminEmail={adminEmail} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
