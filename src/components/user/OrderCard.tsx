
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Package, MapPin, FileText } from "lucide-react";
import { SimpleOrderData } from "@/lib/invoice-service";
import { getOrderStatusBadge, getPaymentStatusBadge, OrderStatus, PaymentStatus } from "@/lib/order-status-utils";
import OrderJourney from "@/components/shared/OrderJourney";

interface OrderCardProps {
  order: SimpleOrderData;
  onViewDetails?: (order: SimpleOrderData) => void;
}

const OrderCard = ({ order, onViewDetails }: OrderCardProps) => {
  const orderStatus = (order.status || 'pending') as OrderStatus;
  const paymentStatus = (order.paymentStatus || 'pending') as PaymentStatus;
  
  const statusInfo = getOrderStatusBadge(orderStatus);
  const paymentInfo = getPaymentStatusBadge(paymentStatus);

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.seconds 
      ? new Date(timestamp.seconds * 1000)
      : new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">Order #{order.id?.substring(0, 8)}...</CardTitle>
            <p className="text-sm text-gray-600 mt-1">{order.productType}</p>
          </div>
          <div className="text-right space-y-1">
            {statusInfo.component}
            {paymentInfo.component}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <span>Qty: {order.quantity}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span>{formatDate(order.timestamp)}</span>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
          <span className="text-gray-600 line-clamp-2">{order.deliveryAddress}</span>
        </div>

        {order.trackingId && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-900">Tracking ID</p>
            <p className="font-mono text-sm text-blue-700">{order.trackingId}</p>
          </div>
        )}

        {/* Order Journey */}
        <OrderJourney status={orderStatus} showProgress={true} />

        <div className="flex justify-between items-center pt-3 border-t">
          <div>
            <p className="text-lg font-bold">₹{order.totalAmount?.toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Amount</p>
          </div>
          {onViewDetails && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => onViewDetails(order)}
              className="flex items-center gap-1"
            >
              <FileText className="h-4 w-4" />
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderCard;
