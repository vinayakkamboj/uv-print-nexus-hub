import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, doc, updateDoc, orderBy } from "firebase/firestore";
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDate, formatCurrency, isValidGSTIN } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { ShoppingBag, FileText, Settings, Clock, Package, CheckCircle, Truck, CreditCard, Download, AlertCircle } from "lucide-react";
import { getUserOrders } from "@/lib/invoice-service";

interface Order {
  id: string;
  productType: string;
  quantity: number;
  status: "pending_payment" | "received" | "processing" | "printed" | "shipped";
  timestamp: any;
  totalAmount: number;
  paymentDetails?: {
    id: string;
    paymentId?: string;
    method?: string;
    status: string;
    timestamp: any;
  };
  // Add the missing properties
  paymentStatus?: string;
  trackingId?: string;
}

interface Invoice {
  id: string;
  invoiceId?: string;
  orderId: string;
  createdAt: any;
  totalAmount: number;
  pdfUrl: string;
  paymentId?: string;
  paymentMethod?: string;
  userId?: string;
}

interface OrderData {
  id: string;
  productType: string;
  quantity: number;
  status: string;
  timestamp: any;
  totalAmount: number;
  paymentDetails?: {
    id: string;
    paymentId?: string;
    method?: string;
    status: string;
    timestamp: any;
  };
}

export default function Dashboard() {
  const { userData, user, updateUserProfile } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userData?.uid) return;

      try {
        setLoading(true);
        
        const ordersData = await getUserOrders(userData.uid);
        console.log("Fetched orders:", ordersData);
        
        const typedOrders = ordersData.map(order => ({
          ...order,
          status: (order.status || "pending_payment") as "pending_payment" | "received" | "processing" | "printed" | "shipped",
          timestamp: order.timestamp || new Date()
        }));
        
        setOrders(typedOrders);

        const invoicesQuery = query(
          collection(db, "invoices"),
          where("userId", "==", userData.uid)
        );
        const invoicesSnapshot = await getDocs(invoicesQuery);
        const invoicesData = invoicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Invoice[];
        setInvoices(invoicesData);
        
        console.log(`Loaded ${ordersData.length} orders and ${invoicesData.length} invoices`);
      } catch (error) {
        console.error("Error fetching user data:", error);
        toast({
          title: "Error",
          description: "Failed to load your data. Please refresh the page.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userData, toast]);

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
      default:
        return null;
    }
  };

  const findInvoiceForOrder = (orderId: string) => {
    return invoices.find(invoice => invoice.orderId === orderId);
  };

  const handleRetryPayment = (order: Order) => {
    toast({
      title: "Payment Retry",
      description: "Payment retry functionality will be implemented soon.",
    });
    
    // In a real implementation, you would redirect to a payment page
    // or open a payment modal for this specific order
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

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {userData?.name || "User"}</p>

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
            <CardTitle className="text-lg font-medium">Pending Orders</CardTitle>
            <CardDescription>Orders in progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">
                {orders.filter(order => order.status !== "shipped").length}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Invoices</CardTitle>
            <CardDescription>Total invoices generated</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-primary mr-3" />
              <span className="text-3xl font-bold">{invoices.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="orders">
        <TabsList className="mb-6">
          <TabsTrigger value="orders" className="text-base">
            <ShoppingBag className="h-4 w-4 mr-2" /> Orders
          </TabsTrigger>
          <TabsTrigger value="invoices" className="text-base">
            <FileText className="h-4 w-4 mr-2" /> Invoices
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
              ) : orders.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Order ID</th>
                        <th className="text-left py-3 px-4 font-medium">Product</th>
                        <th className="text-left py-3 px-4 font-medium">Quantity</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Status</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Invoice</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .sort((a, b) => {
                          if (!a.timestamp || !b.timestamp) return 0;
                          if (typeof a.timestamp === 'object' && a.timestamp.toMillis) {
                            return b.timestamp.toMillis() - a.timestamp.toMillis();
                          }
                          const aTime = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
                          const bTime = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
                          return bTime - aTime;
                        })
                        .map((order) => {
                          const orderInvoice = findInvoiceForOrder(order.id);
                          const paymentFailed = order.paymentStatus === "failed";
                          
                          return (
                            <tr key={order.id} className="border-b hover:bg-gray-50">
                              <td className="py-3 px-4 font-mono text-sm">
                                {order.id.length > 10 ? order.id.substring(0, 10) + '...' : order.id}
                                {order.trackingId && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {order.trackingId}
                                  </div>
                                )}
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
                                    {order.status === "pending_payment" ? "Payment Pending" : order.status}
                                  </span>
                                </div>
                                {paymentFailed && (
                                  <div className="mt-1 text-xs text-red-600">
                                    Payment failed
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                              <td className="py-3 px-4">
                                {orderInvoice ? (
                                  <a
                                    href={orderInvoice.pdfUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary hover:underline font-medium inline-flex items-center"
                                  >
                                    <Download className="h-3.5 w-3.5 mr-1" />
                                    <span>View</span>
                                  </a>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="py-3 px-4">
                                {(order.status === "pending_payment" || paymentFailed) && (
                                  <Button 
                                    size="sm" 
                                    variant="outline" 
                                    onClick={() => handleRetryPayment(order)}
                                    className="text-xs"
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    Retry Payment
                                  </Button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">You haven't placed any orders yet.</p>
                  <Link to="/order">
                    <Button>Place Your First Order</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>Invoice History</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
                </div>
              ) : invoices.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium">Invoice ID</th>
                        <th className="text-left py-3 px-4 font-medium">Order ID</th>
                        <th className="text-left py-3 px-4 font-medium">Date</th>
                        <th className="text-left py-3 px-4 font-medium">Amount</th>
                        <th className="text-left py-3 px-4 font-medium">Payment Method</th>
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices
                        .sort((a, b) => {
                          if (!a.createdAt || !b.createdAt) return 0;
                          if (typeof a.createdAt === 'object' && a.createdAt.toMillis) {
                            return b.createdAt.toMillis() - a.createdAt.toMillis();
                          }
                          return 0;
                        })
                        .map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{invoice.invoiceId || invoice.id}</td>
                            <td className="py-3 px-4 font-mono text-sm">{invoice.orderId}</td>
                            <td className="py-3 px-4">
                              {invoice.createdAt && typeof invoice.createdAt === 'object' && invoice.createdAt.toDate 
                                ? formatDate(invoice.createdAt.toDate()) 
                                : "N/A"}
                            </td>
                            <td className="py-3 px-4">{formatCurrency(invoice.totalAmount)}</td>
                            <td className="py-3 px-4">{invoice.paymentMethod || "Online"}</td>
                            <td className="py-3 px-4">
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium inline-flex items-center"
                              >
                                <Download className="h-3.5 w-3.5 mr-1" />
                                <span>Download PDF</span>
                              </a>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No invoices available yet.</p>
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
