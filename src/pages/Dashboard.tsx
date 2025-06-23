
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
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { formatDate, formatCurrency, isValidGSTIN } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, FileText, Settings, Clock, Package, CheckCircle, Truck, CreditCard, Download, AlertCircle, Play, ChevronDown, ChevronUp, Eye, MapPin, Phone, Mail, Calendar, Hash } from "lucide-react";
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
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
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
      console.log("❌ No user ID available");
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log("🔄 Fetching orders for user:", currentUserId);
      
      setDbStatus('checking');
      const dbConnected = await testDatabaseConnection();
      
      if (!dbConnected) {
        setDbStatus('failed');
        toast({
          title: "Database Connection Failed",
          description: "Please refresh the page and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setDbStatus('connected');
      
      const ordersData = await getUserOrders(currentUserId);
      setOrders(ordersData);
      
      if (ordersData.length === 0) {
        toast({
          title: "No Orders Found",
          description: "You haven't placed any orders yet.",
        });
      } else {
        toast({
          title: "Orders Loaded",
          description: `Found ${ordersData.length} order(s)`,
        });
      }
      
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      setDbStatus('failed');
      
      toast({
        title: "Error Loading Orders",
        description: "Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const currentUserId = userData?.uid || user?.uid;
    
    if (currentUserId) {
      fetchUserOrders();
    } else {
      const timeout = setTimeout(() => {
        const userId = userData?.uid || user?.uid;
        if (userId) {
          fetchUserOrders();
        } else {
          setLoading(false);
          toast({
            title: "Authentication Required",
            description: "Please log in to view your orders.",
            variant: "destructive",
          });
        }
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [userData, user]);

  const getExecutionStatusLabel = (status: string) => {
    switch (status) {
      case 'order_created':
        return 'Order Created';
      case 'processing':
        return 'Processing';
      case 'quality_check':
        return 'Quality Check';
      case 'shipped':
        return 'Shipped';
      case 'delivered':
        return 'Delivered';
      default:
        return 'Order Created';
    }
  };

  const getExecutionStatusColor = (status: string) => {
    switch (status) {
      case 'order_created':
        return 'bg-blue-100 text-blue-700';
      case 'processing':
        return 'bg-yellow-100 text-yellow-700';
      case 'quality_check':
        return 'bg-purple-100 text-purple-700';
      case 'shipped':
        return 'bg-indigo-100 text-indigo-700';
      case 'delivered':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'refunded':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getProgressSteps = (currentStatus: string) => {
    const steps = [
      { key: 'order_created', label: 'Order Created', icon: CheckCircle, description: 'Payment Confirmed' },
      { key: 'processing', label: 'Processing', icon: Package, description: 'Design & Print' },
      { key: 'quality_check', label: 'Quality Check', icon: FileText, description: 'Review & Pack' },
      { key: 'shipped', label: 'Shipped', icon: Truck, description: 'On the way' },
      { key: 'delivered', label: 'Delivered', icon: CheckCircle, description: 'Complete' }
    ];
    
    const currentIndex = steps.findIndex(step => step.key === currentStatus);
    return steps.map((step, index) => ({
      ...step,
      isActive: index <= currentIndex,
      isCompleted: index < currentIndex,
      isCurrent: index === currentIndex
    }));
  };

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
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

  const getPendingOrders = () => {
    return orders.filter(order => order.paymentStatus === "pending");
  };

  const getExecutedOrders = () => {
    return orders.filter(order => order.paymentStatus === "paid");
  };

  const getCompletedOrders = () => {
    return orders.filter(order => order.executionStatus === "delivered");
  };

  const OrderFlowChart = ({ currentStatus }: { currentStatus: string }) => {
    const steps = getProgressSteps(currentStatus);
    
    return (
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 md:p-6 border">
        <h4 className="text-sm md:text-base font-semibold mb-4 text-center text-gray-800">Order Journey</h4>
        
        {/* Desktop/Tablet Horizontal Layout */}
        <div className="hidden sm:flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center text-center">
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-2 border-2 transition-all duration-300 ${
                    step.isCompleted || step.isCurrent 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}>
                    <Icon className="h-3 w-3 md:h-4 md:w-4" />
                  </div>
                  <span className={`text-xs md:text-sm font-medium ${
                    step.isCompleted || step.isCurrent ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">{step.description}</span>
                </div>
                
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 md:mx-4 rounded transition-all duration-300 ${
                    step.isCompleted ? 'bg-green-500' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Vertical Layout */}
        <div className="flex sm:hidden flex-col space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  step.isCompleted || step.isCurrent 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                
                <div className="ml-4 flex-1">
                  <div className={`font-medium text-sm ${
                    step.isCompleted || step.isCurrent ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-gray-400">{step.description}</div>
                </div>
                
                {step.isCurrent && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs">Current</Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
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
            <CardTitle className="text-lg font-medium">Executed Orders</CardTitle>
            <CardDescription>Orders in execution phase</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Play className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">{getExecutedOrders().length}</span>
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
              {/* Company Order Delivery Process */}
              <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <h3 className="text-lg font-semibold mb-6 text-center text-blue-900">How We Deliver Your Orders</h3>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-2">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm mb-2">Order Received</h4>
                    <p className="text-xs text-gray-600">We confirm your payment and order details</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Package className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm mb-2">Processing</h4>
                    <p className="text-xs text-gray-600">Our team designs and prints your order</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm mb-2">Quality Check</h4>
                    <p className="text-xs text-gray-600">We ensure everything meets our standards</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Truck className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm mb-2">Shipped</h4>
                    <p className="text-xs text-gray-600">Your order is on its way to you</p>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <h4 className="font-semibold text-sm mb-2">Delivered</h4>
                    <p className="text-xs text-gray-600">Order successfully delivered to you</p>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
                </div>
              ) : orders.length > 0 ? (
                <div className="space-y-4">
                  {orders.map((order) => (
                    <Card key={order.id} className="border-l-4 border-l-blue-500">
                      <Collapsible
                        open={expandedOrders.has(order.id!)}
                        onOpenChange={() => toggleOrderExpansion(order.id!)}
                      >
                        <CollapsibleTrigger asChild>
                          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                  <h3 className="font-semibold text-lg">Order #{order.trackingId}</h3>
                                  <div className="flex gap-2">
                                    <Badge className={getPaymentStatusColor(order.paymentStatus || 'pending')}>
                                      {order.paymentStatus || 'pending'}
                                    </Badge>
                                    {order.paymentStatus === 'paid' && (
                                      <Badge className={getExecutionStatusColor(order.executionStatus || 'order_created')}>
                                        {getExecutionStatusLabel(order.executionStatus || 'order_created')}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Product:</span>
                                    <p className="font-medium">{order.productType}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Quantity:</span>
                                    <p className="font-medium">{order.quantity}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Amount:</span>
                                    <p className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date:</span>
                                    <p className="font-medium">
                                      {order.timestamp ? formatDate(order.timestamp.toDate ? order.timestamp.toDate() : order.timestamp) : "N/A"}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 ml-4">
                                {order.paymentStatus === 'paid' && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadInvoice(order);
                                    }}
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    Invoice
                                  </Button>
                                )}
                                
                                {order.paymentStatus === 'pending' && (
                                  <Button 
                                    size="sm" 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRetryPayment(order);
                                    }}
                                    disabled={processingPayment}
                                  >
                                    {processingPayment ? (
                                      <>
                                        <div className="mr-2 h-3 w-3 animate-spin rounded-full border-t-2 border-white"></div>
                                        Processing...
                                      </>
                                    ) : (
                                      <>
                                        <CreditCard className="h-3 w-3 mr-1" />
                                        Pay Now
                                      </>
                                    )}
                                  </Button>
                                )}
                                
                                {expandedOrders.has(order.id!) ? (
                                  <ChevronUp className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                            </div>
                          </CardHeader>
                        </CollapsibleTrigger>
                        
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="border-t pt-6">
                              {/* Order Flow Chart */}
                              {order.paymentStatus === 'paid' && (
                                <div className="mb-6">
                                  <OrderFlowChart currentStatus={order.executionStatus || 'order_created'} />
                                </div>
                              )}
                              
                              {/* Detailed Order Information */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900 flex items-center">
                                    <Hash className="h-4 w-4 mr-2" />
                                    Order Information
                                  </h4>
                                  
                                  <div className="space-y-3 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Order ID:</span>
                                      <span className="font-mono">{order.id?.substring(0, 12)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">Tracking ID:</span>
                                      <span className="font-mono font-medium">{order.trackingId}</span>
                                    </div>
                                    {order.invoiceId && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">Invoice ID:</span>
                                        <span className="font-mono">{order.invoiceId}</span>
                                      </div>
                                    )}
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">HSN Code:</span>
                                      <span className="font-medium">{order.hsnCode}</span>
                                    </div>
                                    {order.gstNumber && (
                                      <div className="flex justify-between">
                                        <span className="text-gray-500">GST Number:</span>
                                        <span className="font-mono">{order.gstNumber}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <h4 className="font-semibold text-gray-900 flex items-center">
                                    <MapPin className="h-4 w-4 mr-2" />
                                    Delivery Details
                                  </h4>
                                  
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <span className="text-gray-500 block">Customer:</span>
                                      <span className="font-medium">{order.customerName}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block">Email:</span>
                                      <span className="font-medium">{order.customerEmail}</span>
                                    </div>
                                    <div>
                                      <span className="text-gray-500 block">Address:</span>
                                      <span className="font-medium">{order.deliveryAddress}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {order.specifications && (
                                <div className="mt-6">
                                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Specifications
                                  </h4>
                                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                                    {order.specifications}
                                  </p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders yet</h3>
                  <p className="text-gray-500 mb-6">You haven't placed any orders yet. Start by creating your first order!</p>
                  <Link to="/order">
                    <Button size="lg">Place Your First Order</Button>
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
                <div className="space-y-4">
                  {getPendingOrders().map((order) => (
                    <Card key={order.id} className="border border-yellow-200 bg-yellow-50">
                      <CardContent className="p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold">Order #{order.trackingId}</h3>
                              <Badge className="bg-yellow-100 text-yellow-800">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Payment Pending
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Product:</span>
                                <p className="font-medium">{order.productType}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Quantity:</span>
                                <p className="font-medium">{order.quantity}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Amount:</span>
                                <p className="font-semibold text-lg">{formatCurrency(order.totalAmount)}</p>
                              </div>
                              <div>
                                <span className="text-gray-500">Date:</span>
                                <p className="font-medium">
                                  {order.timestamp ? formatDate(order.timestamp.toDate ? order.timestamp.toDate() : order.timestamp) : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>
                          
                          <Button 
                            onClick={() => handleRetryPayment(order)}
                            disabled={processingPayment}
                            size="lg"
                          >
                            {processingPayment ? (
                              <>
                                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white"></div>
                                Processing...
                              </>
                            ) : (
                              <>
                                <CreditCard className="h-4 w-4 mr-2" />
                                Complete Payment
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="h-16 w-16 text-green-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All payments complete!</h3>
                  <p className="text-gray-500 mb-6">You don't have any pending payments.</p>
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
