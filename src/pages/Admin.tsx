import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Package, Users, IndianRupee, TrendingUp, Shield, LogOut } from "lucide-react";
import AdminAuth from "@/components/admin/AdminAuth";
import AdminUserManager from "@/components/admin/AdminUserManager";
import OrderManagement from "@/components/admin/OrderManagement";
import UserManagement from "@/components/admin/UserManagement";
import PaymentManagement from "@/components/admin/PaymentManagement";
import AdminStats from "@/components/admin/AdminStats";
import { getAdminStats, AdminStats as AdminStatsType } from "@/lib/admin-service";

const Admin = () => {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<AdminStatsType>({
    totalOrders: 0,
    totalUsers: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0
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
      fetchQuickStats();
    }
  }, [isAuthenticated]);

  const fetchQuickStats = async () => {
    try {
      console.log("🔄 Fetching quick stats for header cards...");
      const stats = await getAdminStats();
      setQuickStats(stats);
      console.log("✅ Quick stats loaded:", stats);
    } catch (error) {
      console.error("❌ Error fetching quick stats:", error);
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
        <div className="mb-6 lg:mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-gray-600 mt-2 text-sm lg:text-base">
              Welcome, {adminEmail} | Manage orders, users, and business operations
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout} className="w-full sm:w-auto">
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Quick Actions */}
        <div className="mb-6 lg:mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <Package className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-blue-800 truncate">Total Orders</p>
                  <p className="text-lg lg:text-2xl font-bold text-blue-900">{quickStats.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <Users className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-green-800 truncate">Total Users</p>
                  <p className="text-lg lg:text-2xl font-bold text-green-900">{quickStats.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <IndianRupee className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-purple-800 truncate">Revenue</p>
                  <p className="text-lg lg:text-2xl font-bold text-purple-900">₹{quickStats.totalRevenue.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Shield className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs lg:text-sm font-medium text-orange-800 truncate">Admin Users</p>
                  <p className="text-lg lg:text-2xl font-bold text-orange-900">{getAuthorizedEmails().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Overview */}
        <div className="mb-6 lg:mb-8">
          <AdminStats />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="orders" className="w-full">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-5 min-w-[600px] lg:min-w-full">
              <TabsTrigger value="orders" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                <Package className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Orders</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                <Users className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Users</span>
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                <IndianRupee className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Payments</span>
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                <Shield className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Admin Users</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center gap-1 lg:gap-2 text-xs lg:text-sm">
                <TrendingUp className="h-3 w-3 lg:h-4 lg:w-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="orders" className="mt-6">
            <OrderManagement />
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <UserManagement />
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <PaymentManagement />
          </TabsContent>

          <TabsContent value="admins" className="mt-6">
            <AdminUserManager currentAdminEmail={adminEmail} />
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Business Analytics</CardTitle>
                <CardDescription>Revenue trends and business insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-gray-500">
                  Analytics dashboard coming soon...
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
