
import { useEffect, useState } from "react";
import { StarIcon } from "lucide-react";

type Testimonial = {
  id: number;
  name: string;
  company: string;
  position: string;
  content: string;
  rating: number;
  industry: string;
  logo?: string;
};

// Sample testimonial data
const testimonialData: Testimonial[] = [
  {
    id: 1,
    name: "Rajesh Kumar",
    company: "MediCare Pharmaceuticals",
    position: "Procurement Manager",
    content: "Micro UV Printers has been our trusted partner for medicine packaging for over 5 years. Their attention to detail and consistent quality have helped us maintain our brand standards across all our product lines. The team is responsive and always delivers on time.",
    rating: 5,
    industry: "Pharmaceutical",
    logo: "/placeholder.svg"
  },
  {
    id: 2,
    name: "Ananya Sharma",
    company: "AutoParts India",
    position: "Marketing Director",
    content: "The labels and packaging materials provided by Micro UV Printers for our auto parts have excellent durability and print quality. They've helped us improve our brand visibility and product presentation in the market. Highly recommended for automotive businesses.",
    rating: 4,
    industry: "Automobile",
    logo: "/placeholder.svg"
  },
  {
    id: 3,
    name: "Vikram Singh",
    company: "TechGadgets Ltd",
    position: "Supply Chain Head",
    content: "We were looking for premium packaging solutions for our electronics products, and Micro UV Printers exceeded our expectations. The UV printing quality gives our packaging a premium look that aligns perfectly with our brand positioning. Their team understood our requirements perfectly.",
    rating: 5,
    industry: "Electronics",
    logo: "/placeholder.svg"
  },
  {
    id: 4,
    name: "Priya Patel",
    company: "QuickShip Logistics",
    position: "Operations Manager",
    content: "The shipping labels and documentation provided by Micro UV Printers have dramatically improved our logistics operations. The weather-resistant materials ensure our labels remain readable throughout the shipping process, and the barcodes scan perfectly every time.",
    rating: 5,
    industry: "Logistics",
    logo: "/placeholder.svg"
  },
  {
    id: 5,
    name: "Sanjay Verma",
    company: "FreshFoods Products",
    position: "Product Manager",
    content: "As a food company, we needed packaging that would preserve our products while also looking attractive on store shelves. Micro UV Printers provided exactly what we needed - food-grade packaging with vibrant colors that catch customers' attention.",
    rating: 4,
    industry: "Food & Beverage",
    logo: "/placeholder.svg"
  },
  {
    id: 6,
    name: "Neha Gupta",
    company: "BeautyEssentials Co.",
    position: "Brand Manager",
    content: "The stickers and labels for our beauty products needed to be water-resistant and maintain their appearance even when exposed to various beauty products. Micro UV Printers delivered exactly what we needed, with excellent color reproduction that matches our brand palette perfectly.",
    rating: 5,
    industry: "Cosmetics",
    logo: "/placeholder.svg"
  }
];

export default function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  
  useEffect(() => {
    document.title = "Testimonials | Micro UV Printers";
    
    // Auto-rotate testimonials
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonialData.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, index) => (
      <StarIcon
        key={index}
        className={`h-5 w-5 ${
          index < rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
        }`}
      />
    ));
  };

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold text-center mb-8">Client Testimonials</h1>
      <p className="text-gray-700 text-center max-w-3xl mx-auto mb-12">
        Don't just take our word for it. Here's what our clients have to say about our services and solutions.
      </p>
      
      {/* Featured testimonial */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden mb-16">
        <div className="md:flex">
          <div className="md:flex-shrink-0 flex items-center justify-center bg-primary/10 p-8 md:w-64">
            {testimonialData[activeTestimonial].logo ? (
              <img 
                src={testimonialData[activeTestimonial].logo} 
                alt={testimonialData[activeTestimonial].company}
                className="h-24 w-auto"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center text-2xl text-primary font-bold">
                {testimonialData[activeTestimonial].company.charAt(0)}
              </div>
            )}
          </div>
          <div className="p-8">
            <div className="flex items-center mb-4">
              {renderStars(testimonialData[activeTestimonial].rating)}
            </div>
            <blockquote className="italic text-lg text-gray-700 mb-4">
              "{testimonialData[activeTestimonial].content}"
            </blockquote>
            <div className="font-semibold">{testimonialData[activeTestimonial].name}</div>
            <div className="text-sm text-gray-600">
              {testimonialData[activeTestimonial].position}, {testimonialData[activeTestimonial].company}
            </div>
            <div className="text-xs text-primary mt-1">{testimonialData[activeTestimonial].industry}</div>
          </div>
        </div>
      </div>
      
      {/* Testimonial navigation */}
      <div className="flex justify-center gap-2 mb-12">
        {testimonialData.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveTestimonial(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              activeTestimonial === index ? "bg-primary w-6" : "bg-gray-300"
            }`}
            aria-label={`View testimonial ${index + 1}`}
          />
        ))}
      </div>
      
      {/* Testimonial grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {testimonialData.map((testimonial) => (
          <div key={testimonial.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
            <div className="flex items-center mb-4">
              {renderStars(testimonial.rating)}
            </div>
            <blockquote className="text-gray-700 mb-4 line-clamp-4">
              "{testimonial.content}"
            </blockquote>
            <div className="font-semibold">{testimonial.name}</div>
            <div className="text-sm text-gray-600">
              {testimonial.position}, {testimonial.company}
            </div>
            <div className="text-xs text-primary mt-1">{testimonial.industry}</div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 bg-gray-50 p-8 rounded-lg text-center">
        <h2 className="text-2xl font-semibold mb-4">Ready to Experience Our Quality Service?</h2>
        <p className="text-gray-700 mb-6 max-w-3xl mx-auto">
          Join our satisfied customers and discover how our printing and packaging solutions can help elevate your brand and products.
        </p>
        <a href="/contact" className="inline-block bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-md transition-colors">
          Get in Touch Today
        </a>
      </div>
    </div>
  );
}
