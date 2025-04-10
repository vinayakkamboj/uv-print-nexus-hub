
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDate, formatCurrency } from "@/lib/utils";
import { FileText, Download, Search } from "lucide-react";

interface Invoice {
  id: string;
  orderId: string;
  orderName: string;
  createdAt: any;
  dueDate: any;
  totalAmount: number;
  paidAmount: number;
  status: "paid" | "pending" | "overdue";
  pdfUrl: string;
}

export default function Billing() {
  const { user, userData } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchInvoices = async () => {
      if (!user?.uid) return;

      try {
        const invoicesQuery = query(
          collection(db, "invoices"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        
        // This is just simulated data for demonstration
        // In a real app, we would fetch from Firestore
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Simulate invoices data
        const mockInvoices: Invoice[] = [
          {
            id: "INV20230001",
            orderId: "ORD20230001",
            orderName: "Medicine Box Printing",
            createdAt: new Date(2023, 10, 5),
            dueDate: new Date(2023, 10, 19),
            totalAmount: 12500,
            paidAmount: 12500,
            status: "paid",
            pdfUrl: "/invoices/invoice-1.pdf"
          },
          {
            id: "INV20230002",
            orderId: "ORD20230002",
            orderName: "Product Labels (500 pcs)",
            createdAt: new Date(2023, 10, 12),
            dueDate: new Date(2023, 10, 26),
            totalAmount: 8500,
            paidAmount: 8500,
            status: "paid",
            pdfUrl: "/invoices/invoice-2.pdf"
          },
          {
            id: "INV20230003",
            orderId: "ORD20230003",
            orderName: "Packaging Cartons",
            createdAt: new Date(2023, 11, 18),
            dueDate: new Date(2024, 0, 1),
            totalAmount: 22000,
            paidAmount: 0,
            status: "pending",
            pdfUrl: "/invoices/invoice-3.pdf"
          }
        ];
        
        setInvoices(mockInvoices);
      } catch (error) {
        console.error("Error fetching invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [user]);
  
  // Filter invoices based on search term
  const filteredInvoices = invoices.filter(
    invoice => 
      invoice.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.orderName.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-3xl font-bold mb-2">Billing & Invoices</h1>
      <p className="text-gray-600 mb-8">
        Manage and download your invoices for all print orders.
      </p>
      
      {/* Search */}
      <div className="relative max-w-md mb-6">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
          placeholder="Search invoices by ID, order number or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {/* Invoices List */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-primary border-solid"></div>
        </div>
      ) : filteredInvoices.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredInvoices.map((invoice) => (
            <Card key={invoice.id} className="overflow-hidden">
              <div className={`h-2 ${invoice.status === 'paid' ? 'bg-green-500' : invoice.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between items-center">
                  <span className="font-mono text-lg">{invoice.id}</span>
                  <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${getStatusColor(invoice.status)}`}>
                    {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                  </span>
                </CardTitle>
                <CardDescription>Order: {invoice.orderId}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Order Name</div>
                  <div className="font-medium">{invoice.orderName}</div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Issue Date</div>
                    <div>{formatDate(invoice.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Due Date</div>
                    <div>{formatDate(invoice.dueDate)}</div>
                  </div>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-sm text-gray-500">Amount</div>
                      <div className="text-lg font-bold text-primary">
                        {formatCurrency(invoice.totalAmount)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Paid</div>
                      <div className={invoice.status === 'paid' ? 'text-green-600 font-semibold' : 'text-gray-600'}>
                        {formatCurrency(invoice.paidAmount)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <a
                  href={invoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                >
                  <Button variant="outline" className="w-full">
                    <Download className="h-4 w-4 mr-2" />
                    Download Invoice
                  </Button>
                </a>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Invoices Found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? `No results for "${searchTerm}"` : "You don't have any invoices yet."}
          </p>
          {searchTerm && (
            <Button
              variant="outline"
              onClick={() => setSearchTerm("")}
            >
              Clear Search
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
