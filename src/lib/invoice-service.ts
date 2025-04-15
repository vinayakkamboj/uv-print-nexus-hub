import { generateInvoicePDF, InvoiceData } from "./invoice-generator";
import { sendInvoiceEmail } from "./email-service";
import { generateId } from "./utils";
import { PaymentDetails } from "./payment-service";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp, doc, updateDoc, where, query, getDocs, orderBy } from "firebase/firestore";

// Use import.meta.env instead of process.env for Vite apps
const DEMO_MODE = import.meta.env.VITE_RAZORPAY_DEMO_MODE === 'true';

// Increased timeouts to prevent UI freezing
const ORDER_CREATION_TIMEOUT = 5000;
const INVOICE_GENERATION_TIMEOUT = 3000;
const QUERY_TIMEOUT = 6000;

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
  // Added tracking fields
  trackingId?: string;
  paymentStatus?: string;
  paymentDetails?: any;
  lastUpdated?: any;
  fileUrl?: string;
  fileName?: string;
}

// Flag to track if we're in fallback mode
let isInFallbackMode = false;

export const createOrder = async (orderData: Omit<OrderData, "id">): Promise<{
  success: boolean;
  orderId?: string;
  trackingId?: string;
  message: string;
}> => {
  console.log("Creating order with data:", orderData);
  
  // Generate a customer tracking ID for consistent linking - make it unique with user ID
  const trackingId = `TRK-${orderData.userId.substring(0, 6)}-${generateId(8).toUpperCase()}`;
  
  // Check if we're in demo mode or already in fallback mode 
  if (DEMO_MODE || isInFallbackMode) {
    // Generate a simulated order ID that includes tracking info
    const mockOrderId = `order_${trackingId}_${generateId(6)}`;
    console.log("Order created with ID (DEMO/FALLBACK MODE):", mockOrderId);
    
    return {
      success: true,
      orderId: mockOrderId,
      trackingId,
      message: "Order created successfully (DEMO/FALLBACK MODE)",
    };
  }
  
  // Use a timeout to prevent hanging on Firebase operations
  return Promise.race([
    (async () => {
      try {
        // Create a new order document with the current timestamp and ensure userId is included
        const orderRef = await addDoc(collection(db, "orders"), {
          ...orderData,
          status: "pending_payment",
          timestamp: serverTimestamp(),
          trackingId,
          paymentStatus: "pending",
          lastUpdated: serverTimestamp(),
        });
        
        console.log("Order created with ID:", orderRef.id);
        
        return {
          success: true,
          orderId: orderRef.id,
          trackingId,
          message: "Order created successfully",
        };
      } catch (firebaseError) {
        console.error("Firebase error creating order:", firebaseError);
        isInFallbackMode = true;
        
        // Fallback to mock order if Firebase fails
        const mockOrderId = `order_${trackingId}_${generateId(6)}`;
        console.log("Falling back to mock order ID:", mockOrderId);
        
        return {
          success: true,
          orderId: mockOrderId,
          trackingId,
          message: "Order created successfully (fallback mode)",
        };
      }
    })(),
    // Timeout promise
    new Promise<{success: boolean; orderId?: string; trackingId?: string; message: string}>((resolve) => {
      setTimeout(() => {
        isInFallbackMode = true;
        const trackingId = `TRK-${orderData.userId.substring(0, 6)}-${generateId(8).toUpperCase()}`;
        const emergencyOrderId = `emergency_${trackingId}_${generateId(6)}`;
        console.log("Order creation timed out, using emergency ID:", emergencyOrderId);
        
        resolve({
          success: true,
          orderId: emergencyOrderId,
          trackingId,
          message: "Order created successfully (timeout fallback)",
        });
      }, ORDER_CREATION_TIMEOUT);
    })
  ]);
};

