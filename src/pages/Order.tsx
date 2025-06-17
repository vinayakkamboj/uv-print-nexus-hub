import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
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
import { AlertCircle, Upload, Download } from "lucide-react";
import { createOrder, updateOrderAfterPayment, createAndSendInvoice, SimpleOrderData } from "@/lib/invoice-service";
import { initializeRazorpay, createRazorpayOrder, processPayment } from "@/lib/payment-service";
import { Progress } from "@/components/ui/progress";
import { Timestamp } from "firebase/firestore";

const productTypes = [
  { value: "sticker", label: "Stickers & Labels" },
  { value: "tag", label: "Tags & Cards" },
  { value: "box", label: "Boxes & Cartons" },
  { value: "medicine_box", label: "Medicine Boxes" },
  { value: "custom", label: "Custom Packaging" },
];

const hsnCodes = {
  sticker: "4821",
  tag: "4821",
  box: "4819",
  medicine_box: "4819",
  custom: "4911",
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
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState("");
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  useEffect(() => {
    if (userData?.gstNumber) {
      setGstNumber(userData.gstNumber);
    }
    if (userData?.address) {
      setDeliveryAddress(userData.address);
    }
  }, [userData]);

  useEffect(() => {
    // Initialize Razorpay when the component mounts
    initializeRazorpay()
      .then((success) => {
        console.log("Razorpay initialization result:", success);
      })
      .catch(error => {
        console.error("Error initializing Razorpay:", error);
      });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
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
    
    console.log("🚀 Starting order submission...");
    setOrderError(null);
    setOrderComplete(false);

    // Basic validation
    if (!productType || !quantity || !deliveryAddress || !file || !user) {
      console.log("❌ Validation failed");
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (gstNumber && !isValidGSTIN(gstNumber)) {
      console.log("❌ Invalid GST number");
      toast({
        title: "Error",
        description: "Please enter a valid GST number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    setUploadProgress(10);
    setProcessingStep("Starting order creation...");

    try {
      console.log("📦 Step 1: Preparing order data");
      setUploadProgress(20);
      setProcessingStep("Preparing order data...");

      const estimatedPrice = calculateEstimatedPrice();
      const customerTrackingId = `TRK-${user.uid.substring(0, 6)}-${generateId(8).toUpperCase()}`;
      const hsnCode = hsnCodes[productType as keyof typeof hsnCodes] || "4911";

      // Handle file upload
      console.log("📁 Step 2: Uploading file");
      setUploadProgress(40);
      setProcessingStep("Uploading design file...");
      
      let fileUrl = "";
      const demoMode = import.meta.env.VITE_RAZORPAY_DEMO_MODE === 'true';
      
      if (demoMode) {
        console.log("Demo mode - using local file URL");
        const blob = new Blob([file], { type: file.type });
        fileUrl = URL.createObjectURL(blob);
      } else {
        try {
          const fileExtension = file.name.split('.').pop();
          const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
          const storageRef = ref(storage, `designs/${user.uid}/${uniqueFileName}`);
          
          const uploadResult = await uploadBytes(storageRef, file);
          fileUrl = await getDownloadURL(uploadResult.ref);
          console.log("✅ File uploaded successfully");
        } catch (uploadError) {
          console.error("File upload failed, using local URL:", uploadError);
          const blob = new Blob([file], { type: file.type });
          fileUrl = URL.createObjectURL(blob);
        }
      }

      // Create order data
      console.log("🗃️ Step 3: Creating order in database");
      setUploadProgress(60);
      setProcessingStep("Creating order...");

      const orderData = {
        userId: user.uid,
        productType,
        quantity: parseInt(quantity),
        specifications,
        deliveryAddress,
        gstNumber,
        fileUrl,
        fileName: file.name,
        totalAmount: estimatedPrice,
        customerName: userData?.name || user?.displayName || "Customer",
        customerEmail: userData?.email || user?.email || "customer@example.com",
        hsnCode,
        trackingId: customerTrackingId,
      };

      const orderResult = await createOrder(orderData);
      
      if (!orderResult.success || !orderResult.orderId) {
        throw new Error(orderResult.message || "Failed to create order");
      }

      console.log("✅ Order created successfully:", orderResult.orderId);
      
      // Process payment
      console.log("💳 Step 4: Processing payment");
      setUploadProgress(80);
      setProcessingStep("Processing payment...");

      const razorpayOrder = await createRazorpayOrder(
        orderResult.orderId,
        estimatedPrice,
        orderData.customerName,
        orderData.customerEmail
      );

      console.log("💳 Razorpay order created:", razorpayOrder.id);

      const paymentResult = await processPayment({
        orderId: orderResult.orderId,
        razorpayOrderId: razorpayOrder.id,
        amount: estimatedPrice,
        currency: "INR",
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        description: `Order for ${orderData.productType} Printing - Qty: ${orderData.quantity}`,
        userId: orderData.userId,
        productType: orderData.productType,
        quantity: orderData.quantity,
        deliveryAddress: orderData.deliveryAddress
      });

      console.log("💳 Payment result:", paymentResult);

      if (paymentResult.status === 'completed' && paymentResult.paymentId) {
        console.log("✅ Step 5: Payment successful, finalizing order");
        setUploadProgress(95);
        setProcessingStep("Payment successful! Finalizing order...");
        
        // Update order with payment success
        await updateOrderAfterPayment(orderResult.orderId, paymentResult.paymentId);
        
        // Create complete order data for invoice
        const completeOrderData: SimpleOrderData = {
          id: orderResult.orderId,
          ...orderData,
          status: 'received',
          paymentStatus: 'paid',
          timestamp: Timestamp.now(),
          razorpayPaymentId: paymentResult.paymentId,
          paymentCompletedAt: Timestamp.now(),
          lastUpdated: Timestamp.now()
        };
        
        // Generate invoice
        console.log("📄 Generating invoice");
        await createAndSendInvoice(completeOrderData);
        
        setUploadProgress(100);
        setProcessingStep("Order completed successfully!");
        setOrderComplete(true);
        
        console.log("🎉 Order process completed successfully!");
        
        toast({
          title: "Order Placed Successfully",
          description: "Your order has been received and payment processed. An invoice has been sent to your email.",
        });
        
      } else {
        throw new Error("Payment was not completed successfully");
      }
      
    } catch (error) {
      console.error("❌ Order submission error:", error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to process order";
      setOrderError(errorMessage);
      
      toast({
        title: "Order Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      if (!orderComplete) {
        setUploadProgress(0);
        setProcessingStep("");
      }
    }
  };

  const handleFinishOrder = () => {
    navigate("/dashboard");
  };

  const handleRetry = () => {
    console.log("🔄 Retrying order creation");
    setOrderError(null);
    setLoading(false);
    setProcessingStep("");
    setUploadProgress(0);
    setOrderComplete(false);
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
              {orderError ? (
                <CardContent className="space-y-6">
                  <div className="text-center py-10">
                    <div className="bg-red-50 p-8 rounded-lg">
                      <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8" />
                      </div>
                      <h3 className="text-xl font-medium mb-2">Order Processing Error</h3>
                      <p className="text-gray-600 mb-6">{orderError}</p>
                      
                      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                        <Button onClick={handleRetry}>
                          Try Again
                        </Button>
                        <Button variant="outline" onClick={() => navigate("/dashboard")}>
                          Go to Dashboard
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              ) : orderComplete ? (
                <CardContent className="space-y-6">
                  <div className="text-center py-10">
                    <div className="bg-green-50 p-8 rounded-lg">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium mb-2">Order Completed!</h3>
                      <p className="text-gray-600 mb-6">Thank you for your order. Your payment has been processed and an invoice has been sent to your email.</p>
                      
                      <Button onClick={handleFinishOrder}>
                        Go to Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : (
                <form onSubmit={handleSubmit}>
                  <CardContent className="space-y-6">
                    {loading && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">{processingStep}</p>
                        <Progress value={uploadProgress} className="h-2" />
                        <p className="text-xs text-gray-500 mt-1">Please wait, do not refresh the page...</p>
                      </div>
                    )}
                    
                    
                    
                    <div className="space-y-2">
                      <Label htmlFor="productType">Product Type</Label>
                      <Select
                        value={productType}
                        onValueChange={setProductType}
                        disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="file">Upload Design File</Label>
                      <div className={`flex items-center justify-center border-2 border-dashed ${loading ? 'border-gray-200 bg-gray-50' : 'border-gray-300'} rounded-lg p-6`}>
                        <label className={`w-full ${loading ? '' : 'cursor-pointer'}`}>
                          <div className="flex flex-col items-center">
                            {filePreview ? (
                              <img src={filePreview} alt="Preview" className="h-24 object-contain mb-2" />
                            ) : (
                              <Upload className="h-10 w-10 text-gray-400 mb-2" />
                            )}
                            <span className="text-gray-600 mb-1 text-center">
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
                            disabled={loading}
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
                        disabled={loading}
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
                        disabled={loading}
                        required
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" type="button" onClick={() => navigate(-1)} disabled={loading}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={loading}>
                      {loading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-t-2 border-white"></div>
                          Processing...
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
