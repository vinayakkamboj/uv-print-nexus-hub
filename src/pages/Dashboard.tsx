
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getUserOrders, SimpleOrderData } from "@/lib/invoice-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Package, Download, Eye, Clock, CheckCircle, Truck, MapPin, CreditCard, FileText } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const Dashboard = () => {
  const { user, userData } = useAuth();
  const [orders, setOrders] = useState<SimpleOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user?.uid) {
        setLoading(false);
        return;
      }

      try {
        console.log("🔄 Fetching orders for user:", user.uid);
        const userOrders = await getUserOrders(user.uid);
        console.log("📊 Orders fetched:", userOrders);
        setOrders(userOrders);
      } catch (error) {
        console.error("❌ Error fetching orders:", error);
        toast({
          title: "Error",
          description: "Failed to load your orders",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [user, toast]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending_payment: { color: "bg-orange-100 text-orange-800", icon: Clock },
      received: { color: "bg-blue-100 text-blue-800", icon: Package },
      processing: { color: "bg-purple-100 text-purple-800", icon: Package },
      printed: { color: "bg-indigo-100 text-indigo-800", icon: FileText },
      shipped: { color: "bg-cyan-100 text-cyan-800", icon: Truck },
      delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending_payment;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800" },
      paid: { color: "bg-green-100 text-green-800" },
      failed: { color: "bg-red-100 text-red-800" }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <Badge className={config.color}>
        <CreditCard className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  const getExecutionStatusBadge = (executionStatus: string) => {
    const statusConfig = {
      order_created: { color: "bg-blue-100 text-blue-800", label: "Order Created" },
      processing: { color: "bg-purple-100 text-purple-800", label: "Processing" },
      quality_check: { color: "bg-indigo-100 text-indigo-800", label: "Quality Check" },
      shipped: { color: "bg-cyan-100 text-cyan-800", label: "Shipped" },
      delivered: { color: "bg-green-100 text-green-800", label: "Delivered" }
    };

    const config = statusConfig[executionStatus as keyof typeof statusConfig] || statusConfig.order_created;

    return (
      <Badge className={config.color}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Your Orders</h1>
        <p className="text-gray-600 mt-2">Track and manage all your printing orders</p>
      </div>

      {/* Order Journey Flowchart */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Journey
          </CardTitle>
          <CardDescription>Track your order through our printing process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-8 left-0 right-0 h-0.5 bg-gray-200 -z-10"></div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-3">
                <Package className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-sm font-medium text-center">Order<br />Received</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
              <p className="text-sm font-medium text-center">Design &<br />Processing</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-indigo-600" />
              </div>
              <p className="text-sm font-medium text-center">Quality<br />Check</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-cyan-100 flex items-center justify-center mb-3">
                <Truck className="h-6 w-6 text-cyan-600" />
              </div>
              <p className="text-sm font-medium text-center">Shipped</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6 text-green-600" />
              </div>
              <p className="text-sm font-medium text-center">Delivered</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      {orders.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Orders Yet</h3>
            <p className="text-gray-500 mb-6">You haven't placed any orders yet. Start by creating your first order.</p>
            <Button asChild>
              <a href="/order">Place Your First Order</a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <Card key={order.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{order.productType}</h3>
                        <p className="text-sm text-gray-500">Order ID: {order.trackingId}</p>
                        <p className="text-sm text-gray-500">Quantity: {order.quantity}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">₹{order.totalAmount?.toLocaleString()}</p>
                        <p className="text-sm text-gray-500">
                          {order.timestamp ? new Date(order.timestamp.seconds ? order.timestamp.seconds * 1000 : order.timestamp).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3">
                      {getStatusBadge(order.status)}
                      {getPaymentStatusBadge(order.paymentStatus)}
                      {order.paymentStatus === 'paid' && order.status !== 'pending_payment' && (
                        getExecutionStatusBadge(order.executionStatus || 'order_created')
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                          <DialogDescription>Complete information for your order</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium">Product Type</p>
                              <p className="text-gray-600">{order.productType}</p>
                            </div>
                            <div>
                              <p className="font-medium">Quantity</p>
                              <p className="text-gray-600">{order.quantity}</p>
                            </div>
                            <div>
                              <p className="font-medium">Total Amount</p>
                              <p className="text-gray-600">₹{order.totalAmount?.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="font-medium">Tracking ID</p>
                              <p className="text-gray-600 font-mono">{order.trackingId}</p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <p className="font-medium mb-2">Status Information</p>
                            <div className="flex flex-wrap gap-2">
                              {getStatusBadge(order.status)}
                              {getPaymentStatusBadge(order.paymentStatus)}
                              {order.paymentStatus === 'paid' && order.status !== 'pending_payment' && (
                                getExecutionStatusBadge(order.executionStatus || 'order_created')
                              )}
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <p className="font-medium">Delivery Address</p>
                            <p className="text-gray-600">{order.deliveryAddress}</p>
                          </div>
                          
                          {order.specifications && (
                            <div>
                              <p className="font-medium">Specifications</p>
                              <p className="text-gray-600">{order.specifications}</p>
                            </div>
                          )}
                          
                          <div>
                            <p className="font-medium">File</p>
                            <p className="text-gray-600">{order.fileName}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                    
                    {order.invoiceId && (
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
