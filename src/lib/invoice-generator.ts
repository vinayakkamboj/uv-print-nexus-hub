
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
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<Blob> => {
  return new Promise((resolve) => {
    try {
      // Create a new PDF document (A4 size in mm)
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
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
      doc.text('GSTIN: 07AABCU9603R1ZP', rightMargin, 47, { align: 'right' });
      doc.text('Contact: +91 98765 43210', rightMargin, 51, { align: 'right' });
      
      // Invoice title
      doc.setFontSize(18);
      doc.text('TAX INVOICE', doc.internal.pageSize.width / 2, 60, { align: 'center' });
      
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
      
      // Product table
      const tableStartY = invoiceData.gstNumber ? 120 : 115;
      
      autoTable(doc, {
        startY: tableStartY,
        head: [['Item', 'Description', 'Qty', 'Price', 'Amount']],
        body: invoiceData.products.map((item, index) => [
          index + 1,
          item.name,
          item.quantity,
          formatCurrency(item.price).replace('₹', '').trim(),
          formatCurrency(item.price * item.quantity).replace('₹', '').trim()
        ]),
        theme: 'grid',
        headStyles: { fillColor: [80, 80, 80] },
        margin: { left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 15 },
          1: { cellWidth: 80 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 30, halign: 'right' }
        }
      });
      
      // Summary
      const tableEndY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text('Subtotal:', 130, tableEndY);
      doc.text(formatCurrency(invoiceData.totalAmount).replace('₹', '').trim(), rightMargin, tableEndY, { align: 'right' });
      
      doc.text('GST (18%):', 130, tableEndY + 5);
      doc.text(formatCurrency(invoiceData.totalAmount * 0.18).replace('₹', '').trim(), rightMargin, tableEndY + 5, { align: 'right' });
      
      doc.setFontSize(12);
      doc.text('Total:', 130, tableEndY + 12);
      doc.text(formatCurrency(invoiceData.totalAmount * 1.18).replace('₹', '').trim(), rightMargin, tableEndY + 12, { align: 'right' });
      
      // Terms and notes
      doc.setFontSize(10);
      doc.text('Terms & Notes', 20, tableEndY + 25);
      
      doc.setFontSize(8);
      doc.text('1. Payment is due within 15 days', 20, tableEndY + 30);
      doc.text('2. Please make payment to bank account: HDFC Bank - 12345678901234', 20, tableEndY + 35);
      doc.text('3. This is a computer-generated invoice and does not require a signature', 20, tableEndY + 40);
      
      // Footer
      const footerY = doc.internal.pageSize.height - 20;
      doc.setFontSize(8);
      doc.text('Thank you for your business!', doc.internal.pageSize.width / 2, footerY - 10, { align: 'center' });
      doc.text('For any queries, please contact: support@microuvprinters.com', doc.internal.pageSize.width / 2, footerY - 5, { align: 'center' });
      
      // Convert to blob
      const pdfBlob = doc.output('blob');
      resolve(pdfBlob);
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Create a simple fallback PDF if the main generation fails
      const fallbackDoc = new jsPDF();
      fallbackDoc.text('Invoice #' + invoiceData.invoiceId, 10, 10);
      fallbackDoc.text('There was an error generating the complete invoice.', 10, 20);
      fallbackDoc.text('Please contact support.', 10, 30);
      const fallbackBlob = fallbackDoc.output('blob');
      resolve(fallbackBlob);
    }
  });
};
