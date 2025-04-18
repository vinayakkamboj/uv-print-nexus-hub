// src/lib/invoice-generator.ts - Apply these changes to your existing file
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrency, formatDate } from './utils';

export interface InvoiceData {
  invoiceId: string;
  orderId: string;
  orderDate: Date;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  products: {
    name: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  gstNumber?: string;
  hsnCode?: string;
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("Starting PDF generation for invoice:", invoiceData.invoiceId);
      
      // Create a new PDF document (A4 size in mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      console.log("PDF document created, adding content...");
      
      // Add company header
      doc.setFontSize(20);
      doc.text('Micro UV Printers', doc.internal.pageSize.width / 2, 20, { align: 'center' });
      doc.setFontSize(10);
      doc.text('High Quality UV Printing Solutions', doc.internal.pageSize.width / 2, 25, { align: 'center' });
      
      // Company details (right aligned)
      doc.setFontSize(8);
      const rightMargin = doc.internal.pageSize.width - 20;
      doc.text('Micro UV Printers', rightMargin, 35, { align: 'right' });
      doc.text('123 Print Avenue, Industrial Area', rightMargin, 39, { align: 'right' });
      doc.text('Delhi, India - 110001', rightMargin, 43, { align: 'right' });
      doc.text('GSTIN: 06ABCDE1234F1Z5', rightMargin, 47, { align: 'right' });
      doc.text('Contact: +91 98765 43210', rightMargin, 51, { align: 'right' });
      
      // Invoice title
      doc.setFontSize(18);
      doc.text('TAX INVOICE', doc.internal.pageSize.width / 2, 60, { align: 'center' });
      
      console.log("Adding invoice details...");
      
      // Add a horizontal line
      doc.setDrawColor(170, 170, 170);
      doc.line(20, 65, doc.internal.pageSize.width - 20, 65);
      
      // Invoice details
      doc.setFontSize(10);
      doc.text(`Invoice Number: ${invoiceData.invoiceId}`, 20, 75);
      doc.text(`Date: ${formatDate(invoiceData.orderDate)}`, rightMargin, 75, { align: 'right' });
      doc.text(`Order Number: ${invoiceData.orderId}`, 20, 80);
      doc.text('Payment Status: PAID', rightMargin, 80, { align: 'right' });
      
      // Customer information
      doc.setFontSize(12);
      doc.text('Bill To:', 20, 90);
      doc.setFontSize(10);
      doc.text(`Name: ${invoiceData.customerName}`, 20, 95);
      doc.text(`Email: ${invoiceData.customerEmail}`, 20, 100);
      doc.text(`Address: ${invoiceData.customerAddress}`, 20, 105);
      
      if (invoiceData.gstNumber) {
        doc.text(`GSTIN: ${invoiceData.gstNumber}`, 20, 110);
      }
      
      console.log("Adding product table...");
      
      // Product table
      const tableStartY = invoiceData.gstNumber ? 120 : 115;
      
      try {
        autoTable(doc, {
          startY: tableStartY,
          head: [['Item', 'Description', 'HSN/SAC', 'Qty', 'Price', 'Amount']],
          body: invoiceData.products.map((item, index) => [
            index + 1,
            item.name,
            invoiceData.hsnCode || '4911',  // Default HSN code for printing items
            item.quantity,
            formatCurrency(item.price).replace('₹', '').trim(),
            formatCurrency(item.price * item.quantity).replace('₹', '').trim()
          ]),
          theme: 'grid',
          headStyles: { fillColor: [80, 80, 80] },
          margin: { left: 20, right: 20 },
          columnStyles: {
            0: { cellWidth: 10 },
            1: { cellWidth: 60 },
            2: { cellWidth: 20 },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 25, halign: 'right' },
            5: { cellWidth: 25, halign: 'right' }
          }
        });
      } catch (tableError) {
        console.error("Error creating table:", tableError);
        // Continue with a simplified table if there's an error
        doc.text("Product: " + invoiceData.products[0].name, 20, tableStartY + 10);
        doc.text("Quantity: " + invoiceData.products[0].quantity, 20, tableStartY + 20);
        doc.text("Price: " + formatCurrency(invoiceData.products[0].price), 20, tableStartY + 30);
      }
      
      console.log("Adding invoice summary...");
      
      // Get the ending Y position of the table
      const tableEndY = (doc as any).lastAutoTable?.finalY + 10 || (tableStartY + 40);
      
      // Summary
      doc.setFontSize(10);
      doc.text('Subtotal:', 130, tableEndY);
      doc.text(formatCurrency(invoiceData.totalAmount).replace('₹', '').trim(), rightMargin, tableEndY, { align: 'right' });
      
      doc.text('CGST (9%):', 130, tableEndY + 5);
      doc.text(formatCurrency(invoiceData.totalAmount * 0.09).replace('₹', '').trim(), rightMargin, tableEndY + 5, { align: 'right' });
      
      doc.text('SGST (9%):', 130, tableEndY + 10);
      doc.text(formatCurrency(invoiceData.totalAmount * 0.09).replace('₹', '').trim(), rightMargin, tableEndY + 10, { align: 'right' });
      
      doc.setFontSize(12);
      doc.text('Total:', 130, tableEndY + 17);
      doc.text(formatCurrency(invoiceData.totalAmount * 1.18).replace('₹', '').trim(), rightMargin, tableEndY + 17, { align: 'right' });
      
      // Terms and notes
      doc.setFontSize(10);
      doc.text('Terms & Notes', 20, tableEndY + 30);
      
      doc.setFontSize(8);
      doc.text('1. Payment is due within 15 days', 20, tableEndY + 35);
      doc.text('2. Please make payment to bank account: HDFC Bank - 12345678901234', 20, tableEndY + 40);
      doc.text('3. This is a computer-generated invoice and does not require a signature', 20, tableEndY + 45);
      
      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      doc.setFontSize(8);
      doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, footerY - 10, { align: 'center' });
      doc.text('For any queries, please contact: support@microuvprinters.com', doc.internal.pageSize.width / 2, footerY - 5, { align: 'center' });
      
      console.log("Generating final PDF blob...");
      
      // Convert to blob
      const pdfBlob = doc.output('blob');
      console.log("PDF blob created successfully:", pdfBlob.size, "bytes");
      resolve(pdfBlob);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Create a simple fallback PDF if the main generation fails
      try {
        console.log("Creating fallback PDF due to error...");
        const fallbackDoc = new jsPDF();
        fallbackDoc.text('Invoice #' + invoiceData.invoiceId, 10, 10);
        fallbackDoc.text('There was an error generating the complete invoice.', 10, 20);
        fallbackDoc.text('Please contact support.', 10, 30);
        const fallbackBlob = fallbackDoc.output('blob');
        console.log("Fallback PDF created:", fallbackBlob.size, "bytes");
        resolve(fallbackBlob);
      } catch (fallbackError) {
        console.error("Even fallback PDF failed:", fallbackError);
        reject(new Error("PDF generation failed completely"));
      }
    }
  });
};