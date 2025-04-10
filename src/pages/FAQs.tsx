
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Search } from "lucide-react";

const faqs = [
  {
    question: "What file formats do you accept for printing?",
    answer: "We accept a variety of file formats for printing, including PDF, AI (Adobe Illustrator), PSD (Photoshop), JPG, and PNG. For the best print quality, we recommend vector formats like PDF or AI, especially for logos and text elements. If you're unsure about your file format, please contact our team for assistance."
  },
  {
    question: "What are your standard delivery timelines?",
    answer: "Our standard delivery timeline depends on the complexity and volume of your order. Typically, stickers and labels take 3-5 business days, while packaging boxes may take 7-10 business days for production. Rush orders are available for an additional fee. We also offer delivery across India, with shipping times varying by location."
  },
  {
    question: "Is there a minimum order quantity?",
    answer: "Yes, we have minimum order quantities that vary by product type. For stickers and labels, our minimum is typically 100 pieces. For packaging boxes and cartons, we usually start at 500 units. However, we understand that businesses have unique needs, so please contact us for custom requirements, and we'll try our best to accommodate your request."
  },
  {
    question: "Can I cancel my order after placing it?",
    answer: "Order cancellation depends on the production stage. If production hasn't started, you can cancel your order with a full refund. Once production begins, cancellation may incur charges based on the work completed. Orders that have been fully produced cannot be canceled. Please contact our customer service team immediately if you need to cancel an order."
  },
  {
    question: "Is artwork review included in your service?",
    answer: "Yes, artwork review is included in our service at no extra cost. Our pre-press team will check your files for print readiness and alert you to any potential issues before production begins. We can also make minor adjustments to ensure optimal print quality. For more significant design changes, we offer professional design services at an additional cost."
  },
  {
    question: "Do you offer design services if I don't have ready artwork?",
    answer: "Yes, we offer professional design services for all your printing needs. Our team of experienced designers can create custom designs that align with your brand identity. Design services are charged separately from printing costs. Please contact us to discuss your design requirements and receive a quote."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept various payment methods including bank transfers, credit/debit cards, and UPI payments. For new clients, we typically require a 50% advance payment before starting production, with the remaining balance due before shipping. Regular clients may be eligible for credit terms based on their order history and relationship with us."
  },
  {
    question: "Can I get samples before placing a bulk order?",
    answer: "Yes, we offer sample services for clients who want to check quality before placing larger orders. Sample costs vary depending on the product, and they are typically produced at a higher per-unit cost than bulk orders. Sample costs are often credited toward your full order if you proceed with the purchase within 30 days."
  },
  {
    question: "Do you offer custom packaging solutions?",
    answer: "Yes, we specialize in custom packaging solutions tailored to your specific requirements. Whether you need unique shapes, special finishes, or custom inserts, our team can help design and produce packaging that perfectly showcases your product. Contact us with your requirements for a customized quote."
  },
  {
    question: "How do I track my order status?",
    answer: "Once your order is placed, you can track its status through your client dashboard on our website. You'll receive email updates at key stages of production and shipping. For more detailed information, you can contact our customer service team with your order number."
  }
];

export default function FAQs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFAQs, setFilteredFAQs] = useState(faqs);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value.toLowerCase();
    setSearchTerm(term);
    
    if (term.trim() === "") {
      setFilteredFAQs(faqs);
    } else {
      const filtered = faqs.filter(
        faq => 
          faq.question.toLowerCase().includes(term) || 
          faq.answer.toLowerCase().includes(term)
      );
      setFilteredFAQs(filtered);
    }
  };

  return (
    <div className="container-custom py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Frequently Asked Questions</h1>
        <p className="text-gray-600 mb-8">
          Find answers to common questions about our printing and packaging services.
        </p>

        {/* Search */}
        <div className="relative mb-8">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary focus:border-primary block w-full pl-10 p-2.5"
            placeholder="Search FAQs..."
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>

        {/* FAQs Accordion */}
        {filteredFAQs.length > 0 ? (
          <Accordion type="single" collapsible className="w-full">
            {filteredFAQs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left font-medium">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No results found for "{searchTerm}"</p>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilteredFAQs(faqs);
              }}
              className="text-primary hover:underline"
            >
              Clear search
            </button>
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-12 bg-gray-100 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">
            Still have questions?
          </h2>
          <p className="text-gray-600 mb-4">
            Our team is ready to help with any questions you may have.
          </p>
          <Link to="/contact">
            <Button>Contact Us</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
