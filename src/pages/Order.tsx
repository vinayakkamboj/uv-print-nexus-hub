
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { generateId, isValidGSTIN } from "@/lib/utils";
import { AlertCircle, Upload } from "lucide-react";
import { createOrder, updateOrderAfterPayment, createAndSendInvoice } from "@/lib/invoice-service";
import { initializeRazorpay, createRazorpayOrder, processPayment } from "@/lib/payment-service";

const productTypes = [
  { value: "sticker", label: "Stickers & Labels" },
  { value: "tag", label: "Tags & Cards" },
  { value: "box", label: "Boxes & Cartons" },
  { value: "medicine_box", label: "Medicine Boxes" },
  { value: "custom", label: "Custom Packaging" },
];

// HSN codes for printing products
const hsnCodes = {
  sticker: "4821",     // Printed labels
  tag: "4821",         // Printed tags
  box: "4819",         // Cartons, boxes
  medicine_box: "4819", // Pharmaceutical packaging
  custom: "4911",      // Other printed matter
};

export default function Order() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [productType, setProductType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [specifications, setSpecifications] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [gstNumber, setGstNumber] = useState(userData?.gstNumber || "");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingStep, setProcessingStep] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    // Initialize Razorpay when component mounts
    initializeRazorpay()
      .then((success) => {
        if (!success) {
          console.error("Razorpay SDK failed to load");
        }
      })
      .catch(console.error);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const calculateEstimatedPrice = () => {
    if (!productType || !quantity) return 0;
    const basePrice = {
      sticker: 500,
      tag: 800,
      box: 1500,
      medicine_box: 2000,
      custom: 3000,
    }[productType] || 0;
    const qty = parseInt(quantity) || 0;
    if (qty <= 100) return basePrice;
    if (qty <= 500) return basePrice * 1.5;
    if (qty <= 1000) return basePrice * 2;
    return basePrice * 3;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productType || !quantity || !deliveryAddress) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (gstNumber && !isValidGSTIN(gstNumber)) {
      toast({
        title: "Error",
        description: "Please enter a valid GST number.",
        variant: "destructive",
      });
      return;
    }

    if (!file) {
      toast({
        title: "Error",
        description: "Please upload a design file.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setProcessingStep("Checking existing orders...");

      // Check if any previous orders are pending
      const orderQuery = query(
        collection(db, "orders"),
        where("userId", "==", user?.uid),
        where("status", "in", ["received", "processing"])
      );
      const existingOrders = await getDocs(orderQuery);

      if (!existingOrders.empty) {
        toast({
          title: "Action Denied",
          description:
            "You already have an active order. Please wait until it's completed or canceled.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Proceed to upload file
      setProcessingStep("Uploading your design file...");
      const fileId = generateId();
      const fileExtension = file.name.split(".").pop();
      const storageRef = ref(
        storage,
        `designs/${user?.uid}/${fileId}.${fileExtension}`
      );

      const uploadResult = await uploadBytes(storageRef, file);
      const fileUrl = await getDownloadURL(uploadResult.ref);

      const estimatedPrice = calculateEstimatedPrice();
      
      // Get HSN code based on product type
      const hsnCode = hsnCodes[productType as keyof typeof hsnCodes] || "4911";

      setProcessingStep("Creating your order...");
      const orderData = {
        userId: user?.uid || "",
        productType,
        quantity: parseInt(quantity),
        specifications,
        deliveryAddress,
        gstNumber,
        fileUrl,
        fileName: file.name,
        totalAmount: estimatedPrice,
        customerName: userData?.name || "Customer",
        customerEmail: userData?.email || "",
        hsnCode,
      };

      // Create initial order
      const orderResult = await createOrder(orderData);
      
      if (!orderResult.success || !orderResult.orderId) {
        throw new Error(orderResult.message);
      }
      
      setOrderId(orderResult.orderId);

      // Now proceed to payment
      setProcessingStep("Initiating payment...");
      setLoading(false);
      
      toast({
        title: "Order Created",
        description: "Proceed to payment to complete your order.",
      });
      
      // Start payment process
      handlePaymentProcess(orderResult.orderId, orderData);
      
    } catch (error) {
      console.error("Error placing order:", error);
      toast({
        title: "Error",
        description:
          "There was a problem submitting your order. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      setProcessingStep("");
    }
  };

  const handlePaymentProcess = async (createdOrderId: string, orderData: any) => {
    try {
      setPaymentProcessing(true);
      setProcessingStep("Setting up payment gateway...");
      
      // Create Razorpay order
      const razorpayOrder = await createRazorpayOrder(
        createdOrderId,
        orderData.totalAmount,
        orderData.customerName,
        orderData.customerEmail
      );
      
      setProcessingStep("Processing payment...");
      
      // Process the payment
      const paymentResult = await processPayment({
        orderId: createdOrderId,
        razorpayOrderId: razorpayOrder.id,
        amount: orderData.totalAmount,
        currency: "INR",
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        description: `Order for ${orderData.productType} Printing - Qty: ${orderData.quantity}`,
      });
      
      // Payment successful
      setProcessingStep("Updating order status...");
      
      // Update order with payment details
      await updateOrderAfterPayment(createdOrderId, paymentResult);
      
      // Generate and send invoice
      setProcessingStep("Generating invoice...");
      const invoiceResult = await createAndSendInvoice(
        { ...orderData, id: createdOrderId },
        paymentResult
      );
      
      setProcessingStep("Completing order...");
      
      let toastDescription = `Your order has been received and is being processed.`;
      
      if (invoiceResult.success) {
        toastDescription += " An invoice has been generated and sent to your email.";
      }
      
      toast({
        title: "Order Placed Successfully",
        description: toastDescription,
      });
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Payment processing error:", error);
      
      toast({
        title: "Payment Failed",
        description: "There was an issue with the payment. Please try again or contact support.",
        variant: "destructive",
      });
      
      // If we have an order ID but payment failed, we could delete the order
      // or mark it as payment_failed for the user to retry payment later
    } finally {
      setPaymentProcessing(false);
      setProcessingStep("");
    }
  };

  const estimatedPrice = calculateEstimatedPrice();
  
  return (
    <div className="container-custom py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Place an Order</h1>
        <p className="text-gray-600 mb-8">
          Fill in the details below to submit your printing request.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
                <CardDescription>
                  Please provide accurate specifications for your print job.
                </CardDescription>
              </CardHeader>
              {orderId && paymentProcessing ? (
                <CardContent className="space-y-6">
                  <div className="text-center py-10">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-t-4 border-primary mx-auto"></div>
                    <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
                    <p className="text-gray-500">{processingStep}</p>
                    <p className="text-sm mt-4">Please complete the payment in the Razorpay window.</p>
                  </div>
                </CardContent>
              ) : (
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="productType">Product Type</Label>
                      <Select
                        value={productType}
                        onValueChange={setProductType}
                        required
                      >
                        <SelectTrigger id="productType">
                          <SelectValue placeholder="Select product type" />
                        </SelectTrigger>
                        <SelectContent>
                          {productTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        placeholder="Enter quantity"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        min="1"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="specifications">Specifications</Label>
                      <Textarea
                        id="specifications"
                        placeholder="Enter details about size, colors, material, etc."
                        value={specifications}
                        onChange={(e) => setSpecifications(e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Upload Design File</Label>
                      <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <label className="w-full cursor-pointer">
                          <div className="flex flex-col items-center">
                            <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            <span className="text-gray-600 mb-1">
                              {file ? file.name : "Click to upload or drag and drop"}
                            </span>
                            <span className="text-xs text-gray-500">
                              PDF, PNG, JPG or AI (Max 20MB)
                            </span>
                          </div>
                          <Input
                            id="file"
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg,.ai"
                            onChange={handleFileChange}
                            className="hidden"
                            required
                          />
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gstNumber">GST Number</Label>
                      <Input
                        id="gstNumber"
                        placeholder="e.g., 05ABCDE1234F1Z1"
                        value={gstNumber}
                        onChange={(e) => setGstNumber(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress">Delivery Address</Label>
                      <Textarea
                        id="deliveryAddress"
                        placeholder="Enter full delivery address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button" onClick={() => navigate(-1)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white"></div>
                          {processingStep || "Processing..."}
                        </div>
                      ) : (
                        "Place Order"
                      )}
                    </Button>
                  </CardFooter>
                </form>
              )}
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="text-sm text-gray-500">Product Type</div>
                  <div className="font-medium">
                    {productType
                      ? productTypes.find((p) => p.value === productType)?.label
                      : "Not selected"}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-gray-500">Quantity</div>
                  <div className="font-medium">{quantity || "0"}</div>
                </div>

                <div className="pt-4 border-t">
                  <div className="text-sm text-gray-500">Estimated Price</div>
                  <div className="text-xl font-bold text-primary">
                    ₹{estimatedPrice.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    *Final price may vary based on specific requirements
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg mt-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0" />
                    <div className="text-sm text-blue-700">
                      After placing your order, you will be directed to complete the 
                      payment via our secure payment gateway. Once payment is completed, 
                      we will generate an invoice and send it to your email.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