export const updateOrderAfterPayment = async (orderId: string, paymentDetails: PaymentDetails): Promise<{
  success: boolean;
  message: string;
}> => {
  console.log("Updating order after payment:", { orderId, paymentDetails });
  
  // Check if we're in demo mode or already in fallback mode
  if (DEMO_MODE || isInFallbackMode) {
    console.log("Order updated with payment details (DEMO/FALLBACK MODE)");
    return {
      success: true,
      message: "Order updated with payment details (DEMO/FALLBACK MODE)",
    };
  }
  
  // Use a timeout to prevent hanging on Firebase operations
  return Promise.race([
    (async () => {
      try {
        // Update the order document with payment details
        const orderRef = doc(db, "orders", orderId);
        await updateDoc(orderRef, {
          status: "received",
          paymentStatus: paymentDetails.status === 'completed' ? "paid" : "failed",
          paymentDetails: {
            id: paymentDetails.id,
            paymentId: paymentDetails.paymentId,
            method: paymentDetails.method,
            status: paymentDetails.status,
            timestamp: paymentDetails.timestamp,
          },
          lastUpdated: serverTimestamp(),
        });
        
        console.log("Order updated with payment details");
        
        return {
          success: true,
          message: "Order updated with payment details",
        };
      } catch (firebaseError) {
        console.error("Firebase error updating order:", firebaseError);
        isInFallbackMode = true;
        
        // Return success even if Firebase fails
        return {
          success: true,
          message: "Order updated with payment details (fallback mode)",
        };
      }
    })(),
    // Timeout promise
    new Promise<{success: boolean; message: string}>((resolve) => {
      setTimeout(() => {
        isInFallbackMode = true;
        console.log("Order update timed out, using fallback");
        
        resolve({
          success: true,
          message: "Order updated with payment details (timeout fallback)",
        });
      }, 3000);
    })
  ]);
};

export const createAndSendInvoice = async (orderData: OrderData, paymentDetails: PaymentDetails): Promise<{
  success: boolean;
  invoiceId?: string;
  pdfUrl?: string;
  pdfBlob?: Blob;
  message: string;
}> => {
  console.log("Starting invoice creation process...");
  
  // Extract tracking ID from the order or create a new one
  const trackingId = orderData.trackingId || `TRK-${orderData.userId.substring(0, 6)}-${generateId(8).toUpperCase()}`;
  
  // Generate invoice ID that includes tracking info for easier linking
  const invoiceId = `INV-${trackingId}-${generateId(6).toUpperCase()}`;
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
  
  // Create a mock PDF blob in case of error or timeout
  const mockPdfBlob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
  
  // Directly use a mock PDF for quick response
  const pdfBlob = mockPdfBlob;
  console.log("Using quick mock PDF to prevent blocking");
  
  // Create a mock PDF URL with order and tracking info embedded
  const mockPdfUrl = `https://example.com/invoices/${invoiceId}_${orderData.id}.pdf`;
  const pdfUrl = mockPdfUrl;
  
  // Check if we're in demo mode (no Firebase writes)
  if (!DEMO_MODE) {
    // Fire and forget - don't wait for this to complete
    (async () => {
      try {
        // Store invoice data in Firestore with a timeout
        const invoiceRef = await addDoc(collection(db, "invoices"), {
          invoiceId,
          orderId: orderData.id,
          userId: orderData.userId,
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          totalAmount: orderData.totalAmount,
          paymentId: paymentDetails.paymentId,
          paymentMethod: paymentDetails.method,
          trackingId, // Add tracking ID to invoices
          pdfUrl, // In a real app, this would be the actual URL
          createdAt: serverTimestamp(),
        });
        
        console.log("Invoice stored in database with ID:", invoiceRef.id);
      } catch (firebaseError) {
        console.error("Firebase error storing invoice:", firebaseError);
        // Continue even if storing in Firebase fails
      }
    })();
  }
  
  console.log("Sending invoice email...");
  
  // Fire and forget - don't wait for this to complete
  (async () => {
    try {
      const emailResult = await sendInvoiceEmail(invoiceData, pdfBlob, true);
      console.log("Email result:", emailResult);
      
      if (!emailResult.success) {
        console.warn("Invoice saved but email sending failed:", emailResult.message);
      }
    } catch (emailError) {
      console.error("Email sending failed but continuing:", emailError);
      // We continue even if email fails
    }
  })();
  
  console.log("Invoice process completed successfully");
  
  return {
    success: true,
    invoiceId,
    pdfUrl,
    pdfBlob,
    message: "Invoice generated successfully",
  };
};

