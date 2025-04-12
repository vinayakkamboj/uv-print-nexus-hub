// src/lib/invoice-service.ts
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
    console.log("Creating order with data:", orderData);
    
    // Generate a simulated order ID
    const mockOrderId = `order_${generateId(12)}`;
    console.log("Order created with ID:", mockOrderId);
    
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
  console.log("Starting invoice creation process...");
  
  try {
    // Generate invoice ID
    const invoiceId = `INV-${generateId(8).toUpperCase()}`;
    console.log("Generated invoice ID:", invoiceId);
    
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
    
    console.log("Invoice data prepared, generating PDF...");
    
    // Set a timeout to prevent hanging forever
    const pdfPromise = Promise.race([
      generateInvoicePDF(invoiceData),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("PDF generation timed out")), 10000);
      }),
    ]);
    
    // Generate PDF invoice with timeout protection
    const pdfBlob = await pdfPromise;
    console.log("PDF generated successfully");
    
    // Mock PDF URL (for demo)
    const mockPdfUrl = `https://example.com/invoices/${invoiceId}.pdf`;
    
    console.log("Sending invoice email...");
    
    // Send invoice email with timeout protection
    const emailPromise = Promise.race([
      sendInvoiceEmail(invoiceData, pdfBlob, true),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Email sending timed out")), 5000);
      }),
    ]);
    
    // Send email
    try {
      const emailResult = await emailPromise;
      console.log("Email result:", emailResult);
      
      if (!emailResult.success) {
        console.warn("Invoice saved but email sending failed:", emailResult.message);
      }
    } catch (error) {
      console.error("Email sending failed but continuing:", error);
      // We continue even if email fails
    }
    
    console.log("Invoice process completed successfully");
    
    return {
      success: true,
      invoiceId,
      pdfUrl: mockPdfUrl,
      message: "Invoice generated successfully",
    };
  } catch (error) {
    console.error("Error in invoice generation process:", error);
    return {
      success: false,
      message: `Failed to generate invoice: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};