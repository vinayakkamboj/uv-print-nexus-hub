
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { generateInvoicePDF } from './invoice-generator';
import { sendInvoiceEmail } from './email-service';
import { PaymentDetails } from './payment-service';

export interface SimpleOrderData {
  id?: string;
  userId: string;
  productType: string;
  quantity: number;
  specifications?: string;
  deliveryAddress: string;
  gstNumber?: string;
  fileUrl: string;
  fileName: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  hsnCode: string;
  trackingId: string;
  status: 'pending_payment' | 'received' | 'processing' | 'printed' | 'shipped';
  paymentStatus: 'pending' | 'paid' | 'failed';
  timestamp: any;
  razorpayPaymentId?: string;
  paymentCompletedAt?: any;
  invoiceId?: string;
  lastUpdated?: any;
}

export const createOrder = async (orderData: Omit<SimpleOrderData, 'id' | 'status' | 'paymentStatus' | 'timestamp' | 'lastUpdated'>): Promise<{ success: boolean; orderId?: string; message?: string }> => {
  try {
    console.log("Creating order with data:", orderData);
    
    // Create order with default pending payment status
    const orderWithDefaults: Omit<SimpleOrderData, 'id'> = {
      ...orderData,
      status: 'pending_payment',
      paymentStatus: 'pending',
      timestamp: Timestamp.now(),
      lastUpdated: Timestamp.now()
    };

    const docRef = await addDoc(collection(db, 'orders'), orderWithDefaults);
    
    console.log("Order created successfully with ID:", docRef.id);
    
    return {
      success: true,
      orderId: docRef.id
    };
    
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      message: "Failed to create order"
    };
  }
};

export const updateOrderAfterPayment = async (orderId: string, razorpayPaymentId: string): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("Updating order after successful payment:", orderId, razorpayPaymentId);
    
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      console.error("Order not found:", orderId);
      return { success: false, message: "Order not found" };
    }
    
    // Update order with payment success
    await updateDoc(orderRef, {
      status: 'received',
      paymentStatus: 'paid',
      razorpayPaymentId: razorpayPaymentId,
      paymentCompletedAt: Timestamp.now(),
      lastUpdated: Timestamp.now()
    });
    
    console.log("Order updated successfully after payment");
    return { success: true };
    
  } catch (error) {
    console.error("Error updating order after payment:", error);
    return { success: false, message: "Failed to update order" };
  }
};

export const createAndSendInvoice = async (orderData: SimpleOrderData): Promise<{ success: boolean; invoiceId?: string; message?: string }> => {
  try {
    console.log("Creating and sending invoice for order:", orderData.id);
    
    // Generate invoice ID
    const invoiceId = `INV-${orderData.trackingId}-${Date.now().toString().slice(-4)}`;
    
    // Create invoice data
    const invoiceData = {
      invoiceId,
      orderId: orderData.id || '',
      orderDate: orderData.timestamp?.toDate ? orderData.timestamp.toDate() : new Date(),
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerAddress: orderData.deliveryAddress,
      products: [{
        name: orderData.productType,
        quantity: orderData.quantity,
        price: orderData.totalAmount
      }],
      totalAmount: orderData.totalAmount,
      gstNumber: orderData.gstNumber,
      hsnCode: orderData.hsnCode
    };
    
    // Generate PDF
    let pdfResult: { blob: Blob; url: string };
    
    try {
      pdfResult = await generateInvoicePDF(invoiceData);
    } catch (pdfError) {
      console.error("Error generating PDF:", pdfError);
      const fallbackBlob = new Blob(['Invoice content placeholder'], { type: 'application/pdf' });
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      pdfResult = { blob: fallbackBlob, url: fallbackUrl };
    }
    
    // Update order with invoice ID
    if (orderData.id) {
      try {
        await updateDoc(doc(db, 'orders', orderData.id), {
          invoiceId,
          lastUpdated: Timestamp.now()
        });
      } catch (updateError) {
        console.error("Error updating order with invoice ID:", updateError);
      }
    }
    
    // Send email
    try {
      await sendInvoiceEmail(invoiceData, pdfResult.blob);
    } catch (emailError) {
      console.error("Error sending invoice email:", emailError);
    }
    
    return {
      success: true,
      invoiceId
    };
    
  } catch (error) {
    console.error("Error creating and sending invoice:", error);
    return {
      success: false,
      message: "Failed to create invoice"
    };
  }
};

export const getUserOrders = async (userId: string): Promise<SimpleOrderData[]> => {
  try {
    console.log("Fetching orders for user:", userId);
    
    // Import the function from order-service to avoid duplication
    const { getAllUserOrders } = await import('./order-service');
    const orders = await getAllUserOrders(userId);
    
    console.log(`Found ${orders.length} orders for user ${userId}`);
    return orders as SimpleOrderData[];
    
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};
