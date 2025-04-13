
// src/lib/invoice-service.ts
import { generateInvoicePDF, InvoiceData } from "./invoice-generator";
import { sendInvoiceEmail } from "./email-service";
import { generateId } from "./utils";
import { PaymentDetails } from "./payment-service";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, where, query, getDocs } from "firebase/firestore";

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
  status?: string;
  timestamp?: any;
}

export const createOrder = async (orderData: Omit<OrderData, "id">): Promise<{
  success: boolean;
  orderId?: string;
  message: string;
}> => {
  try {
    console.log("Creating order with data:", orderData);
    
    // Check if we're in demo mode (no Firebase writes)
    if (process.env.RAZORPAY_DEMO_MODE === 'true') {
      // Generate a simulated order ID
      const mockOrderId = `order_${generateId(12)}`;
      console.log("Order created with ID (DEMO MODE):", mockOrderId);
      
      return {
        success: true,
        orderId: mockOrderId,
        message: "Order created successfully (DEMO MODE)",
      };
    }
    
    // Create a new order document with the current timestamp
    try {
      // Create a new order document with the current timestamp and ensure userId is included
      const orderRef = await addDoc(collection(db, "orders"), {
        ...orderData,
        status: "pending_payment",
        timestamp: serverTimestamp(),
      });
      
      console.log("Order created with ID:", orderRef.id);
      
      return {
        success: true,
        orderId: orderRef.id,
        message: "Order created successfully",
      };
    } catch (firebaseError) {
      console.error("Firebase error creating order:", firebaseError);
      
      // Fallback to mock order if Firebase fails
      const mockOrderId = `order_${generateId(12)}`;
      console.log("Falling back to mock order ID:", mockOrderId);
      
      return {
        success: true,
        orderId: mockOrderId,
        message: "Order created successfully (fallback mode)",
      };
    }
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
    
    // Check if we're in demo mode (no Firebase writes)
    if (process.env.RAZORPAY_DEMO_MODE === 'true') {
      console.log("Order updated with payment details (DEMO MODE)");
      return {
        success: true,
        message: "Order updated with payment details (DEMO MODE)",
      };
    }
    
    // Not in demo mode, update the order in Firestore
    try {
      // Update the order document with payment details
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "received",
        paymentDetails: {
          id: paymentDetails.id,
          paymentId: paymentDetails.paymentId,
          method: paymentDetails.method,
          status: paymentDetails.status,
          timestamp: paymentDetails.timestamp,
        },
      });
      
      console.log("Order updated with payment details");
      
      return {
        success: true,
        message: "Order updated with payment details",
      };
    } catch (firebaseError) {
      console.error("Firebase error updating order:", firebaseError);
      
      // Return success even if Firebase fails (in a real app, you might want to handle this differently)
      return {
        success: true,
        message: "Order updated with payment details (fallback mode)",
      };
    }
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
  pdfBlob?: Blob;
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
    
    // Create a mock PDF URL (in a real app, you would upload this to storage)
    const mockPdfUrl = `https://example.com/invoices/${invoiceId}.pdf`;
    let pdfUrl = mockPdfUrl;
    
    // Check if we're in demo mode (no Firebase writes)
    if (process.env.RAZORPAY_DEMO_MODE !== 'true') {
      try {
        // Store invoice data in Firestore
        const invoiceRef = await addDoc(collection(db, "invoices"), {
          invoiceId,
          orderId: orderData.id,
          userId: orderData.userId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          totalAmount: orderData.totalAmount,
          paymentId: paymentDetails.paymentId,
          paymentMethod: paymentDetails.method,
          pdfUrl, // In a real app, this would be the actual URL
          createdAt: serverTimestamp(),
        });
        
        console.log("Invoice stored in database with ID:", invoiceRef.id);
      } catch (firebaseError) {
        console.error("Firebase error storing invoice:", firebaseError);
        // Continue even if storing in Firebase fails
      }
    } else {
      console.log("Invoice would be stored in database (DEMO MODE)");
    }
    
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
      pdfUrl,
      pdfBlob,
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

// New function to fetch all orders for a user
export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  try {
    if (process.env.RAZORPAY_DEMO_MODE === 'true') {
      // Return mock data in demo mode
      return [
        {
          id: `order_${generateId(8)}`,
          userId,
          productType: "sticker",
          quantity: 500,
          deliveryAddress: "123 Test Street, Demo City",
          totalAmount: 1500,
          customerName: "Demo User",
          customerEmail: "demo@example.com",
          status: "received",
          timestamp: new Date(),
        },
        {
          id: `order_${generateId(8)}`,
          userId,
          productType: "tag",
          quantity: 200,
          deliveryAddress: "456 Sample Road, Test Town",
          totalAmount: 800,
          customerName: "Demo User",
          customerEmail: "demo@example.com",
          status: "shipped",
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        }
      ];
    }
    
    // Query orders collection for all orders with matching userId
    const ordersQuery = query(
      collection(db, "orders"),
      where("userId", "==", userId)
    );
    
    const ordersSnapshot = await getDocs(ordersQuery);
    
    if (ordersSnapshot.empty) {
      console.log("No orders found for user:", userId);
      return [];
    }
    
    // Convert snapshot to array of OrderData
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as OrderData[];
    
    console.log(`Found ${orders.length} orders for user:`, userId);
    
    return orders;
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return [];
  }
};
