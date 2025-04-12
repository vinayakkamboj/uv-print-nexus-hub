
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./firebase";
import { generateInvoicePDF, InvoiceData } from "./invoice-generator";
import { sendInvoiceEmail } from "./email-service";
import { generateId } from "./utils";
import { PaymentDetails } from "./payment-service";

export interface OrderData {
  id: string;
  userId: string;
  productType: string;
  quantity: number;
  specifications?: string;
  deliveryAddress: string;
  gstNumber?: string;
  totalAmount: number;
  customerName: string;
  customerEmail: string;
  hsnCode?: string;
}

export const createOrder = async (orderData: Omit<OrderData, "id">): Promise<{
  success: boolean;
  orderId?: string;
  message: string;
}> => {
  try {
    // Save initial order to Firestore
    const orderRef = await addDoc(collection(db, "orders"), {
      ...orderData,
      status: "pending_payment", // New status to indicate payment is pending
      timestamp: serverTimestamp(),
    });

    return {
      success: true,
      orderId: orderRef.id,
      message: "Order created successfully",
    };
  } catch (error) {
    console.error("Error creating order:", error);
    return {
      success: false,
      message: `Failed to create order: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const updateOrderAfterPayment = async (orderId: string, paymentDetails: PaymentDetails): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    const orderRef = doc(db, "orders", orderId);
    
    await updateDoc(orderRef, {
      status: "received",
      paymentDetails: {
        ...paymentDetails,
        timestamp: serverTimestamp(),
      },
    });

    return {
      success: true,
      message: "Order updated with payment details",
    };
  } catch (error) {
    console.error("Error updating order:", error);
    return {
      success: false,
      message: `Failed to update order: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const createAndSendInvoice = async (orderData: OrderData, paymentDetails: PaymentDetails): Promise<{
  success: boolean;
  invoiceId?: string;
  pdfUrl?: string;
  message: string;
}> => {
  try {
    // Generate invoice ID
    const invoiceId = `INV-${generateId(8).toUpperCase()}`;
    
    // Prepare invoice data
    const invoiceData: InvoiceData = {
      invoiceId,
      orderId: orderData.id,
      orderDate: new Date(),
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerAddress: orderData.deliveryAddress,
      gstNumber: orderData.gstNumber,
      hsnCode: orderData.hsnCode || '4911', // Default HSN code for printing items
      products: [
        {
          name: `${orderData.productType} Printing`,
          quantity: orderData.quantity,
          price: orderData.totalAmount / orderData.quantity,
        },
      ],
      totalAmount: orderData.totalAmount,
    };
    
    // Generate PDF invoice
    const pdfBlob = await generateInvoicePDF(invoiceData);
    
    // Upload PDF to Firebase Storage
    const storageRef = ref(storage, `invoices/${orderData.userId}/${invoiceId}.pdf`);
    const pdfBuffer = await pdfBlob.arrayBuffer();
    const uploadResult = await uploadBytes(storageRef, pdfBuffer);
    const pdfUrl = await getDownloadURL(uploadResult.ref);
    
    // Save invoice to Firestore
    const invoiceRef = await addDoc(collection(db, "invoices"), {
      invoiceId,
      orderId: orderData.id,
      userId: orderData.userId,
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      totalAmount: orderData.totalAmount,
      pdfUrl,
      paymentId: paymentDetails.paymentId,
      paymentMethod: paymentDetails.method,
      createdAt: serverTimestamp(),
      status: "paid",
    });
    
    // Send invoice email
    const emailResult = await sendInvoiceEmail(invoiceData, pdfBlob, true);
    
    // If email sending fails, log the error but continue
    if (!emailResult.success) {
      console.error("Invoice saved but email sending failed:", emailResult.message);
      return {
        success: true,
        invoiceId,
        pdfUrl,
        message: "Invoice generated successfully but email delivery failed",
      };
    }
    
    return {
      success: true,
      invoiceId,
      pdfUrl,
      message: "Invoice generated and sent successfully",
    };
  } catch (error) {
    console.error("Error generating invoice:", error);
    return {
      success: false,
      message: `Failed to generate invoice: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};
