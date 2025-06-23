
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Package, Eye, CheckCircle, AlertCircle, XCircle, Truck } from "lucide-react";
import { SimpleOrderData } from "@/lib/invoice-service";
import { fetchRecentOrders, updateOrderStatus } from "@/lib/admin-service";

interface RecentOrdersManagementProps {
  onStatsUpdate: () => void;
}

const RecentOrdersManagement = ({ onStatsUpdate }: RecentOrdersManagementProps) => {
  const [orders, setOrders] = useState<SimpleOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SimpleOrderData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const recentOrders = await fetchRecentOrders(20);
      setOrders(recentOrders);
    } catch (error) {
      console.error("Error fetching recent orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch recent orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (orderId: string, newStatus: string, paymentStatus?: string) => {
    try {
      const result = await updateOrderStatus(orderId, newStatus as SimpleOrderData['status'], paymentStatus as SimpleOrderData['paymentStatus']);
      
      if (result.success) {
        // Update local state
        setOrders(prevOrders =>
          prevOrders.map(order =>
            order.id === orderId
              ? { 
                  ...order, 
                  status: newStatus as SimpleOrderData['status'], 
                  paymentStatus: paymentStatus ? paymentStatus as SimpleOrderData['paymentStatus'] : order.paymentStatus,
                  lastUpdated: new Date()
                }
              : order
          )
        );

        // Update selected order if it's the one being updated
        if (selectedOrder?.id === orderId) {
          setSelectedOrder(prev => prev ? {
            ...prev,
            status: newStatus as SimpleOrderData['status'],
            paymentStatus: paymentStatus ? paymentStatus as SimpleOrderData['paymentStatus'] : prev.paymentStatus,
            lastUpdated: new Date()
          } : null);
        }

        toast({
          title: "Success",
          description: "Order status updated successfully"
        });

        // Update dashboard stats
        onStatsUpdate();
      } else {
        throw new Error(result.message || "Failed to update order");
      }
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      pending_payment: { color: "bg-orange-100 text-orange-800", icon: AlertCircle },
      received: { color: "bg-blue-100 text-blue-800", icon: Package },
      processing: { color: "bg-purple-100 text-purple-800", icon: Package },
      shipped: { color: "bg-indigo-100 text-indigo-800", icon: Truck },
      delivered: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      cancelled: { color: "bg-red-100 text-red-800", icon: XCircle },
      failed: { color: "bg-red-100 text-red-800", icon: XCircle }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Recent Orders
        </CardTitle>
        <CardDescription>
          Latest 20 orders with quick status management
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[100px]">Order ID</TableHead>
                <TableHead className="min-w-[150px]">Customer</TableHead>
                <TableHead className="min-w-[120px]">Product</TableHead>
                <TableHead className="min-w-[100px]">Amount</TableHead>
                <TableHead className="min-w-[100px]">Status</TableHead>
                <TableHead className="min-w-[100px]">Payment</TableHead>
                <TableHead className="min-w-[100px]">Date</TableHead>
                <TableHead className="min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.trackingId || order.id?.substring(0, 8) + '...'}
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{order.customerName}</p>
                      <p className="text-sm text-gray-500 truncate">{order.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.productType}</p>
                      <p className="text-sm text-gray-500">Qty: {order.quantity}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{order.totalAmount?.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.status || 'pending')}
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.paymentStatus === 'paid' ? 'default' : 'secondary'}>
                      {order.paymentStatus || 'pending'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {order.timestamp ? new Date(order.timestamp.seconds ? order.timestamp.seconds * 1000 : order.timestamp).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Order Details</DialogTitle>
                          <DialogDescription>
                            Complete information for order {selectedOrder?.trackingId || selectedOrder?.id}
                          </DialogDescription>
                        </DialogHeader>
                        {selectedOrder && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-gray-700">Customer Name</label>
                                <p className="font-medium">{selectedOrder.customerName}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Email</label>
                                <p className="font-medium break-all">{selectedOrder.customerEmail}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Product Type</label>
                                <p className="font-medium">{selectedOrder.productType}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Quantity</label>
                                <p className="font-medium">{selectedOrder.quantity}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Total Amount</label>
                                <p className="font-medium">₹{selectedOrder.totalAmount?.toLocaleString()}</p>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-gray-700">Tracking ID</label>
                                <p className="font-mono text-sm">{selectedOrder.trackingId}</p>
                              </div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-700">Delivery Address</label>
                              <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                            </div>
                            {selectedOrder.specifications && (
                              <div>
                                <label className="text-sm font-medium text-gray-700">Specifications</label>
                                <p className="font-medium">{selectedOrder.specifications}</p>
                              </div>
                            )}
                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                              <div className="flex-1">
                                <label className="text-sm font-medium text-gray-700">Order Status</label>
                                <Select
                                  value={selectedOrder.status}
                                  onValueChange={(value) => handleStatusUpdate(selectedOrder.id!, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="received">Received</SelectItem>
                                    <SelectItem value="processing">Processing</SelectItem>
                                    <SelectItem value="shipped">Shipped</SelectItem>
                                    <SelectItem value="delivered">Delivered</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1">
                                <label className="text-sm font-medium text-gray-700">Payment Status</label>
                                <Select
                                  value={selectedOrder.paymentStatus}
                                  onValueChange={(value) => handleStatusUpdate(selectedOrder.id!, selectedOrder.status || 'pending', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Payment Pending</SelectItem>
                                    <SelectItem value="paid">Paid</SelectItem>
                                    <SelectItem value="failed">Payment Failed</SelectItem>
                                    <SelectItem value="refunded">Refunded</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {orders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No recent orders found.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentOrdersManagement;
