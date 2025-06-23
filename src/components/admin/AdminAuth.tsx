
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { Shield, Mail, Key, Lock } from "lucide-react";

interface AdminAuthProps {
  onAuthenticated: (email: string) => void;
}

const AdminAuth = ({ onAuthenticated }: AdminAuthProps) => {
  const [step, setStep] = useState<'email' | 'password' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Authorized admin emails
  const authorizedEmails = [
    "help@microuvprinters.com",
    "laxmankamboj@gmail.com", 
    "vinayakkamboj01@gmail.com"
  ];

  // Unified password for all admins
  const ADMIN_PASSWORD = "microuvprinters@1234";

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

    setStep('password');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== ADMIN_PASSWORD) {
      toast({
        title: "Invalid Password",
        description: "Please enter the correct admin password.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    // Generate OTP for demo purposes
    setTimeout(() => {
      const generatedOTP = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(`🔐 Admin OTP for ${email}: ${generatedOTP}`);
      
      // Store OTP in session storage for demo purposes
      sessionStorage.setItem('admin_otp', generatedOTP);
      sessionStorage.setItem('admin_email', email);
      
      toast({
        title: "OTP Generated",
        description: `Your 6-digit OTP is: ${generatedOTP} (Check console for demo)`,
        duration: 10000,
      });
      
      setStep('otp');
      setLoading(false);
    }, 1000);
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
    console.log(`🔐 New Admin OTP for ${email}: ${generatedOTP}`);
    
    toast({
      title: "New OTP Generated",
      description: `Your new 6-digit OTP is: ${generatedOTP} (Check console for demo)`,
      duration: 10000,
    });
  };

  const goBackToEmail = () => {
    setStep('email');
    setPassword('');
    setOtp('');
  };

  const goBackToPassword = () => {
    setStep('password');
    setOtp('');
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
            {step === 'email' && 'Enter your authorized email address'}
            {step === 'password' && 'Enter the admin password'}
            {step === 'otp' && 'Enter the 6-digit OTP'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
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
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <Label htmlFor="password">Admin Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Generating OTP..." : "Login & Get OTP"}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={goBackToEmail}
                >
                  Change Email
                </Button>
              </div>
            </form>
          )}

          {step === 'otp' && (
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
                  Generate New OTP
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full" 
                  onClick={goBackToPassword}
                >
                  Back to Password
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
