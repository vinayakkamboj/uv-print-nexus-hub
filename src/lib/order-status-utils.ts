
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle, Truck, CheckCircle, XCircle, Clock, CreditCard } from "lucide-react";

export type OrderStatus = 
  | 'pending' 
  | 'pending_payment' 
  | 'received' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'completed' 
  | 'cancelled' 
  | 'failed';

export type PaymentStatus = 
  | 'pending' 
  | 'paid' 
  | 'failed' 
  | 'refunded';

export interface OrderStatusConfig {
  label: string;
  color: string;
  icon: any;
  description: string;
  step: number;
}

export const ORDER_STATUS_CONFIG: Record<OrderStatus, OrderStatusConfig> = {
  pending: {
    label: "Order Placed",
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    icon: AlertCircle,
    description: "Your order has been placed and is awaiting confirmation",
    step: 1
  },
  pending_payment: {
    label: "Payment Pending",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: CreditCard,
    description: "Waiting for payment confirmation",
    step: 1
  },
  received: {
    label: "Order Received",
    color: "bg-blue-100 text-blue-800 border-blue-200",
    icon: Package,
    description: "We have received your order and it's being reviewed",
    step: 2
  },
  processing: {
    label: "Processing",
    color: "bg-purple-100 text-purple-800 border-purple-200",
    icon: Clock,
    description: "Your order is being prepared for shipment",
    step: 3
  },
  shipped: {
    label: "Shipped",
    color: "bg-indigo-100 text-indigo-800 border-indigo-200",
    icon: Truck,
    description: "Your order has been shipped and is on its way",
    step: 4
  },
  delivered: {
    label: "Delivered",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Your order has been delivered successfully",
    step: 5
  },
  completed: {
    label: "Completed",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Order completed successfully",
    step: 5
  },
  cancelled: {
    label: "Cancelled",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    description: "This order has been cancelled",
    step: 0
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    description: "This order has failed",
    step: 0
  }
};

export const PAYMENT_STATUS_CONFIG: Record<PaymentStatus, OrderStatusConfig> = {
  pending: {
    label: "Payment Pending",
    color: "bg-orange-100 text-orange-800 border-orange-200",
    icon: CreditCard,
    description: "Payment is pending",
    step: 0
  },
  paid: {
    label: "Paid",
    color: "bg-green-100 text-green-800 border-green-200",
    icon: CheckCircle,
    description: "Payment completed successfully",
    step: 1
  },
  failed: {
    label: "Payment Failed",
    color: "bg-red-100 text-red-800 border-red-200",
    icon: XCircle,
    description: "Payment failed",
    step: 0
  },
  refunded: {
    label: "Refunded",
    color: "bg-gray-100 text-gray-800 border-gray-200",
    icon: XCircle,
    description: "Payment has been refunded",
    step: 0
  }
};

export const getOrderStatusBadge = (status: OrderStatus) => {
  const config = ORDER_STATUS_CONFIG[status] || ORDER_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return {
    ...config,
    component: (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  };
};

export const getPaymentStatusBadge = (status: PaymentStatus) => {
  const config = PAYMENT_STATUS_CONFIG[status] || PAYMENT_STATUS_CONFIG.pending;
  const Icon = config.icon;

  return {
    ...config,
    component: (
      <Badge className={config.color}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  };
};

export const getOrderProgress = (status: OrderStatus): { current: number; total: number; percentage: number } => {
  const config = ORDER_STATUS_CONFIG[status];
  const maxStep = Math.max(...Object.values(ORDER_STATUS_CONFIG).map(c => c.step));
  const currentStep = config.step;
  const percentage = (currentStep / maxStep) * 100;
  
  return {
    current: currentStep,
    total: maxStep,
    percentage: Math.max(0, percentage)
  };
};

export const getOrderJourneySteps = (currentStatus: OrderStatus) => {
  const steps = [
    { status: 'pending' as OrderStatus, label: 'Order Placed', step: 1 },
    { status: 'received' as OrderStatus, label: 'Order Received', step: 2 },
    { status: 'processing' as OrderStatus, label: 'Processing', step: 3 },
    { status: 'shipped' as OrderStatus, label: 'Shipped', step: 4 },
    { status: 'delivered' as OrderStatus, label: 'Delivered', step: 5 }
  ];

  const currentConfig = ORDER_STATUS_CONFIG[currentStatus];
  const currentStep = currentConfig.step;

  return steps.map(step => ({
    ...step,
    isActive: step.step <= currentStep,
    isCurrent: step.step === currentStep,
    isCompleted: step.step < currentStep
  }));
};
