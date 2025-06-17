
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

// Track processed payments to prevent duplicates
const processedPayments = new Set<string>();

export const initializeRazorpay = (): Promise<boolean> => {
  return new Promise((resolve) => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      console.log("Razorpay already loaded");
      resolve(true);
      return;
    }
    
    console.log("Loading Razorpay script...");
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    
    const timeoutId = setTimeout(() => {
      console.warn("Razorpay script load timed out, will use demo mode");
      resolve(false);
    }, 5000);
    
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = () => {
      console.error("Failed to load Razorpay script, will use demo mode");
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
  console.log("Creating Razorpay order for orderId:", orderId);
  
  // Check if this order was already processed to prevent duplicates
  if (processedPayments.has(orderId)) {
    console.log("Order already processed, preventing duplicate:", orderId);
    throw new Error("Order already being processed");
  }
  
  // Mark order as being processed
  processedPayments.add(orderId);
  
  try {
    // Generate a unique Razorpay order ID
    const razorpayOrderId = `rzp_${orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
    console.log("Generated Razorpay order:", razorpayOrderId);
    
    return {
      id: razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'pending',
      timestamp: new Date()
    };
  } catch (error) {
    // Remove from processed payments on error
    processedPayments.delete(orderId);
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
  console.log("Processing payment for orderId:", orderDetails.orderId);
  
  // Check for duplicate payment processing
  const paymentKey = `${orderDetails.orderId}_payment`;
  if (processedPayments.has(paymentKey)) {
    console.log("Payment already processed, preventing duplicate");
    return Promise.reject(new Error("Payment already being processed"));
  }
  
  // Mark payment as being processed
  processedPayments.add(paymentKey);
  
  // Use demo mode if Razorpay is not available or demo mode is enabled
  if (DEMO_MODE || typeof window.Razorpay === 'undefined') {
    console.log("Using demo payment mode");
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
        
        console.log("Demo payment completed:", paymentDetails);
        resolve(paymentDetails);
      }, 1000);
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
          console.log("Payment successful:", response);
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
            console.log("Payment modal dismissed by user");
            // Remove from processed payments to allow retry
            processedPayments.delete(paymentKey);
            reject(new Error("Payment cancelled by user"));
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function(response: any) {
        console.error("Razorpay payment failed:", response.error);
        processedPayments.delete(paymentKey);
        reject(new Error(`Payment failed: ${response.error.description}`));
      });
      
      razorpay.open();
      console.log("Razorpay payment window opened");
      
    } catch (error) {
      console.error("Error in payment process:", error);
      processedPayments.delete(paymentKey);
      reject(error);
    }
  });
};

// Function to clear processed payment tracking (useful for cleanup)
export const clearProcessedPayments = () => {
  processedPayments.clear();
  console.log("Cleared processed payments tracking");
};

// Add this TypeScript declaration to recognize the Razorpay global
declare global {
  interface Window {
    Razorpay: any;
  }
}
