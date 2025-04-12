
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
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
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
    // In a real implementation, you would call your backend to create an order in Razorpay
    // For demo purposes, we'll simulate this process
    
    // Generate a unique ID for the Razorpay order
    const razorpayOrderId = `rzp_order_${Math.random().toString(36).substring(2, 15)}`;
    
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
    // For demo purposes only - simulate a successful payment without opening Razorpay
    // This is to bypass the Firebase permissions issue
    // In a real implementation, you would use the commented-out code below
    
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
      
      resolve(paymentDetails);
    }, 2000);
    
    /* 
    // Real Razorpay implementation (commented out for demo)
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
          reject(new Error('Payment cancelled by user'));
        },
      },
    };

    // @ts-ignore - Razorpay is loaded via script
    const razorpay = new window.Razorpay(options);
    razorpay.open();
    */
  });
};
