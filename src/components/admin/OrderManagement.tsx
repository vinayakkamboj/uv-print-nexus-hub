import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Edit, Eye, Package, Truck, CheckCircle, AlertCircle, XCircle, Download } from "lucide-react";
import { collection, getDocs, doc, deleteDoc, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { SimpleOrderData } from "@/lib/invoice-service";
import { updateOrderStatus as updateOrderStatusService } from "@/lib/admin-service";

const OrderManagement = () => {
  const [orders, setOrders] = useState<SimpleOrderData[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<SimpleOrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<SimpleOrderData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    filterOrders();
  }, [orders, searchTerm, statusFilter]);

  const fetchOrders = async () => {
    try {
      console.log("🔄 [ORDER-MANAGEMENT] Fetching orders...");
      const ordersSnapshot = await getDocs(
        query(collection(db, "orders"), orderBy("timestamp", "desc"))
      );
      const ordersData = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SimpleOrderData[];
      
      console.log("✅ [ORDER-MANAGEMENT] Orders fetched:", ordersData.length);
      setOrders(ordersData);
    } catch (error) {
      console.error("❌ [ORDER-MANAGEMENT] Error fetching orders:", error);
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterOrders = () => {
    let filtered = orders;

    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.trackingId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, paymentStatus?: string) => {
    try {
      console.log("🔄 [ORDER-MANAGEMENT] Updating order status:", { orderId, newStatus, paymentStatus });
      
      // Use the centralized admin service
      const result = await updateOrderStatusService(
        orderId, 
        newStatus as SimpleOrderData['status'], 
        paymentStatus as SimpleOrderData['paymentStatus']
      );
      
      if (!result.success) {
        throw new Error(result.message || "Failed to update order status");
      }
      
      console.log("✅ [ORDER-MANAGEMENT] Order updated successfully via service");
      
      // Update local state immediately for UI responsiveness
      const updateData: any = {
        status: newStatus,
        lastUpdated: new Date()
      };
      
      if (paymentStatus) {
        updateData.paymentStatus = paymentStatus;
      }

      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, ...updateData }
            : order
        )
      );

      // Update selected order if it's currently being viewed
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => prev ? { ...prev, ...updateData } : null);
      }

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}${paymentStatus ? ` and payment status to ${paymentStatus}` : ''}`,
      });
      
      // Refresh orders from database to ensure consistency
      setTimeout(() => {
        console.log("🔄 [ORDER-MANAGEMENT] Refreshing orders from database...");
        fetchOrders();
      }, 1000);
      
    } catch (error) {
      console.error("❌ [ORDER-MANAGEMENT] Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm("Are you sure you want to delete this order?")) return;

    try {
      await deleteDoc(doc(db, "orders", orderId));
      setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
      
      toast({
        title: "Success",
        description: "Order deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Error",
        description: "Failed to delete order",
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
          Order Management
        </CardTitle>
        <CardDescription>
          Manage all customer orders, track status, and handle payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search Orders</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by name, email, tracking ID, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="status">Filter by Status</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pending_payment">Pending Payment</SelectItem>
                <SelectItem value="received">Received</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">
                    {order.id?.substring(0, 8)}...
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customerName}</p>
                      <p className="text-sm text-gray-500">{order.customerEmail}</p>
                      {order.trackingId && (
                        <p className="text-xs text-blue-600 font-mono">{order.trackingId}</p>
                      )}
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
                  <TableCell>
                    {order.timestamp ? new Date(order.timestamp.seconds ? order.timestamp.seconds * 1000 : order.timestamp).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Order Details</DialogTitle>
                            <DialogDescription>
                              Complete information for order {order.id}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedOrder && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Customer Name</Label>
                                  <p className="font-medium">{selectedOrder.customerName}</p>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p className="font-medium">{selectedOrder.customerEmail}</p>
                                </div>
                                <div>
                                  <Label>Product Type</Label>
                                  <p className="font-medium">{selectedOrder.productType}</p>
                                </div>
                                <div>
                                  <Label>Quantity</Label>
                                  <p className="font-medium">{selectedOrder.quantity}</p>
                                </div>
                                <div>
                                  <Label>Total Amount</Label>
                                  <p className="font-medium">₹{selectedOrder.totalAmount?.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label>Tracking ID</Label>
                                  <p className="font-mono text-sm">{selectedOrder.trackingId}</p>
                                </div>
                              </div>
                              <div>
                                <Label>Delivery Address</Label>
                                <p className="font-medium">{selectedOrder.deliveryAddress}</p>
                              </div>
                              {selectedOrder.specifications && (
                                <div>
                                  <Label>Specifications</Label>
                                  <p className="font-medium">{selectedOrder.specifications}</p>
                                </div>
                              )}
                              <div className="flex gap-4 pt-4">
                                <div className="flex-1">
                                  <Label>Order Status</Label>
                                  <Select
                                    value={selectedOrder.status || 'pending'}
                                    onValueChange={(value) => {
                                      console.log("🔄 [UI] Status change requested:", value);
                                      updateOrderStatus(selectedOrder.id!, value);
                                    }}
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
                                  <Label>Payment Status</Label>
                                  <Select
                                    value={selectedOrder.paymentStatus || 'pending'}
                                    onValueChange={(value) => {
                                      console.log("🔄 [UI] Payment status change requested:", value);
                                      updateOrderStatus(selectedOrder.id!, selectedOrder.status || 'pending', value);
                                    }}
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
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteOrder(order.id!)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No orders found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default OrderManagement;
