
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { createOrder, updateOrderAfterPayment, testDatabaseConnection } from "@/lib/invoice-service";
import { initializeRazorpay, createRazorpayOrder, processPayment } from "@/lib/payment-service";

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
  const [processingStep, setProcessingStep] = useState("");

  useEffect(() => {
    if (userData?.gstNumber) {
      setGstNumber(userData.gstNumber);
    }
    if (userData?.address) {
      setDeliveryAddress(userData.address);
    }
  }, [userData]);

  useEffect(() => {
    const initializeComponents = async () => {
      console.log("🔄 Initializing components...");
      
      // Test database connection
      const dbConnected = await testDatabaseConnection();
      if (!dbConnected) {
        toast({
          title: "Database Connection Error",
          description: "Unable to connect to database. Please try refreshing the page.",
          variant: "destructive",
        });
      }
      
      // Initialize Razorpay
      await initializeRazorpay();
    };
    
    initializeComponents();
  }, [toast]);

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

  const mockFileUpload = async (file: File, userId: string): Promise<string> => {
    console.log("📁 Mock file upload...");
    setProcessingStep("Processing design file...");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockFileUrl = `https://storage.googleapis.com/mock-uploads/${userId}/${Date.now()}_${file.name}`;
    console.log("✅ Mock file uploaded:", mockFileUrl);
    
    return mockFileUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (loading) return;
    
    console.log("🚀 Starting order submission...");

    if (!user || !userData) {
      toast({
        title: "Authentication Error",
        description: "Please log in to place an order.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!productType || !quantity || !deliveryAddress || !file) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (gstNumber && !isValidGSTIN(gstNumber)) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid GST number.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const estimatedPrice = calculateEstimatedPrice();
      const customerTrackingId = `TRK-${user.uid.substring(0, 6)}-${generateId(8).toUpperCase()}`;
      const hsnCode = hsnCodes[productType as keyof typeof hsnCodes] || "4911";

      // Step 1: Upload file
      setProcessingStep("Uploading design file...");
      const fileUrl = await mockFileUpload(file, user.uid);

      // Step 2: Create order
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

      // Step 3: Initialize payment
      setProcessingStep("Initializing payment gateway...");
      const razorpayLoaded = await initializeRazorpay();
      if (!razorpayLoaded) {
        throw new Error("Failed to load payment gateway");
      }

      // Step 4: Create Razorpay order
      setProcessingStep("Creating payment order...");
      const razorpayOrder = await createRazorpayOrder(
        orderResult.orderId,
        estimatedPrice,
        orderData.customerName,
        orderData.customerEmail
      );

      // Step 5: Process payment
      setProcessingStep("Opening payment gateway...");
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

      if (paymentResult.status === 'completed' && paymentResult.paymentId) {
        setProcessingStep("Payment successful! Finalizing order...");
        
        const updateResult = await updateOrderAfterPayment(orderResult.orderId, paymentResult.paymentId);
        
        if (updateResult.success) {
          toast({
            title: "Order Placed Successfully",
            description: "Your order has been received and payment processed.",
          });
          
          setTimeout(() => {
            navigate("/dashboard");
          }, 2000);
        } else {
          toast({
            title: "Order Processing Issue",
            description: "Payment successful but order finalization failed. Please contact support.",
            variant: "destructive",
          });
        }
      } else {
        throw new Error("Payment was not completed successfully");
      }
      
    } catch (error) {
      console.error("❌ Order submission error:", error);
      
      let errorMessage = "Failed to process order";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Order Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
              
              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                  {loading && (
                    <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium mb-2">{processingStep}</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
                      </div>
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
                      payment via our secure payment gateway.
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
