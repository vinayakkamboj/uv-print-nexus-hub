
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Key } from "lucide-react";

interface AdminAuthProps {
  onAuthenticated: (email: string) => void;
}

const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Authorized admin emails
  const authorizedEmails = [
    "help@microuvprinters.com",
    "laxmankamboj@gmail.com", 
    "vinayakkamboj01@gmail.com"
  ];

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!authorizedEmails.includes(email.toLowerCase())) {
      toast({
        title: "Access Denied",
        description: "This email is not authorized for admin access.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Simulate OTP sending (in real implementation, this would send actual OTP)
    setTimeout(() => {
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`OTP for ${email}: ${generatedOTP}`);
      
      // Store OTP in session storage for demo purposes
      sessionStorage.setItem('admin_otp', generatedOTP);
      sessionStorage.setItem('admin_email', email);
      
      toast({
        title: "OTP Sent",
        description: `A 6-digit OTP has been sent to ${email}. Check console for demo OTP.`,
      });
      
      setStep('otp');
      setLoading(false);
    }, 1500);
  };

  const handleOTPSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const storedOTP = sessionStorage.getItem('admin_otp');
    const storedEmail = sessionStorage.getItem('admin_email');
    
    if (otp === storedOTP && email === storedEmail) {
      // Set admin session
      sessionStorage.setItem('admin_authenticated', 'true');
      sessionStorage.setItem('admin_session_email', email);
      sessionStorage.setItem('admin_session_start', Date.now().toString());
      
      toast({
        title: "Authentication Successful",
        description: "Welcome to the Admin Portal",
      });
      
      onAuthenticated(email);
    } else {
      toast({
        title: "Invalid OTP",
        description: "Please check your OTP and try again.",
        variant: "destructive"
      });
    }
  };

  const handleResendOTP = () => {
    const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
    sessionStorage.setItem('admin_otp', generatedOTP);
    console.log(`New OTP for ${email}: ${generatedOTP}`);
    
    toast({
      title: "OTP Resent",
      description: "A new OTP has been generated. Check console for demo OTP.",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Admin Portal Access</CardTitle>
          <CardDescription>
            {step === 'email' 
              ? 'Enter your authorized email address' 
              : 'Enter the 6-digit OTP sent to your email'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOTPSubmit} className="space-y-4">
              <div>
                <Label htmlFor="otp">Enter OTP</Label>
                <div className="flex justify-center mt-2">
                  <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <p className="text-sm text-gray-500 text-center mt-2">
                  OTP sent to {email}
                </p>
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={otp.length !== 6}>
                  <Key className="h-4 w-4 mr-2" />
                  Verify & Access Portal
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleResendOTP}
                >
                  Resend OTP
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={() => setStep('email')}
                >
                  Change Email
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;
