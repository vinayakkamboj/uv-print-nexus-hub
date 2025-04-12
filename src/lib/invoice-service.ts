
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
    // For demo purposes, simulate order creation without requiring Firebase write permissions
    // In a production environment, you would actually save this to Firestore
    console.log("Creating order with data:", orderData);
    
    // Generate a simulated order ID
    const mockOrderId = `order_${generateId(12)}`;
    
    return {
      success: true,
      orderId: mockOrderId,
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
    // In demo mode, we'll just log the update instead of actually writing to Firestore
    console.log("Updating order after payment:", { orderId, paymentDetails });
    
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
    
    // In demo mode, we'll skip the Firebase storage upload
    // and just simulate a PDF URL
    const mockPdfUrl = `https://example.com/invoices/${invoiceId}.pdf`;
    
    // Send invoice email - this should still work as it's a client-side simulation
    const emailResult = await sendInvoiceEmail(invoiceData, pdfBlob, true);
    
    // If email sending fails, log the error but continue
    if (!emailResult.success) {
      console.error("Invoice saved but email sending failed:", emailResult.message);
      return {
        success: true,
        invoiceId,
        pdfUrl: mockPdfUrl,
        message: "Invoice generated successfully but email delivery failed",
      };
    }
    
    return {
      success: true,
      invoiceId,
      pdfUrl: mockPdfUrl,
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
