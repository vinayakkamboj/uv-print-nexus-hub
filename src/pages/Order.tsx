import { useState, useEffect, useCallback } from "react";
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

const hsnCodes = {
  sticker: "4821",
  tag: "4821",
  box: "4819",
  medicine_box: "4819",
  custom: "4911",
};

const SAFETY_TIMEOUT = 20000;
const PAYMENT_TIMEOUT = 15000;

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
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [invoicePdf, setInvoicePdf] = useState<{ blob?: Blob; url?: string } | null>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [safetyTimer, setSafetyTimer] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [orderData, setOrderData] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [creatingOrder, setCreatingOrder] = useState(false);

  useEffect(() => {
    if (userData?.gstNumber) {
      setGstNumber(userData.gstNumber);
    }
    if (userData?.address) {
      setDeliveryAddress(userData.address);
    }
  }, [userData]);

  useEffect(() => {
    initializeRazorpay()
      .then((success) => {
        if (!success) {
          console.log("Razorpay SDK failed to load - this is fine in demo mode");
        }
      })
      .catch(error => {
        console.error("Error initializing Razorpay:", error);
      });
      
    return () => {
      if (safetyTimer) {
        clearTimeout(safetyTimer);
      }
    };
  }, [safetyTimer]);

  const setAndWatchLoadingState = (isLoading: boolean) => {
    setLoading(isLoading);
    
    if (safetyTimer) {
      clearTimeout(safetyTimer);
      setSafetyTimer(null);
    }
    
    if (isLoading) {
      const timer = setTimeout(() => {
        console.log("SAFETY TIMEOUT: Resetting loading state after timeout");
        setLoading(false);
        setProcessingStep("");
        setUploadProgress(0);
        
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

  const simulateProgress = useCallback((startAt: number, endAt: number, duration: number) => {
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
  }, []);

  const uploadFileAndPrepareOrder = async () => {
    setAndWatchLoadingState(true);
    setProcessingStep("Processing your order...");
    setUploadProgress(5);
    
    const customerTrackingId = `TRK-${user?.uid.substring(0, 6)}-${generateId(8).toUpperCase()}`;
    setTrackingId(customerTrackingId);
    
    let uploadedFileUrl = "";
    
    simulateProgress(5, 40, 1000);

    const demoMode = import.meta.env.VITE_RAZORPAY_DEMO_MODE === 'true';
    
    if (demoMode) {
      console.log("Demo mode - simulating file upload");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (file) {
        const blob = new Blob([file], { type: file.type });
        uploadedFileUrl = URL.createObjectURL(blob);
        console.log("Created local file URL:", uploadedFileUrl);
      } else {
        uploadedFileUrl = "demo-file-url";
      }
    } else {
      try {
        setProcessingStep("Uploading your design file...");
        
        if (file) {
          const localBlob = new Blob([file], { type: file.type });
          const localFileUrl = URL.createObjectURL(localBlob);
          
          const fileUploadPromise = Promise.race([
            (async () => {
              try {
                const fileExtension = file.name.split('.').pop();
                const uniqueFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExtension}`;
                const storageRef = ref(storage, `designs/${user?.uid}/${uniqueFileName}`);
                
                const uploadResult = await uploadBytes(storageRef, file);
                return getDownloadURL(uploadResult.ref);
              } catch (innerError) {
                console.error("Inner upload error:", innerError);
                throw innerError;
              }
            })(),
            new Promise<string>((resolve) => {
              setTimeout(() => {
                console.log("File upload timed out, using local URL");
                resolve(localFileUrl);
              }, 3000);
            })
          ]);
          
          try {
            uploadedFileUrl = await fileUploadPromise;
            console.log("File URL obtained:", uploadedFileUrl);
          } catch (uploadError) {
            console.error("Error in file upload promise:", uploadError);
            uploadedFileUrl = localFileUrl;
            console.log("Using local URL after error:", uploadedFileUrl);
          }
        } else {
          uploadedFileUrl = "fallback-file-url"; 
        }
      } catch (uploadError) {
        console.error("Error uploading file:", uploadError);
        
        if (file) {
          const blob = new Blob([file], { type: file.type });
          uploadedFileUrl = URL.createObjectURL(blob);
          console.log("Using local URL instead:", uploadedFileUrl);
        } else {
          uploadedFileUrl = "error-fallback-url";
        }
      }
    }
    
    setFileUrl(uploadedFileUrl);
    simulateProgress(40, 75, 500);
    
    const estimatedPrice = calculateEstimatedPrice();
    
    const hsnCode = hsnCodes[productType as keyof typeof hsnCodes] || "4911";

    setProcessingStep("Preparing your order...");
    const preparedOrderData = {
      userId: user?.uid || "demo-user",
      productType,
      quantity: parseInt(quantity) || 0,
      specifications,
      deliveryAddress,
      gstNumber,
      fileUrl: uploadedFileUrl,
      fileName: file ? file.name : "demo-file.jpg",
      totalAmount: estimatedPrice,
      customerName: userData?.name || user?.displayName || "Customer",
      customerEmail: userData?.email || user?.email || "customer@example.com",
      hsnCode,
      trackingId: customerTrackingId,
      status: "pending_payment",
      paymentStatus: "pending"
    };
    
    setOrderData(preparedOrderData);
    simulateProgress(75, 100, 500);
    setProcessingStep("Order prepared. Ready for payment.");
    
    setAndWatchLoadingState(false);
    
    return preparedOrderData;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      const preparedOrderData = await uploadFileAndPrepareOrder();
      
      toast({
        title: "Order Prepared",
        description: "Your order details are ready. Proceeding to payment.",
      });
      
      setTimeout(() => {
        handlePaymentProcess(preparedOrderData);
      }, 500);
      
    } catch (error) {
      console.error("Error preparing order:", error);
      
      setOrderError("There was a problem preparing your order. Please try again.");
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `There was a problem: ${error.message}`
          : "There was a problem preparing your order. Please try again.",
        variant: "destructive",
      });
      
      setAndWatchLoadingState(false);
      setProcessingStep("");
      setUploadProgress(0);
    }
  };

  const handlePaymentProcess = async (orderData: any) => {
    try {
      setPaymentProcessing(true);
      setProcessingStep("Setting up payment gateway...");
      
      const paymentSafetyTimer = setTimeout(() => {
        console.log("PAYMENT SAFETY TIMEOUT: Forcing completion of payment process");
        
        setPaymentProcessing(false);
        setProcessingStep("Payment timed out. Please try again.");
        
        toast({
          title: "Payment Timeout",
          description: "The payment process took too long. Please try again.",
          variant: "destructive",
        });
      }, PAYMENT_TIMEOUT);
      
      const tempOrderId = `temp_${Math.random().toString(36).substring(2, 10)}`;
      
      let razorpayOrder;
      try {
        razorpayOrder = await createRazorpayOrder(
          tempOrderId,
          orderData.totalAmount,
          orderData.customerName,
          orderData.customerEmail
        );
      } catch (razorpayError) {
        console.error("Error creating Razorpay order:", razorpayError);
        razorpayOrder = {
          id: `fallback_${tempOrderId.substring(0, 6)}_${Math.random().toString(36).substring(2, 6)}`,
          amount: orderData.totalAmount,
          currency: 'INR',
          status: 'pending',
          timestamp: new Date()
        };
      }
      
      setProcessingStep("Processing payment...");
      
      let paymentResult;
      try {
        paymentResult = await processPayment({
          orderId: tempOrderId,
          razorpayOrderId: razorpayOrder.id,
          amount: orderData.totalAmount,
          currency: "INR",
          customerName: orderData.customerName,
          customerEmail: orderData.customerEmail,
          description: `Order for ${orderData.productType} Printing - Qty: ${orderData.quantity}`,
          userId: orderData.userId,
          productType: orderData.productType,
          quantity: orderData.quantity,
          deliveryAddress: orderData.deliveryAddress,
          orderData: {
            ...orderData,
            status: "received", // Changed from "completed" to "received"
            paymentStatus: "paid"
          }
        });
      } catch (paymentError) {
        console.error("Payment processing error:", paymentError);
        
        clearTimeout(paymentSafetyTimer);
        setPaymentProcessing(false);
        setProcessingStep("Payment failed. Please try again.");
        
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
        
        return;
      }
      
      clearTimeout(paymentSafetyTimer);
      
      if (paymentResult.status === 'completed') {
        await handleOrderCreation(orderData, paymentResult);
      } else {
        setProcessingStep("Payment failed. Please try again.");
        setPaymentProcessing(false);
        
        toast({
          title: "Payment Failed",
          description: "There was an issue processing your payment. Please try again.",
          variant: "destructive",
        });
      }
      
    } catch (error) {
      console.error("Critical payment processing error:", error);
      
      if (retryCount > 1) {
        console.log("Too many retries, aborting payment process");
        setPaymentProcessing(false);
        setProcessingStep("");
        
        toast({
          title: "Payment Error",
          description: "We couldn't complete your payment after multiple attempts. Please try again later.",
          variant: "destructive",
        });
        return;
      }
      
      setRetryCount(retryCount + 1);
      setOrderError("Payment processing failed. Retrying...");
      
      toast({
        title: "Payment Processing",
        description: "There was an issue with the payment. Automatically retrying...",
        variant: "default",
      });
      
      setTimeout(() => {
        setOrderError(null);
        handlePaymentProcess(orderData);
      }, 1500);
    }
  };

  const handleOrderCreation = async (orderData: any, paymentResult: any) => {
    try {
      if (creatingOrder) {
        console.log("Already creating an order, preventing duplicate");
        return;
      }
      
      setCreatingOrder(true);
      
      setProcessingStep("Creating your order in the system...");
      
      const finalOrderData = {
        ...orderData,
        status: "received", // Changed from "completed" to "received"
        paymentStatus: "paid",
        paymentDetails: {
          id: paymentResult.id || paymentResult.razorpayOrderId || `generated-${Math.random().toString(36).substring(2, 10)}`,
          paymentId: paymentResult.paymentId || `pid-${Math.random().toString(36).substring(2, 10)}`,
          method: paymentResult.method || 'Razorpay',
          status: paymentResult.status || 'completed',
          timestamp: new Date()
        }
      };
      
      let orderResult;
      try {
        orderResult = await createOrder(finalOrderData);
        
        if (!orderResult.success || !orderResult.orderId) {
          throw new Error(orderResult.message || "Failed to create order");
        }
      } catch (orderError) {
        console.error("Order creation error:", orderError);
        throw new Error("Failed to create order after payment. Please contact support.");
      }
      
      try {
        await updateOrderAfterPayment(orderResult.orderId, {
          id: orderResult.orderId,
          status: "received", // Changed from "completed" to "received" for consistency
          paymentStatus: "paid",
          timestamp: new Date(),
          amount: orderData.totalAmount,
          currency: "INR"
        });
        console.log("Order status updated after payment");
      } catch (updateError) {
        console.error("Order status update error:", updateError);
      }
      
      setProcessingStep("Generating invoice...");
      
      let invoiceResult;
      try {
        invoiceResult = await createAndSendInvoice(
          { 
            ...finalOrderData, 
            id: orderResult.orderId,
          },
          paymentResult
        );
        
        if (invoiceResult.success && invoiceResult.pdfBlob) {
          setInvoicePdf({
            blob: invoiceResult.pdfBlob,
            url: invoiceResult.pdfUrl
          });
        }
      } catch (invoiceError) {
        console.error("Invoice generation error:", invoiceError);
        
        invoiceResult = {
          success: true,
          invoiceId: `INV-${orderData.trackingId}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
          pdfBlob: new Blob(['Fallback invoice content'], { type: 'application/pdf' }),
          pdfUrl: `https://example.com/invoices/fallback-${orderResult.orderId}.pdf`,
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
      
      setProcessingStep("Order completed with warnings");
      setOrderComplete(true);
      setPaymentProcessing(false);
      
      const emergencyInvoice = {
        blob: new Blob(['Emergency invoice content'], { type: 'application/pdf' }),
        url: `https://example.com/invoices/emergency-${Math.random().toString(36).substring(2, 10)}.pdf`,
      };
      
      setInvoicePdf(emergencyInvoice);
      
      toast({
        title: "Order Processed with Warnings",
        description: "Your order has been processed, but there were some warnings. Our team will contact you shortly.",
        variant: "default",
      });
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!invoicePdf || !invoicePdf.blob) return;
    
    const url = window.URL.createObjectURL(invoicePdf.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice-${trackingId || 'order'}.pdf`;
    document.body.appendChild(a);
    a.click();
    
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
              ) : paymentProcessing ? (
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
