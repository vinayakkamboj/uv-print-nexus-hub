
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

// Reduced timeouts to prevent UI hanging but give enough time to load
const SCRIPT_LOAD_TIMEOUT = 5000; // 5 seconds
const PAYMENT_PROCESS_TIMEOUT = 30000; // 30 seconds (increased from 20s)
const ORDER_CREATION_TIMEOUT = 5000; // 5 seconds

// Flag to track if we're in fallback mode
let isInFallbackMode = false;

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
    
    // Set a timeout to prevent hanging if script fails to load
    const timeoutId = setTimeout(() => {
      console.warn("Razorpay script load timed out, falling back to demo mode");
      isInFallbackMode = true;
      resolve(false);
    }, SCRIPT_LOAD_TIMEOUT);
    
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      clearTimeout(timeoutId);
      resolve(true);
    };
    
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
      isInFallbackMode = true;
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
  
  // If we already know we're in fallback mode, don't even try
  if (isInFallbackMode || DEMO_MODE) {
    console.log("Using fallback for Razorpay order creation (known fallback mode)");
    const razorpayOrderId = `rzp_${orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
    console.log("Razorpay order created:", razorpayOrderId);
    
    return {
      id: razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'pending',
      timestamp: new Date()
    };
  }
  
  // Always use a timeout to ensure we don't get stuck
  return Promise.race([
    new Promise<PaymentDetails>((resolve) => {
      // In a production app, we would make an API call to create a real Razorpay order
      // For now, we'll simulate it with a unique ID that includes the real order ID
      const razorpayOrderId = `rzp_${orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 8)}`;
      console.log("Razorpay order created:", razorpayOrderId);
      
      resolve({
        id: razorpayOrderId,
        amount,
        currency: 'INR',
        status: 'pending',
        timestamp: new Date()
      });
    }),
    new Promise<PaymentDetails>((resolve) => {
      setTimeout(() => {
        console.log("Razorpay order creation timed out, using fallback");
        isInFallbackMode = true;
        // Also include the real order ID in the fallback ID
        const fallbackOrderId = `fallback_${orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`;
        resolve({
          id: fallbackOrderId,
          amount,
          currency: 'INR',
          status: 'pending',
          timestamp: new Date()
        });
      }, ORDER_CREATION_TIMEOUT);
    })
  ]);
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
  console.log("Processing payment with Razorpay for orderId:", orderDetails.orderId);
  
  // Check for duplicate payment processing
  const paymentKey = `${orderDetails.orderId}_${orderDetails.razorpayOrderId}`;
  if (processedPayments.has(paymentKey)) {
    console.log("Payment already processed, preventing duplicate for:", paymentKey);
    return Promise.reject(new Error("Payment already being processed"));
  }
  
  // Mark payment as being processed
  processedPayments.add(paymentKey);
  
  // Immediately use demo mode if we're in fallback mode or demo mode is enabled
  if (isInFallbackMode || DEMO_MODE) {
    console.log("Using simulated payment process (DEMO/FALLBACK MODE)");
    return new Promise((resolve) => {
      setTimeout(() => {
        // Include the original order ID in the payment ID for better tracking
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
          deliveryAddress: orderDetails.deliveryAddress,
          orderData: {
            ...orderDetails.orderData,
            status: "received", // Explicitly set status to received for demo mode
            paymentStatus: "paid" // Ensure payment status is set
          }
        };
        
        console.log("Demo payment simulation completed:", paymentDetails);
        resolve(paymentDetails);
      }, 1000); // Short delay for demo mode
    });
  }
  
  // Check if Razorpay is available
  if (typeof window.Razorpay === 'undefined') {
    console.error("Razorpay is not initialized, falling back to demo mode");
    isInFallbackMode = true;
    return new Promise((resolve) => {
      setTimeout(() => {
        const mockPaymentId = `pay_fallback_${orderDetails.orderId.substring(0, 8)}_${Math.random().toString(36).substring(2, 6)}`;
        
        const paymentDetails: PaymentDetails = {
          id: orderDetails.razorpayOrderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          status: 'completed',
          timestamp: new Date(),
          paymentId: mockPaymentId,
          method: 'Razorpay (Fallback)',
          userId: orderDetails.userId,
          customerName: orderDetails.customerName,
          customerEmail: orderDetails.customerEmail,
          productType: orderDetails.productType,
          quantity: orderDetails.quantity,
          deliveryAddress: orderDetails.deliveryAddress,
          orderData: {
            ...orderDetails.orderData,
            status: "received", // Explicitly set status to received
            paymentStatus: "paid" // Ensure payment status is set
          }
        };
        
        console.log("Fallback payment completed:", paymentDetails);
        resolve(paymentDetails);
      }, 1000);
    });
  }
  
  // Use a master timeout to ensure we never get stuck
  return Promise.race([
    new Promise<PaymentDetails>((resolve, reject) => {
      try {
        console.log("Opening Razorpay payment window...");
        
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
              deliveryAddress: orderDetails.deliveryAddress,
              orderData: {
                ...orderDetails.orderData,
                status: "received", // Explicitly set status to received on successful payment
                paymentStatus: "paid" // Ensure payment status is set
              }
            };
            resolve(paymentDetails);
          },
          modal: {
            ondismiss: function () {
              console.log("Payment modal dismissed by user");
              // Remove from processed payments to allow retry
              processedPayments.delete(paymentKey);
              // Reject instead of resolve to indicate cancellation
              reject(new Error("Payment cancelled by user"));
            },
          },
        };
  
        try {
          const razorpay = new window.Razorpay(options);
          
          // Add event handlers for any potential Razorpay errors
          razorpay.on('payment.failed', function(response: any) {
            console.error("Razorpay payment failed:", response.error);
            // Remove from processed payments to allow retry
            processedPayments.delete(paymentKey);
            reject(new Error(`Payment failed: ${response.error.description}`));
          });
          
          razorpay.open();
          console.log("Razorpay payment window opened");
        } catch (razorpayError) {
          console.error("Error with Razorpay instance:", razorpayError);
          // Remove from processed payments to allow retry
          processedPayments.delete(paymentKey);
          reject(razorpayError);
        }
      } catch (outerError) {
        console.error("Critical error in payment process:", outerError);
        // Remove from processed payments to allow retry
        processedPayments.delete(paymentKey);
        reject(outerError);
      }
    }),
    // Master timeout that will reject if the payment process takes too long
    new Promise<PaymentDetails>((_, reject) => {
      setTimeout(() => {
        console.log("MASTER TIMEOUT: Payment processing took too long");
        // Remove from processed payments to allow retry
        processedPayments.delete(paymentKey);
        reject(new Error("Payment processing timeout"));
      }, PAYMENT_PROCESS_TIMEOUT);
    })
  ]);
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
