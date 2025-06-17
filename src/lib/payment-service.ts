
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

// Use import.meta.env instead of process.env for Vite apps
const DEMO_MODE = import.meta.env.VITE_RAZORPAY_DEMO_MODE === 'true';
// Default to test key if not provided
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || "rzp_test_1DP5mmOlF5G5ag";

export const initializeRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      console.log("✅ Razorpay already loaded");
      resolve(true);
      return;
    }
    
    console.log("📦 Loading Razorpay script...");
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Razorpay script load timed out, will use demo mode");
      resolve(false);
    }, 10000); // Increased timeout
    
    script.onload = () => {
      console.log("✅ Razorpay script loaded successfully");
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = () => {
      console.error("❌ Failed to load Razorpay script, will use demo mode");
      clearTimeout(timeoutId);
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
  console.log("💳 Creating Razorpay order for orderId:", orderId);
  
  try {
    // Generate a unique Razorpay order ID
    const razorpayOrderId = `rzp_${orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
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
    throw error;
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
  
  // Use demo mode if Razorpay is not available or demo mode is enabled
  if (DEMO_MODE || typeof window.Razorpay === 'undefined') {
    console.log("🎭 Using demo payment mode");
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockPaymentId = `pay_demo_${orderDetails.orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`;
        
        const paymentDetails: PaymentDetails = {
          id: orderDetails.razorpayOrderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          status: 'completed',
          timestamp: new Date(),
          paymentId: mockPaymentId,
          method: 'Razorpay (Demo)',
          userId: orderDetails.userId,
          customerName: orderDetails.customerName,
          customerEmail: orderDetails.customerEmail,
          productType: orderDetails.productType,
          quantity: orderDetails.quantity,
          deliveryAddress: orderDetails.deliveryAddress
        };
        
        console.log("✅ Demo payment completed:", paymentDetails);
        resolve(paymentDetails);
      }, 2000); // Simulate processing time
    });
  }
  
  // Real Razorpay payment processing
  return new Promise<PaymentDetails>((resolve, reject) => {
    try {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: orderDetails.amount * 100, // Razorpay expects amount in paise
        currency: orderDetails.currency,
        name: 'Micro UV Printers',
        description: orderDetails.description,
        prefill: {
          name: orderDetails.customerName,
          email: orderDetails.customerEmail,
        },
        theme: {
          color: '#3399cc',
        },
        handler: function (response: any) {
          console.log("✅ Payment successful:", response);
          const paymentDetails: PaymentDetails = {
            id: orderDetails.razorpayOrderId,
            amount: orderDetails.amount,
            currency: orderDetails.currency,
            status: 'completed',
            timestamp: new Date(),
            paymentId: response.razorpay_payment_id || `manual_pay_${Math.random().toString(36).substring(2, 8)}`,
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

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function(response: any) {
        console.error("❌ Razorpay payment failed:", response.error);
        reject(new Error(`Payment failed: ${response.error.description}`));
      });
      
      razorpay.open();
      console.log("🎬 Razorpay payment window opened");
      
    } catch (error) {
      console.error("❌ Error in payment process:", error);
      reject(error);
    }
  });
};

// Add this TypeScript declaration to recognize the Razorpay global
declare global {
  interface Window {
    Razorpay: any;
  }
}
