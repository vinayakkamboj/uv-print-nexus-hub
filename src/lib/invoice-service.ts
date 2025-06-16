
import { db } from './firebase';
import { collection, addDoc, doc, updateDoc, getDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { generateInvoicePDF } from './invoice-generator';
import { sendInvoiceEmail } from './email-service';
import { PaymentDetails } from './payment-service';

export interface OrderData {
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
  trackingId?: string;
  status?: string;
  paymentStatus?: string;
  timestamp?: any;
  paymentDetails?: PaymentDetails;
  invoiceId?: string;
  [key: string]: any;
}

export const createOrder = async (orderData: Omit<OrderData, 'id'>): Promise<{ success: boolean; orderId?: string; trackingId?: string; message?: string }> => {
  try {
    console.log("Creating order with data:", orderData);
    
    // Add timestamp and initial status
    const orderWithDefaults = {
      ...orderData,
      timestamp: Timestamp.now(),
      status: 'pending_payment',
      paymentStatus: 'pending',
      createdAt: new Date(),
      lastUpdated: new Date()
    };

    // Create the order document
    const docRef = await addDoc(collection(db, 'orders'), orderWithDefaults);
    
    console.log("Order created successfully with ID:", docRef.id);
    
    return {
      success: true,
      orderId: docRef.id,
      trackingId: orderData.trackingId
    };
    
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      message: "Failed to create order"
    };
  }
};

export const updateOrderAfterPayment = async (orderId: string, paymentDetails: PaymentDetails): Promise<{ success: boolean; message?: string }> => {
  try {
    console.log("Updating order after payment:", orderId, paymentDetails);
    
    // Check if order exists
    const orderRef = doc(db, 'orders', orderId);
    const orderDoc = await getDoc(orderRef);
    
    if (!orderDoc.exists()) {
      console.error("Order not found:", orderId);
      return { success: false, message: "Order not found" };
    }
    
    // Update the existing order with payment details
    const updateData = {
      paymentDetails: {
        id: paymentDetails.id,
        paymentId: paymentDetails.paymentId,
        method: paymentDetails.method,
        timestamp: paymentDetails.timestamp
      },
      paymentStatus: paymentDetails.status === 'completed' ? 'paid' : paymentDetails.status,
      status: paymentDetails.status === 'completed' ? 'received' : 'pending_payment',
      lastUpdated: new Date()
    };
    
    await updateDoc(orderRef, updateData);
    
    console.log("Order updated successfully after payment");
    
    return { success: true };
    
  } catch (error) {
    console.error("Error updating order after payment:", error);
    return { success: false, message: "Failed to update order" };
  }
};

export const createAndSendInvoice = async (orderData: OrderData, paymentDetails: PaymentDetails): Promise<{ success: boolean; invoiceId?: string; pdfBlob?: Blob; pdfUrl?: string; message?: string }> => {
  try {
    console.log("Creating and sending invoice for order:", orderData.id);
    
    // Generate invoice ID
    const invoiceId = `INV-${orderData.trackingId || orderData.id?.substring(0, 8)}-${Date.now().toString().slice(-4)}`;
    
    // Create invoice data that matches the InvoiceData interface
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
      // Create fallback PDF
      const fallbackBlob = new Blob(['Invoice content placeholder'], { type: 'application/pdf' });
      const fallbackUrl = URL.createObjectURL(fallbackBlob);
      pdfResult = { blob: fallbackBlob, url: fallbackUrl };
    }
    
    // Update order with invoice ID
    if (orderData.id) {
      try {
        await updateDoc(doc(db, 'orders', orderData.id), {
          invoiceId,
          lastUpdated: new Date()
        });
      } catch (updateError) {
        console.error("Error updating order with invoice ID:", updateError);
      }
    }
    
    // Send email (non-blocking)
    try {
      await sendInvoiceEmail(orderData.customerEmail, {
        invoiceId,
        orderData,
        paymentDetails,
        issueDate: new Date(),
        dueDate: new Date(),
      }, pdfResult.blob);
    } catch (emailError) {
      console.error("Error sending invoice email:", emailError);
      // Don't fail the whole process if email fails
    }
    
    return {
      success: true,
      invoiceId,
      pdfBlob: pdfResult.blob,
      pdfUrl: pdfResult.url
    };
    
  } catch (error) {
    console.error("Error creating and sending invoice:", error);
    return {
      success: false,
      message: "Failed to create invoice"
    };
  }
};

export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  try {
    console.log("Fetching orders for user:", userId);
    
    const ordersQuery = query(
      collection(db, 'orders'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderData[];
    
    console.log(`Found ${orders.length} orders for user ${userId}`);
    return orders;
    
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};
