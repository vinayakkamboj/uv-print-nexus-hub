import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Phone, Mail, MessageSquare, Instagram, Linkedin } from "lucide-react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase"; // ✅ Adjust this path based on where you export `db`

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !email || !message) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // ✅ Store data in Firestore
      await addDoc(collection(db, "contactMessages"), {
        name,
        email,
        subject,
        message,
        createdAt: Timestamp.now(),
      });

      toast({
        title: "Message Sent",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });

      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Error",
        description: "Failed to send your message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold mb-2 text-gray-900">Contact Us</h1>
      <p className="text-gray-600 mb-8">
        Get in touch with our team for inquiries, quotes, or support.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact Information */}
        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Contact Information</h2>
            <div className="space-y-6">
              {[
                {
                  icon: <MapPin className="h-5 w-5 text-primary" />,
                  title: "Work Office",
                  desc: "3 Onkar Road, Rajpur Road, Dehradun, Uttarakhand, India",
                },
                {
                  icon: <MapPin className="h-5 w-5 text-primary" />,
                  title: "Registered Office",
                  desc: "179 Lunia Moholla, Near Clock Tower, Dehradun, Uttarakhand, India",
                },
                {
                  icon: <Phone className="h-5 w-5 text-primary" />,
                  title: "Phone",
                  desc: (
                    <>
                      <a href="tel:+919897454817" className="text-gray-600 hover:text-primary">+91-9897454817</a>,{" "}
                      <a href="tel:+919997380156" className="text-gray-600 hover:text-primary">+91-9997380156</a>
                    </>
                  ),
                },
                {
                  icon: <Mail className="h-5 w-5 text-primary" />,
                  title: "Email",
                  desc: (
                    <>
                      <a href="mailto:laxmankamboj@gmail.com" className="text-gray-600 hover:text-primary">laxmankamboj@gmail.com</a>,{" "}
                      <a href="mailto:contact@microuvprinters.in" className="text-gray-600 hover:text-primary">contact@microuvprinters.in</a>
                    </>
                  ),
                },
              ].map(({ icon, title, desc }, idx) => (
                <div key={idx} className="flex items-start">
                  <div className="bg-primary/10 p-3 rounded-full mr-4">{icon}</div>
                  <div>
                    <h3 className="font-medium text-gray-800">{title}</h3>
                    <p className="text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Connect With Us</h2>
            <div className="flex gap-4">
              {[
                {
                  icon: <MessageSquare className="h-5 w-5" />,
                  href: "https://wa.me/919876543210",
                },
                {
                  icon: <Instagram className="h-5 w-5" />,
                  href: "https://instagram.com/microuvprinters",
                },
                {
                  icon: <Linkedin className="h-5 w-5" />,
                  href: "https://linkedin.com/company/microuvprinters",
                },
              ].map(({ icon, href }, idx) => (
                <a
                  key={idx}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-primary/10 p-3 rounded-full hover:bg-primary hover:text-white transition-colors"
                >
                  {icon}
                </a>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4 text-gray-800">Business Hours</h2>
            <div className="space-y-2">
              <div className="flex justify-between text-gray-700">
                <span>Monday - Friday</span>
                <span>10:30 AM - 6:30 PM</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Saturday</span>
                <span>10:30 AM - 4:00 PM</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Sunday</span>
                <span className="text-red-500">Closed</span>
              </div>
            </div>
          </section>

          <section className="pt-4">
            <iframe
              title="Micro UV Printers Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3444.7932537558075!2d78.03726331512655!3d30.28867068178963!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390929c356d132b1%3A0x86b5e45337f6cc80!2sRajpur%20Rd%2C%20Dehradun%2C%20Uttarakhand!5e0!3m2!1sen!2sin!4v1650980000000!5m2!1sen!2sin"
              width="100%"
              height="250"
              style={{ border: 0 }}
              allowFullScreen={false}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="rounded-lg shadow-md"
            ></iframe>
          </section>
        </div>

        {/* Contact Form */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <h2 className="text-2xl font-semibold mb-4 text-gray-800">Send us a Message</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="name">Your Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div>
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="What’s this about?"
              />
            </div>

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your inquiry..."
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
