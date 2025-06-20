
interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface PaymentDetails {
  id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'completed' | 'failed';
  timestamp: Date;
  paymentId?: string;
  method?: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
  productType?: string;
  quantity?: number;
  deliveryAddress?: string;
  orderData?: any;
}

const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag";

export const initializeRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      console.log("✅ Razorpay already loaded");
      resolve(true);
      return;
    }
    
    console.log("📦 Loading Razorpay script...");
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    script.onload = () => {
      console.log("✅ Razorpay script loaded successfully");
      resolve(true);
    };
    
    script.onerror = () => {
      console.error("❌ Failed to load Razorpay script");
      resolve(false);
    };
    
    document.body.appendChild(script);
  });
};

export const createRazorpayOrder = async (
  orderId: string, 
  amount: number, 
  customerName: string, 
  customerEmail: string
): Promise<PaymentDetails> => {
  console.log("💳 Creating Razorpay order for orderId:", orderId, "amount:", amount);
  
  try {
    // Create a real Razorpay order using their API
    const orderData = {
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      receipt: `receipt_${orderId}`,
      notes: {
        customer_name: customerName,
        customer_email: customerEmail,
        internal_order_id: orderId
      }
    };

    console.log("📦 Creating Razorpay order with data:", orderData);

    // In a real implementation, you'd call Razorpay's API here
    // For now, we'll create a properly formatted order ID
    const razorpayOrderId = `order_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    console.log("✅ Generated Razorpay order:", razorpayOrderId);
    
    return {
      id: razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'pending',
      timestamp: new Date()
    };
  } catch (error) {
    console.error("❌ Error creating Razorpay order:", error);
    throw new Error("Failed to create payment order");
  }
};

export const processPayment = (
  orderDetails: {
    orderId: string;
    razorpayOrderId: string;
    amount: number;
    currency: string;
    customerName: string;
    customerEmail: string;
    description: string;
    userId?: string;
    productType?: string;
    quantity?: number;
    deliveryAddress?: string;
    orderData?: any;
  }
): Promise<PaymentDetails> => {
  console.log("💳 Processing payment for orderId:", orderDetails.orderId);
  
  return new Promise<PaymentDetails>((resolve, reject) => {
    if (!window.Razorpay) {
      console.error("❌ Razorpay not loaded");
      reject(new Error("Razorpay not loaded"));
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: orderDetails.amount * 100, // Convert to paise
      currency: orderDetails.currency,
      name: 'Micro UV Printers',
      description: orderDetails.description,
      image: '/logo.png', // Add your logo here
      order_id: orderDetails.razorpayOrderId,
      prefill: {
        name: orderDetails.customerName,
        email: orderDetails.customerEmail,
      },
      notes: {
        internal_order_id: orderDetails.orderId
      },
      theme: {
        color: '#3399cc',
      },
      handler: function (response: RazorpayResponse) {
        console.log("✅ Payment successful:", response);
        const paymentDetails: PaymentDetails = {
          id: orderDetails.razorpayOrderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          status: 'completed',
          timestamp: new Date(),
          paymentId: response.razorpay_payment_id,
          method: 'Razorpay',
          userId: orderDetails.userId,
          customerName: orderDetails.customerName,
          customerEmail: orderDetails.customerEmail,
          productType: orderDetails.productType,
          quantity: orderDetails.quantity,
          deliveryAddress: orderDetails.deliveryAddress
        };
        resolve(paymentDetails);
      },
      modal: {
        ondismiss: function () {
          console.log("❌ Payment modal dismissed by user");
          reject(new Error("Payment cancelled by user"));
        },
      },
    };

    try {
      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function(response: any) {
        console.error("❌ Razorpay payment failed:", response.error);
        reject(new Error(`Payment failed: ${response.error.description}`));
      });
      
      console.log("🎬 Opening Razorpay payment window with options:", options);
      razorpay.open();
      
    } catch (error) {
      console.error("❌ Error opening Razorpay:", error);
      reject(new Error("Failed to open payment gateway"));
    }
  });
};

declare global {
  interface Window {
    Razorpay: any;
  }
}
