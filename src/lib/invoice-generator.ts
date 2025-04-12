
import PDFDocument from 'pdfkit';
import blobStream from 'blob-stream';
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
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    try {
      // Create a new PDF document
      const doc = new PDFDocument({ margin: 50 });
      const stream = doc.pipe(blobStream());
      
      // Company header
      doc.fontSize(20).text('Micro UV Printers', { align: 'center' });
      doc.fontSize(10).text('High Quality UV Printing Solutions', { align: 'center' });
      doc.moveDown();
      
      // Company details
      doc.fontSize(8)
         .text('Micro UV Printers', { align: 'right' })
         .text('123 Print Avenue, Industrial Area', { align: 'right' })
         .text('Delhi, India - 110001', { align: 'right' })
         .text('GSTIN: 07AABCU9603R1ZP', { align: 'right' })
         .text('Contact: +91 98765 43210', { align: 'right' })
         .moveDown();
      
      // Invoice title and number
      doc.fontSize(18).text('TAX INVOICE', { align: 'center' });
      doc.moveDown();
      
      // Add a horizontal line
      doc.strokeColor('#aaaaaa')
         .lineWidth(1)
         .moveTo(50, doc.y)
         .lineTo(doc.page.width - 50, doc.y)
         .stroke();
      
      doc.moveDown();
      
      // Invoice details
      doc.fontSize(10)
         .text(`Invoice Number: ${invoiceData.invoiceId}`, { continued: true })
         .text(`Date: ${formatDate(invoiceData.orderDate)}`, { align: 'right' })
         .text(`Order Number: ${invoiceData.orderId}`, { continued: true })
         .text(`Payment Status: PAID`, { align: 'right' })
         .moveDown(2);
      
      // Customer information
      doc.fontSize(12).text('Bill To:');
      doc.fontSize(10)
         .text(`Name: ${invoiceData.customerName}`)
         .text(`Email: ${invoiceData.customerEmail}`)
         .text(`Address: ${invoiceData.customerAddress}`);
      
      if (invoiceData.gstNumber) {
        doc.text(`GSTIN: ${invoiceData.gstNumber}`);
      }
      
      doc.moveDown(2);
      
      // Table header
      const tableTop = doc.y;
      const itemX = 50;
      const descriptionX = 150;
      const quantityX = 350;
      const priceX = 400;
      const amountX = 480;
      
      doc.fontSize(10)
         .text('Item', itemX, tableTop)
         .text('Description', descriptionX, tableTop)
         .text('Qty', quantityX, tableTop)
         .text('Price', priceX, tableTop)
         .text('Amount', amountX, tableTop);
      
      // Add a horizontal line
      doc.strokeColor('#aaaaaa')
         .lineWidth(1)
         .moveTo(50, doc.y + 5)
         .lineTo(doc.page.width - 50, doc.y + 5)
         .stroke();
      
      doc.moveDown();
      
      // Table rows
      let i = 0;
      invoiceData.products.forEach(item => {
        const y = doc.y + (i * 20);
        doc.fontSize(10)
           .text(`${i + 1}`, itemX, y)
           .text(item.name, descriptionX, y)
           .text(item.quantity.toString(), quantityX, y)
           .text(formatCurrency(item.price), priceX, y)
           .text(formatCurrency(item.price * item.quantity), amountX, y);
        i++;
      });
      
      // Add a horizontal line
      doc.strokeColor('#aaaaaa')
         .lineWidth(1)
         .moveTo(50, doc.y + 10)
         .lineTo(doc.page.width - 50, doc.y + 10)
         .stroke();
      
      doc.moveDown(2);
      
      // Summary
      doc.fontSize(10)
         .text('Subtotal:', 350, doc.y)
         .text(formatCurrency(invoiceData.totalAmount), { align: 'right' })
         .text('GST (18%):', 350)
         .text(formatCurrency(invoiceData.totalAmount * 0.18), { align: 'right' })
         .fontSize(12)
         .text('Total:', 350)
         .text(formatCurrency(invoiceData.totalAmount * 1.18), { align: 'right' })
         .moveDown(2);
      
      // Terms and notes
      doc.fontSize(10)
         .text('Terms & Notes', { underline: true })
         .fontSize(8)
         .text('1. Payment is due within 15 days')
         .text('2. Please make payment to bank account: HDFC Bank - 12345678901234')
         .text('3. This is a computer-generated invoice and does not require a signature')
         .moveDown(2);
      
      // Footer
      const footerY = doc.page.height - 100;
      doc.fontSize(8)
         .text('Thank you for your business!', 50, footerY, { align: 'center' })
         .text('For any queries, please contact: support@microuvprinters.com', 50, footerY + 15, { align: 'center' });
      
      // Finalize the PDF
      doc.end();
      
      stream.on('finish', () => {
        const blob = stream.toBlob('application/pdf');
        resolve(blob);
      });
      
      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      reject(error);
    }
  });
};
