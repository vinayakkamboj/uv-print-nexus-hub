
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function ComingSoon() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast({
        title: "Error",
        description: "Please enter your email address.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Notification Set",
        description: "We'll notify you when our new service launches!",
      });
      
      setEmail("");
    } catch (error) {
      console.error("Error submitting email:", error);
      toast({
        title: "Error",
        description: "Failed to register your email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-secondary/90 z-0"></div>
      
      {/* Content */}
      <div className="container-custom relative z-10 py-16 flex flex-col items-center justify-center min-h-[70vh] text-white text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in">
            Coming Soon!
          </h1>
          
          <div className="text-xl md:text-2xl mb-8 animate-slide-up">
            🚀 Our new 10-minute local delivery system is launching shortly in Dehradun.
          </div>
          
          <div className="bg-white/10 backdrop-blur-sm p-8 rounded-lg mb-8 animate-fade-in">
            <h2 className="text-2xl font-semibold mb-4">
              Express Local Delivery
            </h2>
            <p className="text-lg mb-6">
              We're revolutionizing the printing industry with our ultra-fast local delivery system. Get your urgent print materials delivered within 10 minutes anywhere in Dehradun city limits.
            </p>
            
            <div className="grid gap-4 md:grid-cols-3 mb-8">
              {[
                {
                  title: "10-Minute Delivery",
                  description: "For urgent print requirements"
                },
                {
                  title: "Track in Real-time",
                  description: "Know exactly when your order will arrive"
                },
                {
                  title: "Priority Printing",
                  description: "Jump the queue for urgent orders"
                }
              ].map((feature, i) => (
                <div key={i} className="bg-white/10 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              ))}
            </div>
            
            <h3 className="text-xl font-semibold mb-3">
              Be the First to Know
            </h3>
            <p className="mb-4">
              Sign up for early access and receive special launch discounts!
            </p>
            
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/20 border-white/30 text-white placeholder:text-white/70"
                required
              />
              <Button
                type="submit"
                className="bg-white text-primary hover:bg-white/90"
                disabled={loading}
              >
                {loading ? "Submitting..." : "Notify Me"}
              </Button>
            </form>
          </div>
          
          <p className="text-white/80">
            Have questions about our upcoming service?{" "}
            <a href="/contact" className="underline hover:text-white">Contact our team</a>
          </p>
        </div>
      </div>
    </div>
  );
}
