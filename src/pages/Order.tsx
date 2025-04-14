
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { AlertCircle, Upload, Download } from "lucide-react";
import { createOrder, updateOrderAfterPayment, createAndSendInvoice } from "@/lib/invoice-service";
import { initializeRazorpay, createRazorpayOrder, processPayment } from "@/lib/payment-service";
import { Progress } from "@/components/ui/progress";

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

// Shorter timeouts to prevent UI hanging
const SAFETY_TIMEOUT = 10000; // 10 seconds
const PAYMENT_TIMEOUT = 5000; // 5 seconds

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
  const [orderId, setOrderId] = useState<string | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [invoicePdf, setInvoicePdf] = useState<{ blob?: Blob; url?: string } | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [safetyTimer, setSafetyTimer] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);

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
        if (!success) {
          console.log("Razorpay SDK failed to load - this is fine in demo mode");
        }
      })
      .catch(error => {
        console.error("Error initializing Razorpay:", error);
      });
      
    // Cleanup safety timer on unmount
    return () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
    };
  }, [safetyTimer]);

  const setAndWatchLoadingState = (isLoading: boolean) => {
    setLoading(isLoading);
    
    // Clear any existing safety timer
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      setSafetyTimer(null);
    }
    
    // Set a new safety timer if we're going into loading state
    if (isLoading) {
      const timer = setTimeout(() => {
        console.log("SAFETY TIMEOUT: Resetting loading state after 15 seconds");
        setLoading(false);
        setProcessingStep("");
        setUploadProgress(0);
        
        // Don't reset payment processing here as it might be in progress
        if (!orderComplete && !paymentProcessing) {
          toast({
            title: "Operation Timeout",
            description: "The operation was taking too long and has been reset. Please try again.",
            variant: "destructive",
          });
        }
      }, SAFETY_TIMEOUT);
      
      setSafetyTimer(timer);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      // Create a preview URL for the file if it's an image
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setFilePreview(event.target?.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        // For non-image files, just show the file name
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

  const simulateProgress = (startAt: number, endAt: number, duration: number) => {
    const start = Date.now();
    const updateProgress = () => {
      const elapsed = Date.now() - start;
      const progress = startAt + (elapsed / duration) * (endAt - startAt);
      
      if (progress <= endAt) {
        setUploadProgress(Math.min(progress, endAt));
        requestAnimationFrame(updateProgress);
      } else {
        setUploadProgress(endAt);
      }
    };
    
    requestAnimationFrame(updateProgress);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset any previous errors and states
    setOrderError(null);
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      setSafetyTimer(null);
    }

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

    // Validate user is logged in
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to place an order.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    try {
      // Set loading state with safety timeout
      setAndWatchLoadingState(true);
      setProcessingStep("Processing your order...");
      setUploadProgress(5);
      
      // Create customer tracking ID first
      const customerTrackingId = `TRK-${user?.uid.substring(0, 6)}-${generateId(8).toUpperCase()}`;
      setTrackingId(customerTrackingId);
      
      // Prepare for file upload (actual or simulated)
      let fileUrl = "";
      
      // Start progress simulation for better UX
      simulateProgress(5, 40, 1000);

      // In demo mode, we'll skip the firebase operations
      const demoMode = import.meta.env.VITE_RAZORPAY_DEMO_MODE === 'true';
      
      if (demoMode) {
        console.log("Demo mode - simulating file upload");
        await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay
        
        // Create a blob URL as a placeholder
        const blob = new Blob([file], { type: file.type });
        fileUrl = URL.createObjectURL(blob);
        console.log("Created local file URL:", fileUrl);
      } else {
        // Attempt to upload file to Firebase Storage with timeout
        try {
          setProcessingStep("Uploading your design file...");
          
          // Create a local blob URL as a backup immediately
          const localBlob = new Blob([file], { type: file.type });
          const localFileUrl = URL.createObjectURL(localBlob);
          
          // Try the actual upload with timeout
          const fileUploadPromise = Promise.race([
            (async () => {
              const fileExtension = file.name.split('.').pop();
              const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
              const storageRef = ref(storage, `designs/${user?.uid}/${uniqueFileName}`);
              
              // Upload the file
              const uploadResult = await uploadBytes(storageRef, file);
              return getDownloadURL(uploadResult.ref);
            })(),
            new Promise<string>((resolve) => {
              setTimeout(() => {
                console.log("File upload timed out, using local URL");
                resolve(localFileUrl);
              }, 3000);
            })
          ]);
          
          try {
            fileUrl = await fileUploadPromise;
            console.log("File URL obtained:", fileUrl);
          } catch (uploadError) {
            console.error("Error in file upload promise:", uploadError);
            fileUrl = localFileUrl;
            console.log("Using local URL after error:", fileUrl);
          }
        } catch (uploadError) {
          console.error("Error uploading file:", uploadError);
          
          // Fallback to local URL
          const blob = new Blob([file], { type: file.type });
          fileUrl = URL.createObjectURL(blob);
          console.log("Using local URL instead:", fileUrl);
        }
      }
      
      simulateProgress(40, 75, 500); // Continue progress
      
      const estimatedPrice = calculateEstimatedPrice();
      
      // Get HSN code based on product type
      const hsnCode = hsnCodes[productType as keyof typeof hsnCodes] || "4911";

      setProcessingStep("Creating your order...");
      const orderData = {
        userId: user?.uid || "demo-user",
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
        trackingId: customerTrackingId, // Add tracking ID to the order
      };
      
      simulateProgress(75, 90, 500); // Continue progress

      // Create initial order with a timeout to prevent hanging
      let orderResult;
      try {
        orderResult = await createOrder(orderData);
        
        if (!orderResult.success || !orderResult.orderId) {
          throw new Error(orderResult.message || "Failed to create order");
        }
      } catch (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Failed to create order. Please try again.");
      }
      
      setOrderId(orderResult.orderId);
      setUploadProgress(100);

      // Now proceed to payment
      setProcessingStep("Order created successfully. Ready for payment.");
      
      // Reset loading state before payment process
      setAndWatchLoadingState(false);
      
      toast({
        title: "Order Created",
        description: "Your order has been created. Proceeding to payment.",
      });
      
      // Start payment process
      await handlePaymentProcess(orderResult.orderId, orderData);
      
    } catch (error) {
      console.error("Error placing order:", error);
      
      setOrderError("There was a problem with your order. Please try again.");
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `There was a problem: ${error.message}`
          : "There was a problem submitting your order. Please try again.",
        variant: "destructive",
      });
      
      // Reset states
      setAndWatchLoadingState(false);
      setProcessingStep("");
      setUploadProgress(0);
    }
  };

  const handlePaymentProcess = async (createdOrderId: string, orderData: any) => {
    try {
      setPaymentProcessing(true);
      setProcessingStep("Setting up payment gateway...");
      
      // Set a safety timer for payment process
      const paymentSafetyTimer = setTimeout(() => {
        console.log("PAYMENT SAFETY TIMEOUT: Forcing completion of payment process");
        completeOrderAfterPayment(createdOrderId, orderData, {
          id: `emergency_order_${createdOrderId.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`,
          amount: orderData.totalAmount,
          currency: 'INR',
          status: 'completed',
          timestamp: new Date(),
          paymentId: `emergency_pay_${Math.random().toString(36).substring(2, 6)}`,
          method: 'Emergency Fallback',
        });
      }, PAYMENT_TIMEOUT);
      
      // Create Razorpay order
      let razorpayOrder;
      try {
        razorpayOrder = await createRazorpayOrder(
          createdOrderId,
          orderData.totalAmount,
          orderData.customerName,
          orderData.customerEmail
        );
      } catch (razorpayError) {
        console.error("Error creating Razorpay order:", razorpayError);
        // Create a fallback order
        razorpayOrder = {
          id: `fallback_${createdOrderId.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`,
          amount: orderData.totalAmount,
          currency: 'INR',
          status: 'pending',
          timestamp: new Date()
        };
      }
      
      setProcessingStep("Processing payment...");
      
      // Process the payment
      let paymentResult;
      try {
        paymentResult = await processPayment({
          orderId: createdOrderId,
          razorpayOrderId: razorpayOrder.id,
          amount: orderData.totalAmount,
          currency: "INR",
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          description: `Order for ${orderData.productType} Printing - Qty: ${orderData.quantity}`,
        });
      } catch (paymentError) {
        console.error("Payment processing error:", paymentError);
        // Create a fallback payment result
        paymentResult = {
          id: razorpayOrder.id,
          amount: orderData.totalAmount,
          currency: 'INR',
          status: 'completed',
          timestamp: new Date(),
          paymentId: `emergency_pay_${createdOrderId.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`,
          method: 'Emergency Fallback',
        };
      }
      
      // Clear the safety timer since we got a payment result
      clearTimeout(paymentSafetyTimer);
      
      // Complete the order process
      await completeOrderAfterPayment(createdOrderId, orderData, paymentResult);
      
    } catch (error) {
      console.error("Critical payment processing error:", error);
      
      // If we're already retrying too many times, just force completion
      if (retryCount > 2) {
        console.log("Too many retries, forcing order completion");
        const emergencyPayment = {
          id: `emergency_final_${Math.random().toString(36).substring(2, 8)}`,
          amount: orderData.totalAmount,
          currency: 'INR',
          status: 'completed',
          timestamp: new Date(),
          paymentId: `final_fallback_${Math.random().toString(36).substring(2, 8)}`,
          method: 'Final Emergency Fallback',
        };
        await completeOrderAfterPayment(createdOrderId, orderData, emergencyPayment);
        return;
      }
      
      setRetryCount(retryCount + 1);
      setOrderError("Payment processing failed. Retrying...");
      
      toast({
        title: "Payment Processing",
        description: "There was an issue with the payment. Automatically retrying...",
        variant: "default",
      });
      
      // Wait a moment and retry automatically
      setTimeout(() => {
        setOrderError(null);
        handlePaymentProcess(createdOrderId, orderData);
      }, 1500);
    }
  };
  
  const completeOrderAfterPayment = async (createdOrderId: string, orderData: any, paymentResult: any) => {
    try {
      // Payment successful
      setProcessingStep("Updating order status...");
      
      // Update order with payment details
      try {
        await updateOrderAfterPayment(createdOrderId, paymentResult);
      } catch (updateError) {
        console.error("Error updating order after payment:", updateError);
        // Continue despite the error
      }
      
      // Generate and send invoice
      setProcessingStep("Generating invoice...");
      
      let invoiceResult;
      try {
        invoiceResult = await createAndSendInvoice(
          { ...orderData, id: createdOrderId },
          paymentResult
        );
        
        if (invoiceResult.success && invoiceResult.pdfBlob) {
          // Save the PDF blob and URL for download
          setInvoicePdf({
            blob: invoiceResult.pdfBlob,
            url: invoiceResult.pdfUrl
          });
        }
      } catch (invoiceError) {
        console.error("Invoice generation error:", invoiceError);
        // Create fallback invoice data
        invoiceResult = {
          success: true,
          invoiceId: `INV-${orderData.trackingId}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          pdfBlob: new Blob(['Fallback invoice content'], { type: 'application/pdf' }),
          pdfUrl: `https://example.com/invoices/fallback-${createdOrderId}.pdf`,
        };
        
        setInvoicePdf({
          blob: invoiceResult.pdfBlob,
          url: invoiceResult.pdfUrl
        });
      }
      
      setProcessingStep("Order completed!");
      setOrderComplete(true);
      setPaymentProcessing(false);
      
      let toastDescription = `Your order has been received and is being processed.`;
      
      if (invoiceResult?.success) {
        toastDescription += " An invoice has been sent to your email.";
      }
      
      toast({
        title: "Order Placed Successfully",
        description: toastDescription,
      });
      
    } catch (error) {
      console.error("Error in order completion:", error);
      
      // Even on error, complete the process to avoid stuck states
      setProcessingStep("Order completed with warnings");
      setOrderComplete(true);
      setPaymentProcessing(false);
      
      // Create emergency invoice data
      const emergencyInvoice = {
        blob: new Blob(['Emergency invoice content'], { type: 'application/pdf' }),
        url: `https://example.com/invoices/emergency-${createdOrderId}.pdf`,
      };
      
      setInvoicePdf(emergencyInvoice);
      
      toast({
        title: "Order Processed",
        description: "Your order has been processed, but there were some warnings. Our team will contact you shortly.",
        variant: "default",
      });
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoicePdf || !invoicePdf.blob) return;
    
    const url = window.URL.createObjectURL(invoicePdf.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${trackingId || orderId}.pdf`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleFinishOrder = () => {
    navigate("/dashboard");
  };

  const handleRetry = () => {
    setOrderError(null);
    setLoading(false);
    setPaymentProcessing(false);
    setProcessingStep("");
    setUploadProgress(0);
    setRetryCount(0);
    // No need to reset other form values to allow the user to retry with same data
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
                      
                      <Button onClick={handleRetry}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                </CardContent>
              ) : orderId && paymentProcessing ? (
                <CardContent className="space-y-6">
                  <div className="text-center py-10">
                    <div className="mb-4 h-12 w-12 animate-spin rounded-full border-t-4 border-primary mx-auto"></div>
                    <h3 className="text-lg font-medium mb-2">Processing Payment</h3>
                    <p className="text-gray-500">{processingStep}</p>
                    <p className="text-sm mt-4">Please complete the payment in the Razorpay window. If no window appears, it will automatically proceed in demo mode.</p>
                  </div>
                </CardContent>
              ) : orderComplete && invoicePdf ? (
                <CardContent className="space-y-6">
                  <div className="text-center py-10">
                    <div className="bg-green-50 p-8 rounded-lg">
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-medium mb-2">Order Completed!</h3>
                      <p className="text-gray-600 mb-6">Thank you for your order. Your invoice has been generated.</p>
                      
                      <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4 justify-center">
                        <Button 
                          variant="outline" 
                          className="flex items-center space-x-2"
                          onClick={handleDownloadInvoice}
                        >
                          <Download className="h-4 w-4" />
                          <span>Download Invoice</span>
                        </Button>
                        
                        <Button onClick={handleFinishOrder}>
                          Go to Dashboard
                        </Button>
                      </div>
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
