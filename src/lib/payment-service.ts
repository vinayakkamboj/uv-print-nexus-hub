// src/lib/payment-service.ts
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
}

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
    script.onload = () => {
      console.log("Razorpay script loaded successfully");
      resolve(true);
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay script");
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
  try {
    console.log("Creating Razorpay order...");
    
    // In a real implementation, you would call your backend to create an order in Razorpay
    // For now, we'll simulate this process
    
    // Generate a unique ID for the Razorpay order
    const razorpayOrderId = `rzp_order_${Math.random().toString(36).substring(2, 15)}`;
    console.log("Razorpay order created:", razorpayOrderId);
    
    return {
      id: razorpayOrderId,
      amount,
      currency: 'INR',
      status: 'pending',
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    throw new Error('Failed to create payment order');
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
  }
): Promise<PaymentDetails> => {
  return new Promise((resolve, reject) => {
    console.log("Processing payment with Razorpay...");
    
    // Check if we should use a real Razorpay integration or simulate payment
    const useRealRazorpay = false; // Set to true when you want to use the actual Razorpay
    
    if (!useRealRazorpay) {
      console.log("Using simulated payment process");
      // Simulate a 2-second delay to mimic payment processing
      setTimeout(() => {
        const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 15)}`;
        
        const paymentDetails: PaymentDetails = {
          id: orderDetails.razorpayOrderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          status: 'completed',
          timestamp: new Date(),
          paymentId: mockPaymentId,
          method: 'Razorpay (Demo)',
        };
        
        console.log("Payment simulation completed:", paymentDetails);
        resolve(paymentDetails);
      }, 2000);
      
      return;
    }
    
    // Only execute this code if useRealRazorpay is true
    // First check if Razorpay is available
    if (typeof window.Razorpay === 'undefined') {
      console.error("Razorpay is not initialized");
      reject(new Error('Razorpay is not initialized. Please refresh and try again.'));
      return;
    }
    
    console.log("Opening Razorpay payment window...");
    
    const options = {
      key: 'rzp_test_HJG5Rtx42VMzMK', // Razorpay test key
      amount: orderDetails.amount * 100, // Razorpay expects amount in paise
      currency: orderDetails.currency,
      name: 'Micro UV Printers',
      description: orderDetails.description,
      order_id: orderDetails.razorpayOrderId,
      prefill: {
        name: orderDetails.customerName,
        email: orderDetails.customerEmail,
      },
      theme: {
        color: '#3399cc',
      },
      handler: function (response: RazorpayResponse) {
        // This function is called when payment is successful
        console.log("Payment successful:", response);
        const paymentDetails: PaymentDetails = {
          id: orderDetails.razorpayOrderId,
          amount: orderDetails.amount,
          currency: orderDetails.currency,
          status: 'completed',
          timestamp: new Date(),
          paymentId: response.razorpay_payment_id,
          method: 'Razorpay',
        };
        resolve(paymentDetails);
      },
      modal: {
        ondismiss: function () {
          console.log("Payment modal dismissed by user");
          reject(new Error('Payment cancelled by user'));
        },
      },
    };

    try {
      const razorpay = new window.Razorpay(options);
      razorpay.open();
      console.log("Razorpay payment window opened");
    } catch (error) {
      console.error("Error opening Razorpay:", error);
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