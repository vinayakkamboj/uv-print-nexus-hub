
import { Link } from "react-router-dom";
import { Instagram, Linkedin, MessageSquare, MapPin, Mail, Phone } from "lucide-react";
import WhiteLogo from '../assets/whitelogo.png'; // Adjust the path as necessary

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-1 lg:col-span-2">
            <Link to="/" className="flex items-center mb-4 hover-scale">
              <img
                src={WhiteLogo}
                alt="Micro UV Printers"
                className="h-8 w-auto"
              />
              <span className="ml-2 text-lg font-bold">Micro UV Printers</span>
            </Link>
            <p className="mb-4 text-gray-300">
              30+ years of excellence in the printing & packaging industry,
              specializing in UV printing solutions for businesses across India.
            </p>
            <p className="text-gray-300">GST Number: 05AKWPK9182B1ZT</p>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              {[
                { name: "Home", href: "/" },
                { name: "About Us", href: "/about" },
                { name: "Portfolio", href: "/portfolio" },
                { name: "Testimonials", href: "/testimonials" },
                { name: "FAQs", href: "/faqs" },
              ].map((link) => (
                <li key={link.name} className="hover-lift">
                  <Link
                    to={link.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">Our Services</h3>
            <ul className="space-y-2">
              {[
                "UV Printing",
                "Digital Printing",
                "Offset Printing",
                "Labels & Stickers",
                "Tags & Cards",
                "Packaging Solutions",
                "Cartons & Boxes",
                "& more...",
              ].map((service) => (
                <li key={service} className="text-gray-300 hover-lift">
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-start group">
                <MapPin className="h-5 w-5 text-primary mr-2 mt-1 flex-shrink-0 group-hover:text-accent transition-colors duration-300" />
                <span className="text-gray-300">
                  <strong>Work Office:</strong> 3 Onkar Road, Rajpur Road, Dehradun
                </span>
              </li>
              <li className="flex items-start group">
                <MapPin className="h-5 w-5 text-primary mr-2 mt-1 flex-shrink-0 group-hover:text-accent transition-colors duration-300" />
                <span className="text-gray-300">
                  <strong>Registered Office:</strong> 179 Lunia Moholla, Near Clock Tower, Dehradun
                </span>
              </li>
              <li className="flex items-center group">
                <Phone className="h-5 w-5 text-primary mr-2 flex-shrink-0 group-hover:text-accent transition-colors duration-300" />
                <a
                  href="tel:+919897454817"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  +91-9897454817
                </a>
              </li>
              <li className="flex items-center group">
                <Mail className="h-5 w-5 text-primary mr-2 flex-shrink-0 group-hover:text-accent transition-colors duration-300" />
                <a
                  href="mailto:laxmankamboj@gmail.com"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  laxmankamboj@gmail.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Social Media & Copyright */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <div className="flex space-x-4 mb-4 md:mb-0">
            <a
              href="https://instagram.com/microuvprinters"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-primary transition-colors duration-200 hover-scale"
            >
              <Instagram className="h-6 w-6" />
            </a>
            <a
              href="https://linkedin.com/company/microuvprinters"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-primary transition-colors duration-200 hover-scale"
            >
              <Linkedin className="h-6 w-6" />
            </a>
            <a
              href="https://wa.me/919876543210"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-primary transition-colors duration-200 hover-scale"
            >
              <MessageSquare className="h-6 w-6" />
            </a>
          </div>
          <p className="text-gray-400 text-center md:text-right">
            &copy; {new Date().getFullYear()} Micro UV Printers. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
