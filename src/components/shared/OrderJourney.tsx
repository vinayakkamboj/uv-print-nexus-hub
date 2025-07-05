
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  getOrderJourneySteps, 
  getOrderProgress, 
  getOrderStatusBadge,
  OrderStatus 
} from "@/lib/order-status-utils";

interface OrderJourneyProps {
  status: OrderStatus;
  className?: string;
  showProgress?: boolean;
}

const OrderJourney = ({ status, className = "", showProgress = true }: OrderJourneyProps) => {
  const steps = getOrderJourneySteps(status);
  const progress = getOrderProgress(status);
  const statusInfo = getOrderStatusBadge(status);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Status Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-lg">Order Status</h3>
          <p className="text-gray-600 text-sm">{statusInfo.description}</p>
        </div>
        {statusInfo.component}
      </div>

      {/* Progress Bar */}
      {showProgress && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Progress</span>
            <span>{progress.current}/{progress.total} steps</span>
          </div>
          <Progress value={progress.percentage} className="h-2" />
        </div>
      )}

      {/* Journey Steps */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Order Journey</h4>
        <div className="space-y-2">
          {steps.map((step, index) => (
            <div key={step.status} className="flex items-center gap-3">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors
                ${step.isCompleted 
                  ? 'bg-green-100 text-green-800 border-2 border-green-300' 
                  : step.isCurrent 
                    ? 'bg-blue-100 text-blue-800 border-2 border-blue-300'
                    : 'bg-gray-100 text-gray-500 border-2 border-gray-200'
                }
              `}>
                {step.isCompleted ? '✓' : step.step}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${
                  step.isActive ? 'text-gray-900' : 'text-gray-500'
                }`}>
                  {step.label}
                </p>
                {step.isCurrent && (
                  <p className="text-sm text-blue-600">Current step</p>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-px h-6 ml-4 ${
                  step.isCompleted ? 'bg-green-300' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderJourney;
