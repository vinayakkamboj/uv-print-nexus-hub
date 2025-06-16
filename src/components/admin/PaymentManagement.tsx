import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, DollarSign, Eye, CreditCard, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { collection, getDocs, doc, updateDoc, orderBy, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PaymentData {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency: string;
  status: string;
  method: string;
  paymentId?: string;
  timestamp: any;
  refundAmount?: number;
  refundReason?: string;
}

interface OrderData {
  id: string;
  paymentDetails?: {
    id?: string;
    method?: string;
    paymentId?: string;
  };
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  totalAmount?: number;
  paymentStatus?: string;
  timestamp?: any;
  [key: string]: any;
}

const PaymentManagement = () => {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchPayments();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchTerm, statusFilter]);

  const fetchPayments = async () => {
    try {
      // Fetch orders with payment details
      const ordersSnapshot = await getDocs(
        query(collection(db, "orders"), orderBy("timestamp", "desc"))
      );
      
      const paymentsData: PaymentData[] = [];
      
      ordersSnapshot.docs.forEach(doc => {
        const order: OrderData = { id: doc.id, ...doc.data() };
        
        // Only include orders that have payment information
        if (order.paymentDetails || order.paymentStatus) {
          paymentsData.push({
            id: order.paymentDetails?.id || doc.id,
            orderId: order.id,
            userId: order.userId || '',
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            amount: order.totalAmount || 0,
            currency: 'INR',
            status: order.paymentStatus || 'pending',
            method: order.paymentDetails?.method || 'Not specified',
            paymentId: order.paymentDetails?.paymentId,
            timestamp: order.timestamp
          });
        }
      });
      
      setPayments(paymentsData);
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast({
        title: "Error",
        description: "Failed to fetch payments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = payments;

    if (searchTerm) {
      filtered = filtered.filter(payment =>
        payment.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.customerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.paymentId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        payment.orderId.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(payment => payment.status === statusFilter);
    }

    setFilteredPayments(filtered);
  };

  const updatePaymentStatus = async (paymentId: string, orderId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "orders", orderId), {
        paymentStatus: newStatus,
        lastUpdated: new Date()
      });
      
      // Update local state
      setPayments(prevPayments =>
        prevPayments.map(payment =>
          payment.id === paymentId
            ? { ...payment, status: newStatus }
            : payment
        )
      );

      toast({
        title: "Success",
        description: "Payment status updated successfully"
      });
    } catch (error) {
      console.error("Error updating payment:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
      paid: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      completed: { color: "bg-green-100 text-green-800", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-800", icon: XCircle },
      refunded: { color: "bg-blue-100 text-blue-800", icon: RefreshCw },
      partial_refund: { color: "bg-purple-100 text-purple-800", icon: RefreshCw }
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
          <DollarSign className="h-5 w-5" />
          Payment Management
        </CardTitle>
        <CardDescription>
          Monitor transactions, handle refunds, and resolve payment issues
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="search">Search Payments</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Search by customer, payment ID, or order ID..."
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
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="refunded">Refunded</SelectItem>
                <SelectItem value="partial_refund">Partial Refund</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payments Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm">{payment.paymentId || payment.id.substring(0, 12)}...</p>
                      <p className="text-xs text-gray-500">Order: {payment.orderId.substring(0, 8)}...</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{payment.customerName}</p>
                      <p className="text-sm text-gray-500">{payment.customerEmail}</p>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">
                    ₹{payment.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      {payment.method}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(payment.status)}
                  </TableCell>
                  <TableCell>
                    {payment.timestamp ? 
                      new Date(payment.timestamp.seconds ? payment.timestamp.seconds * 1000 : payment.timestamp).toLocaleDateString() 
                      : 'N/A'
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(payment)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Payment Details</DialogTitle>
                            <DialogDescription>
                              Complete payment information and actions
                            </DialogDescription>
                          </DialogHeader>
                          {selectedPayment && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Payment ID</Label>
                                  <p className="font-mono text-sm">{selectedPayment.paymentId || 'N/A'}</p>
                                </div>
                                <div>
                                  <Label>Order ID</Label>
                                  <p className="font-mono text-sm">{selectedPayment.orderId}</p>
                                </div>
                                <div>
                                  <Label>Customer Name</Label>
                                  <p className="font-medium">{selectedPayment.customerName}</p>
                                </div>
                                <div>
                                  <Label>Email</Label>
                                  <p className="font-medium">{selectedPayment.customerEmail}</p>
                                </div>
                                <div>
                                  <Label>Amount</Label>
                                  <p className="font-semibold">₹{selectedPayment.amount.toLocaleString()}</p>
                                </div>
                                <div>
                                  <Label>Currency</Label>
                                  <p className="font-medium">{selectedPayment.currency}</p>
                                </div>
                                <div>
                                  <Label>Payment Method</Label>
                                  <p className="font-medium">{selectedPayment.method}</p>
                                </div>
                                <div>
                                  <Label>Current Status</Label>
                                  {getStatusBadge(selectedPayment.status)}
                                </div>
                              </div>
                              
                              <div className="border-t pt-4">
                                <Label>Update Payment Status</Label>
                                <div className="flex gap-2 mt-2">
                                  <Select
                                    value={selectedPayment.status}
                                    onValueChange={(value) => updatePaymentStatus(selectedPayment.id, selectedPayment.orderId, value)}
                                  >
                                    <SelectTrigger className="w-[200px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pending</SelectItem>
                                      <SelectItem value="paid">Paid</SelectItem>
                                      <SelectItem value="completed">Completed</SelectItem>
                                      <SelectItem value="failed">Failed</SelectItem>
                                      <SelectItem value="refunded">Refunded</SelectItem>
                                      <SelectItem value="partial_refund">Partial Refund</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredPayments.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No payments found matching your criteria.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentManagement;
