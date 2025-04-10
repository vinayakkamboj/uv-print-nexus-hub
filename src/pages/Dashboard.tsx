
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { ShoppingBag, FileText, Settings, Clock, Package, CheckCircle, Truck } from "lucide-react";

// Define order and invoice types
interface Order {
  id: string;
  productType: string;
  quantity: number;
  status: "received" | "processing" | "printed" | "shipped";
  timestamp: any;
  totalAmount: number;
}

interface Invoice {
  id: string;
  orderId: string;
  createdAt: any;
  totalAmount: number;
  pdfUrl: string;
}

export default function Dashboard() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userData?.uid) return;

      try {
        // Fetch orders
        const ordersQuery = query(
          collection(db, "orders"),
          where("userId", "==", userData.uid)
        );
        const ordersSnapshot = await getDocs(ordersQuery);
        const ordersData = ordersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);

        // Fetch invoices
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
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userData]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
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

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
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

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <p className="text-gray-600 mb-8">Welcome back, {userData?.name}</p>

      {/* Quick Stats */}
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

      {/* Main Dashboard Content */}
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
                <CardTitle>Recent Orders</CardTitle>
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
                      </tr>
                    </thead>
                    <tbody>
                      {orders
                        .sort((a, b) => b.timestamp?.toMillis() - a.timestamp?.toMillis())
                        .map((order) => (
                          <tr key={order.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{order.id}</td>
                            <td className="py-3 px-4">{order.productType}</td>
                            <td className="py-3 px-4">{order.quantity}</td>
                            <td className="py-3 px-4">
                              {order.timestamp ? formatDate(order.timestamp.toDate()) : "N/A"}
                            </td>
                            <td className="py-3 px-4">
                              <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                <span className="ml-1 capitalize">{order.status}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4">{formatCurrency(order.totalAmount)}</td>
                          </tr>
                        ))}
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
                        <th className="text-left py-3 px-4 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices
                        .sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis())
                        .map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-mono text-sm">{invoice.id}</td>
                            <td className="py-3 px-4 font-mono text-sm">{invoice.orderId}</td>
                            <td className="py-3 px-4">
                              {invoice.createdAt ? formatDate(invoice.createdAt.toDate()) : "N/A"}
                            </td>
                            <td className="py-3 px-4">{formatCurrency(invoice.totalAmount)}</td>
                            <td className="py-3 px-4">
                              <a
                                href={invoice.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                Download PDF
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
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Full Name</h3>
                    <p className="text-base">{userData?.name || "Not provided"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Email Address</h3>
                    <p className="text-base">{userData?.email || "Not provided"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">Phone Number</h3>
                    <p className="text-base">{userData?.phone || "Not provided"}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-1">GST Number</h3>
                    <p className="text-base">{userData?.gstNumber || "Not provided"}</p>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t">
                  <h3 className="text-lg font-medium mb-4">Account Actions</h3>
                  <div className="flex flex-wrap gap-4">
                    <Button variant="outline">Update Profile</Button>
                    <Button variant="outline">Change Password</Button>
                    <Link to="/order">
                      <Button>Place New Order</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
