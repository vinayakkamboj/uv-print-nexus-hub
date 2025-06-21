import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency, isValidGSTIN } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, FileText, Settings, Clock, Package, CheckCircle, Truck, CreditCard, Download, AlertCircle } from "lucide-react";
import { getUserOrders, SimpleOrderData, testDatabaseConnection } from "@/lib/invoice-service";
import { initializeRazorpay, createRazorpayOrder, processPayment } from "@/lib/payment-service";
import { updateOrderAfterPayment } from "@/lib/invoice-service";
import { downloadInvoice } from "@/lib/invoice-generator";

export default function Dashboard() {
  const { userData, user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<SimpleOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'failed'>('checking');
  const navigate = useNavigate();

  const [name, setName] = useState(userData?.name || "");
  const [phone, setPhone] = useState(userData?.phone || "");
  const [gstNumber, setGstNumber] = useState(userData?.gstNumber || "");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (userData?.name) setName(userData.name);
    if (userData?.phone) setPhone(userData.phone);
    if (userData?.gstNumber) setGstNumber(userData.gstNumber);
  }, [userData]);

  const fetchUserOrders = async () => {
    const currentUserId = userData?.uid || user?.uid;
    
    if (!currentUserId) {
      console.log("❌ No user ID available, skipping order fetch");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("🔄 Starting enhanced order fetch process...");
      console.log("👤 User details:", { 
        userDataUid: userData?.uid, 
        userUid: user?.uid,
        userEmail: userData?.email || user?.email,
        userName: userData?.name || user?.displayName
      });
      
      // Test database connection with detailed logging
      console.log("🧪 Testing database connection...");
      setDbStatus('checking');
      const dbConnected = await testDatabaseConnection();
      
      if (!dbConnected) {
        console.error("❌ Database connection failed");
        setDbStatus('failed');
        toast({
          title: "Database Connection Failed",
          description: "Unable to connect to database. Please check Firebase security rules or contact support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      console.log("✅ Database connection successful");
      setDbStatus('connected');
      
      console.log("📋 Fetching orders for user:", currentUserId);
      const ordersData = await getUserOrders(currentUserId);
      console.log("📊 Orders fetched:", ordersData.length);
      
      setOrders(ordersData);
      
      if (ordersData.length === 0) {
        console.log("ℹ️ No orders found for this user");
        toast({
          title: "No Orders Found",
          description: "You haven't placed any orders yet. Click 'Place New Order' to get started.",
        });
      } else {
        console.log("✅ Orders loaded successfully");
        toast({
          title: "Orders Loaded",
          description: `Found ${ordersData.length} order(s)`,
        });
      }
      
    } catch (error) {
      console.error("❌ Error in fetchUserOrders:", error);
      setDbStatus('failed');
      
      toast({
        title: "Error Loading Orders",
        description: "There was a problem loading your orders. Please refresh the page or contact support.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("🔄 Dashboard useEffect triggered");
    console.log("👤 Authentication state:", { 
      userData: userData ? 'Available' : 'Not available',
      user: user ? 'Available' : 'Not available',
      userDataUid: userData?.uid,
      userUid: user?.uid
    });
    
    const currentUserId = userData?.uid || user?.uid;
    
    if (currentUserId) {
      console.log("✅ User authenticated, fetching orders");
      fetchUserOrders();
    } else {
      console.log("⏳ Waiting for user authentication...");
      
      // Wait a bit for auth state to settle
      const timeout = setTimeout(() => {
        const userId = userData?.uid || user?.uid;
        if (userId) {
          console.log("✅ User authenticated after timeout, fetching orders");
          fetchUserOrders();
        } else {
          console.log("❌ No user authentication after timeout");
          setLoading(false);
          toast({
            title: "Authentication Required",
            description: "Please log in to view your orders.",
            variant: "destructive",
          });
        }
      }, 2000);
      
      return () => clearTimeout(timeout);
    }
  }, [userData, user]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending_payment":
        return "bg-orange-100 text-orange-700";
      case "received":
        return "bg-blue-100 text-blue-700";
      case "processing":
        return "bg-yellow-100 text-yellow-700";
      case "printed":
        return "bg-purple-100 text-purple-700";
      case "shipped":
        return "bg-green-100 text-green-700";
      case "delivered":
        return "bg-green-200 text-green-800";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending_payment":
        return <CreditCard className="h-4 w-4" />;
      case "received":
        return <Clock className="h-4 w-4" />;
      case "processing":
        return <Package className="h-4 w-4" />;
      case "printed":
        return <CheckCircle className="h-4 w-4" />;
      case "shipped":
        return <Truck className="h-4 w-4" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const handleDownloadInvoice = (order: SimpleOrderData) => {
    if (!order.id || order.paymentStatus !== 'paid') {
      toast({
        title: "Invoice Not Available",
        description: "Invoice can only be downloaded for paid orders.",
        variant: "destructive",
      });
      return;
    }

    console.log("📄 Downloading invoice for order:", order.id);
    
    const invoiceData = {
      invoiceId: order.invoiceId || `INV-${order.trackingId}-${Date.now().toString().slice(-6)}`,
      orderId: order.id,
      orderDate: order.timestamp?.toDate ? order.timestamp.toDate() : new Date(),
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerAddress: order.deliveryAddress,
      products: [{
        name: `${order.productType} Printing (${order.quantity} units)`,
        quantity: order.quantity,
        price: order.totalAmount
      }],
      totalAmount: order.totalAmount,
      gstNumber: order.gstNumber,
      hsnCode: order.hsnCode,
      trackingId: order.trackingId
    };

    downloadInvoice(invoiceData);
    
    toast({
      title: "Invoice Downloaded",
      description: "Your invoice PDF has been downloaded successfully.",
    });
  };

  const handleRetryPayment = async (order: SimpleOrderData) => {
    if (!userData || processingPayment || !order.id) return;
    
    try {
      setProcessingPayment(true);
      
      toast({
        title: "Processing Payment",
        description: "Please wait while we initialize the payment...",
      });
      
      await initializeRazorpay();
      
      const razorpayOrderData = await createRazorpayOrder(
        order.id,
        order.totalAmount,
        order.customerName,
        order.customerEmail
      );
      
      const paymentResult = await processPayment({
        orderId: order.id,
        razorpayOrderId: razorpayOrderData.id,
        amount: order.totalAmount,
        currency: 'INR',
        customerName: order.customerName,
        customerEmail: order.customerEmail,
        description: `Order #${order.trackingId} - ${order.productType} (${order.quantity} qty)`,
        userId: userData.uid,
        productType: order.productType,
        quantity: order.quantity,
        deliveryAddress: order.deliveryAddress
      });
      
      if (paymentResult.status === 'completed' && paymentResult.paymentId) {
        await updateOrderAfterPayment(order.id, paymentResult.paymentId);
        
        toast({
          title: "Payment Successful",
          description: "Your payment has been successfully processed.",
        });
        
        fetchUserOrders();
      } else {
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Payment retry error:", error);
      toast({
        title: "Payment Error",
        description: "An unexpected error occurred. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (gstNumber && !isValidGSTIN(gstNumber)) {
      toast({
        title: "Invalid GST Number",
        description: "Please enter a valid GST number or leave it blank.",
        variant: "destructive",
      });
      return;
    }
    
    setUpdatingProfile(true);
    
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name,
        phone,
        gstNumber
      });
      
      if (updateUserProfile) {
        updateUserProfile({
          ...userData!,
          name,
          phone,
          gstNumber
        });
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Update Failed",
        description: "There was a problem updating your profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setPasswordError("");
    
    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      toast({
        title: "Password Mismatch",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters long.");
      toast({
        title: "Password Too Short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const credential = EmailAuthProvider.credential(
        user.email || "",
        currentPassword
      );
      
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      toast({
        title: "Password Changed",
        description: "Your password has been successfully changed.",
      });
    } catch (error: any) {
      console.error("Error changing password:", error);
      
      let errorMessage = "There was a problem changing your password.";
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Current password is incorrect.";
        setPasswordError("Current password is incorrect.");
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = "Too many attempts. Please try again later.";
        setPasswordError("Too many attempts. Please try again later.");
      } else {
        setPasswordError(error.message || "Unknown error occurred.");
      }
      
      toast({
        title: "Password Change Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  // Filter orders properly
  const getPendingOrders = () => {
    return orders.filter(order => order.paymentStatus === "pending");
  };

  const getMyOrders = () => {
    // My Orders = All paid orders (received, processing, printed, shipped, delivered)
    return orders.filter(order => order.paymentStatus === "paid");
  };

  const getCompletedOrders = () => {
    // Completed Orders = Orders that have been delivered
    return orders.filter(order => order.status === "delivered");
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {userData?.name || user?.displayName || "User"}</p>

      {/* Database Status Indicator */}
      <div className="mb-6">
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
          dbStatus === 'connected' ? 'bg-green-100 text-green-700' : 
          dbStatus === 'failed' ? 'bg-red-100 text-red-700' : 
          'bg-yellow-100 text-yellow-700'
        }`}>
          <div className={`w-2 h-2 rounded-full mr-2 ${
            dbStatus === 'connected' ? 'bg-green-500' : 
            dbStatus === 'failed' ? 'bg-red-500' : 
            'bg-yellow-500 animate-pulse'
          }`}></div>
          Database: {dbStatus === 'connected' ? 'Connected' : dbStatus === 'failed' ? 'Connection Failed' : 'Checking...'}
        </div>
      </div>

      {/* Enhanced Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-6 p-4 bg-gray-100 rounded-lg text-sm">
          <h3 className="font-bold mb-2">Debug Information:</h3>
          <p><strong>User ID (auth):</strong> {user?.uid || 'Not available'}</p>
          <p><strong>User ID (userData):</strong> {userData?.uid || 'Not available'}</p>
          <p><strong>User Email:</strong> {userData?.email || user?.email || 'Not available'}</p>
          <p><strong>User Name:</strong> {userData?.name || user?.displayName || 'Not available'}</p>
          <p><strong>Database Status:</strong> {dbStatus}</p>
          <p><strong>Total Orders:</strong> {orders.length}</p>
          <p><strong>Pending Orders:</strong> {getPendingOrders().length}</p>
          <p><strong>My Orders:</strong> {getMyOrders().length}</p>
          <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
          {orders.length > 0 && (
            <div className="mt-2">
              <p><strong>Sample Order:</strong></p>
              <pre className="text-xs overflow-auto max-h-32 bg-white p-2 rounded">
                {JSON.stringify({
                  id: orders[0].id,
                  userId: orders[0].userId,
                  trackingId: orders[0].trackingId,
                  status: orders[0].status,
                  paymentStatus: orders[0].paymentStatus,
                  totalAmount: orders[0].totalAmount
                }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Orders</CardTitle>
            <CardDescription>All-time orders placed</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ShoppingBag className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">{orders.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Pending Payments</CardTitle>
            <CardDescription>Orders needing payment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">
                {getPendingOrders().length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">My Orders</CardTitle>
            <CardDescription>Successfully paid orders</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">{getMyOrders().length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="text-base">
            <ShoppingBag className="h-4 w-4 mr-2" /> My Orders
          </TabsTrigger>
          <TabsTrigger value="pending" className="text-base">
            <CreditCard className="h-4 w-4 mr-2" /> Pending Payments
          </TabsTrigger>
          <TabsTrigger value="profile" className="text-base">
            <Settings className="h-4 w-4 mr-2" /> Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>My Orders</CardTitle>
                <Link to="/order">
                  <Button>New Order</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
                </div>
              ) : getMyOrders().length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Order ID</th>
                        <th className="text-left py-3 px-4 font-medium">Invoice ID</th>
                        <th className="text-left py-3 px-4 font-medium">Tracking ID</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-left py-3 px-4 font-medium">Quantity</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getMyOrders()
                        .sort((a, b) => {
                          if (!a.timestamp || !b.timestamp) return 0;
                          if (typeof a.timestamp === 'object' && a.timestamp.toMillis) {
                            return b.timestamp.toMillis() - a.timestamp.toMillis();
                          }
                          return 0;
                        })
                        .map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-xs">
                              {order.id?.substring(0, 8) || "N/A"}
                            </td>
                            <td className="py-3 px-4 font-mono text-xs">
                              {order.invoiceId || "N/A"}
                            </td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {order.trackingId}
                            </td>
                            <td className="py-3 px-4">{order.productType}</td>
                            <td className="py-3 px-4">{order.quantity}</td>
                            <td className="py-3 px-4">
                              {order.timestamp ? (
                                typeof order.timestamp === 'object' && order.timestamp.toDate 
                                  ? formatDate(order.timestamp.toDate()) 
                                  : formatDate(order.timestamp)
                              ) : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1 capitalize">
                                  {order.status.replace('_', ' ')}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                            <td className="py-3 px-4">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleDownloadInvoice(order)}
                                className="text-xs"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You haven't completed any orders yet.</p>
                  <Link to="/order">
                    <Button>Place Your First Order</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Pending Payments</CardTitle>
                <Link to="/order">
                  <Button>New Order</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
                </div>
              ) : getPendingOrders().length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Order ID</th>
                        <th className="text-left py-3 px-4 font-medium">Tracking ID</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-left py-3 px-4 font-medium">Quantity</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getPendingOrders()
                        .sort((a, b) => {
                          if (!a.timestamp || !b.timestamp) return 0;
                          if (typeof a.timestamp === 'object' && a.timestamp.toMillis) {
                            return b.timestamp.toMillis() - a.timestamp.toMillis();
                          }
                          return 0;
                        })
                        .map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-xs">
                              {order.id?.substring(0, 8) || "N/A"}
                            </td>
                            <td className="py-3 px-4 font-mono text-sm">
                              {order.trackingId}
                            </td>
                            <td className="py-3 px-4">{order.productType}</td>
                            <td className="py-3 px-4">{order.quantity}</td>
                            <td className="py-3 px-4">
                              {order.timestamp ? (
                                typeof order.timestamp === 'object' && order.timestamp.toDate 
                                  ? formatDate(order.timestamp.toDate()) 
                                  : formatDate(order.timestamp)
                              ) : "N/A"}
                            </td>
                            <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                            <td className="py-3 px-4">
                              <Button 
                                size="sm" 
                                variant="default" 
                                onClick={() => handleRetryPayment(order)}
                                disabled={processingPayment}
                                className="text-xs"
                              >
                                {processingPayment ? (
                                  <>
                                    <div className="mr-2 h-3 w-3 animate-spin rounded-full border-t-2 border-white"></div>
                                    Processing...
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Complete Payment
                                  </>
                                )}
                              </Button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You don't have any pending payments.</p>
                  <Link to="/order">
                    <Button>Place New Order</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="profile">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Update Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <form onSubmit={handleUpdateProfile}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      value={userData?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Your phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gstNumber">GST Number</Label>
                    <Input
                      id="gstNumber"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(e.target.value)}
                      placeholder="e.g., 06ABCDE1234F1Z5"
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={updatingProfile}>
                    {updatingProfile ? (
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white"></div>
                        <span>Updating...</span>
                      </div>
                    ) : (
                      "Update Profile"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <form onSubmit={handleChangePassword}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  
                  {passwordError && (
                    <div className="mt-2 flex items-center text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      <span>{passwordError}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button type="submit" disabled={changingPassword}>
                    {changingPassword ? (
                      <div className="flex items-center">
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white"></div>
                        <span>Changing Password...</span>
                      </div>
                    ) : (
                      "Change Password"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
            
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Account Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  <Link to="/order">
                    <Button>Place New Order</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