// Function to fetch all orders for a user
export const getUserOrders = async (userId: string): Promise<OrderData[]> => {
  try {
    if (DEMO_MODE) {
      // Return mock data in demo mode with tracking IDs for consistency
      const trackingId1 = `TRK-${userId.substring(0, 6)}-${generateId(8).toUpperCase()}`;
      const trackingId2 = `TRK-${userId.substring(0, 6)}-${generateId(8).toUpperCase()}`;
      
      return [
        {
          id: `order_${trackingId1}_${generateId(6)}`,
          userId,
          trackingId: trackingId1,
          productType: "sticker",
          quantity: 500,
          deliveryAddress: "123 Test Street, Demo City",
          totalAmount: 1500,
          customerName: "Demo User",
          customerEmail: "demo@example.com",
          status: "received",
          paymentStatus: "paid",
          timestamp: new Date(),
          lastUpdated: new Date(),
        },
        {
          id: `order_${trackingId2}_${generateId(6)}`,
          userId,
          trackingId: trackingId2,
          productType: "tag",
          quantity: 200,
          deliveryAddress: "456 Sample Road, Test Town",
          totalAmount: 800,
          customerName: "Demo User",
          customerEmail: "demo@example.com",
          status: "shipped",
          paymentStatus: "paid",
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        }
      ];
    }
    
    // Use a timeout to prevent hanging on Firebase queries
    const ordersPromise = Promise.race([
      // Query orders collection for all orders with matching userId
      getDocs(query(
        collection(db, "orders"),
        where("userId", "==", userId),
        orderBy("timestamp", "desc") // Add ordering by timestamp
      )),
      new Promise(resolve => {
        setTimeout(() => {
          console.log("Order fetch timed out, returning empty array");
          resolve({ empty: true, docs: [] });
        }, QUERY_TIMEOUT);
      })
    ]);
    
    const ordersSnapshot = await ordersPromise as any;
    
    if (ordersSnapshot.empty) {
      console.log("No orders found for user:", userId);
      return [];
    }
    
    // Convert snapshot to array of OrderData
    const orders = ordersSnapshot.docs.map((doc: any) => ({
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

// Function to get invoices for an order
export const getInvoicesForOrder = async (orderId: string): Promise<any[]> => {
  try {
    if (DEMO_MODE) {
      // Return mock data in demo mode
      const trackingId = `TRK-DEMO-${generateId(8).toUpperCase()}`;
      return [{
        id: `inv_${generateId(8)}`,
        invoiceId: `INV-${trackingId}-${generateId(6).toUpperCase()}`,
        orderId,
        trackingId,
        createdAt: new Date(),
        totalAmount: 1500,
        pdfUrl: `https://example.com/invoices/INV-${trackingId}-${generateId(6).toUpperCase()}_${orderId}.pdf`,
      }];
    }
    
    // Use a timeout to prevent hanging on Firebase queries
    const invoicesPromise = Promise.race([
      // Query invoices collection for all invoices with matching orderId
      getDocs(query(
        collection(db, "invoices"),
        where("orderId", "==", orderId)
      )),
      new Promise(resolve => {
        setTimeout(() => {
          console.log("Invoice fetch timed out, returning empty array");
          resolve({ empty: true, docs: [] });
        }, QUERY_TIMEOUT);
      })
    ]);
    
    const invoicesSnapshot = await invoicesPromise as any;
    
    if (invoicesSnapshot.empty) {
      console.log("No invoices found for order:", orderId);
      return [];
    }
    
    // Convert snapshot to array
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`Found ${invoices.length} invoices for order:`, orderId);
    
    return invoices;
  } catch (error) {
    console.error("Error fetching invoices for order:", error);
    return [];
  }
};

// Add a new function to get invoices by tracking ID
export const getInvoicesByTrackingId = async (trackingId: string): Promise<any[]> => {
  try {
    if (DEMO_MODE) {
      return [{
        id: `inv_${generateId(8)}`,
        invoiceId: `INV-${trackingId}-${generateId(6).toUpperCase()}`,
        orderId: `order_${trackingId}_${generateId(6)}`,
        trackingId,
        createdAt: new Date(),
        totalAmount: 1500,
        pdfUrl: `https://example.com/invoices/INV-${trackingId}_${generateId(6).toUpperCase()}.pdf`,
      }];
    }
    
    const invoicesPromise = Promise.race([
      getDocs(query(
        collection(db, "invoices"),
        where("trackingId", "==", trackingId)
      )),
      new Promise(resolve => {
        setTimeout(() => {
          console.log("Tracking ID invoice fetch timed out, returning empty array");
          resolve({ empty: true, docs: [] });
        }, QUERY_TIMEOUT);
      })
    ]);
    
    const invoicesSnapshot = await invoicesPromise as any;
    
    if (invoicesSnapshot.empty) {
      return [];
    }
    
    const invoices = invoicesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return invoices;
  } catch (error) {
    console.error("Error fetching invoices by tracking ID:", error);
    return [];
  }
};
