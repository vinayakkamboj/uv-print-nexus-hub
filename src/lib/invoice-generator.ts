
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
  trackingId?: string;
}

export const generateInvoicePDF = async (invoiceData: InvoiceData): Promise<{ blob: Blob; url: string }> => {
  return new Promise((resolve, reject) => {
    try {
      console.log("🧾 Generating PDF invoice for:", invoiceData.invoiceId);
      
      // Create a new PDF document
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      
      // Header - Company Info
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text('Micro UV Printers', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text('High Quality UV Printing Solutions', pageWidth / 2, 30, { align: 'center' });
      doc.text('123 Print Avenue, Industrial Area, Delhi, India - 110001', pageWidth / 2, 35, { align: 'center' });
      doc.text('Phone: +91 98765 43210 | Email: info@microuvprinters.com', pageWidth / 2, 40, { align: 'center' });
      
      // Invoice Title
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text('INVOICE', pageWidth / 2, 55, { align: 'center' });
      
      // Invoice Details Box
      doc.setDrawColor(200, 200, 200);
      doc.rect(20, 65, pageWidth - 40, 30);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`Invoice ID: ${invoiceData.invoiceId}`, 25, 75);
      doc.text(`Date: ${formatDate(invoiceData.orderDate)}`, 25, 82);
      doc.text(`Order ID: ${invoiceData.orderId}`, 25, 89);
      
      if (invoiceData.trackingId) {
        doc.text(`Tracking ID: ${invoiceData.trackingId}`, pageWidth - 25, 75, { align: 'right' });
      }
      doc.text('Payment Status: PAID', pageWidth - 25, 82, { align: 'right' });
      doc.text('Order Status: Confirmed', pageWidth - 25, 89, { align: 'right' });
      
      // Customer Information
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text('Bill To:', 20, 110);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const customerInfo = [
        `Name: ${invoiceData.customerName}`,
        `Email: ${invoiceData.customerEmail}`,
        `Address: ${invoiceData.customerAddress}`
      ];
      
      if (invoiceData.gstNumber) {
        customerInfo.push(`GSTIN: ${invoiceData.gstNumber}`);
      }
      
      let yPosition = 118;
      customerInfo.forEach(info => {
        doc.text(info, 20, yPosition);
        yPosition += 6;
      });
      
      // Products Table
      const tableStartY = yPosition + 10;
      
      const tableData = invoiceData.products.map((item, index) => [
        (index + 1).toString(),
        item.name,
        invoiceData.hsnCode || '4911',
        item.quantity.toString(),
        formatCurrency(item.price).replace('₹', '').trim(),
        formatCurrency(item.price * item.quantity).replace('₹', '').trim()
      ]);
      
      autoTable(doc, {
        startY: tableStartY,
        head: [['#', 'Description', 'HSN/SAC', 'Qty', 'Rate (₹)', 'Amount (₹)']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [41, 128, 185],
          textColor: 255,
          fontStyle: 'bold'
        },
        margin: { left: 20, right: 20 },
        columnStyles: {
          0: { cellWidth: 15, halign: 'center' },
          1: { cellWidth: 70 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 15, halign: 'center' },
          4: { cellWidth: 25, halign: 'right' },
          5: { cellWidth: 25, halign: 'right' }
        }
      });
      
      // Summary calculations
      const subtotal = invoiceData.totalAmount;
      const cgst = subtotal * 0.09;
      const sgst = subtotal * 0.09;
      const total = subtotal + cgst + sgst;
      
      // Get the ending Y position of the table
      const tableEndY = (doc as any).lastAutoTable?.finalY + 10 || (tableStartY + 60);
      
      // Summary Box
      const summaryStartY = tableEndY;
      doc.setDrawColor(200, 200, 200);
      doc.rect(pageWidth - 80, summaryStartY, 60, 35);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.text('Subtotal:', pageWidth - 75, summaryStartY + 8);
      doc.text(`₹${subtotal.toFixed(2)}`, pageWidth - 25, summaryStartY + 8, { align: 'right' });
      
      doc.text('CGST (9%):', pageWidth - 75, summaryStartY + 15);
      doc.text(`₹${cgst.toFixed(2)}`, pageWidth - 25, summaryStartY + 15, { align: 'right' });
      
      doc.text('SGST (9%):', pageWidth - 75, summaryStartY + 22);
      doc.text(`₹${sgst.toFixed(2)}`, pageWidth - 25, summaryStartY + 22, { align: 'right' });
      
      doc.setFont("helvetica", "bold");
      doc.text('Total:', pageWidth - 75, summaryStartY + 30);
      doc.text(`₹${total.toFixed(2)}`, pageWidth - 25, summaryStartY + 30, { align: 'right' });
      
      // Terms and Conditions
      const termsY = summaryStartY + 50;
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text('Terms & Conditions:', 20, termsY);
      
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const terms = [
        '• Payment has been received and confirmed.',
        '• This invoice is computer generated and does not require a signature.',
        '• For any queries, please contact our support team.',
        '• Delivery will be initiated within 2-3 business days.',
        '• Quality guarantee: 100% satisfaction or money back.'
      ];
      
      let termsYPos = termsY + 8;
      terms.forEach(term => {
        doc.text(term, 20, termsYPos);
        termsYPos += 5;
      });
      
      // Footer
      const footerY = pageHeight - 20;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.text('Thank you for choosing Micro UV Printers!', pageWidth / 2, footerY - 10, { align: 'center' });
      doc.text('For support: support@microuvprinters.com | +91 98765 43210', pageWidth / 2, footerY - 5, { align: 'center' });
      
      // Generate PDF
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      
      console.log("✅ PDF invoice generated successfully:", pdfBlob.size, "bytes");
      resolve({ blob: pdfBlob, url: pdfUrl });
      
    } catch (error) {
      console.error('❌ Error generating PDF invoice:', error);
      reject(error);
    }
  });
};

export const downloadInvoice = (invoiceData: InvoiceData) => {
  generateInvoicePDF(invoiceData)
    .then(({ url }) => {
      const link = document.createElement('a');
      link.href = url;
      link.download = `Invoice_${invoiceData.invoiceId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    })
    .catch(error => {
      console.error('Error downloading invoice:', error);
    });
};
