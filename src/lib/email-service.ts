// src/lib/email-service.ts
import { InvoiceData } from './invoice-generator';

export const sendInvoiceEmail = async (
  invoiceData: InvoiceData,
  pdfBlob: Blob,
  sendToOwner: boolean = true
): Promise<{success: boolean; message: string}> => {
  try {
    console.log('=== EMAIL SIMULATION ===');
    console.log('Sending invoice email to:', invoiceData.customerEmail);
    if (sendToOwner) {
      console.log('Sending copy to owner:', 'laxmankamboj@gmail.com');
    }
    console.log('Invoice ID:', invoiceData.invoiceId);
    console.log('Order ID:', invoiceData.orderId);
    console.log('Customer:', invoiceData.customerName);
    console.log('Total Amount:', invoiceData.totalAmount);
    
    // Check if the PDF blob is valid
    if (!pdfBlob || pdfBlob.size === 0) {
      console.warn('Warning: PDF blob is empty or invalid');
    } else {
      console.log('PDF size:', pdfBlob.size, 'bytes');
    }
    
    console.log('=== END EMAIL SIMULATION ===');
    
    // Simulate successful email sending for demo purposes
    // Shorter timeout to avoid long waits
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return {
      success: true,
      message: 'Invoice email sent successfully (simulated)'
    };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    // Don't let this failure block the entire process
    return {
      success: false,
      message: `Failed to send invoice email: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};