import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Printer, Package, Truck, CheckCircle, Building, BookOpen, School, Clock, BadgeCheck } from "lucide-react";
import printerImg from '../assets/factoryprinting.jpeg';
import uvPrinting from '../assets/uvprinting.jpg';
import tags from '../assets/tags.jpg';
import medicineBoxes from '../assets/medicinebox.jpg';
import digital from '../assets/digital.jpg';
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function Index() {
  return (
    <div className="animate-fade-in">

      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-primary/90 to-secondary/90 text-white">
        <div className="container-custom section-padding grid md:grid-cols-2 gap-8 items-center">
          <motion.div
            className="order-2 md:order-1"
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl lg:text-5xl font-bold mb-4">
              30+ Years of Excellence in Printing Industry
            </h1>
            <p className="text-lg mb-8">
              Trusted B2B printing & packaging solutions for pharma, automobile, manufacturing, 
              and logistics industries across India.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/order">
                <Button className="bg-white text-primary hover:bg-gray-100 transition-colors">
                  Order Now <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/portfolio">
                <Button className="bg-white text-primary hover:bg-gray-100 transition-colors">
                  View Portfolio
                </Button>
              </Link>
              <Link to="/coming-soon">
                <Button className="bg-red-600 text-white hover:bg-red-700 transition-colors">
                  <Clock className="mr-2 h-4 w-4" /> Same Day Delivery
                </Button>
              </Link>
            </div>
          </motion.div>
          <motion.div
            className="order-1 md:order-2 flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
          >
            <img 
              src={printerImg}
              alt="Micro UV Printers factory" 
              className="rounded-lg shadow-lg max-h-[400px] object-cover"
            />
          </motion.div>
        </div>
      </section>

      {/* Industries Served */}
      <section className="bg-gray-50 section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Industries We Serve</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Providing specialized printing and packaging solutions across diverse sectors
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "Pharmaceutical",
                description: "Accurate medicine boxes, labels, and packaging that meet regulatory standards",
                icon: <Package className="h-10 w-10 text-primary" />
              },
              {
                name: "Automobile",
                description: "Durable labels, manuals, and packaging solutions for automotive components",
                icon: <Truck className="h-10 w-10 text-primary" />
              },
              {
                name: "Manufacturing",
                description: "Custom packaging and labeling solutions for industrial products",
                icon: <Printer className="h-10 w-10 text-primary" />
              },
              {
                name: "Logistics",
                description: "High-quality shipping labels, packaging materials, and tracking solutions",
                icon: <CheckCircle className="h-10 w-10 text-primary" />
              },
              {
                name: "Publishing & Magazines",
                description: "Customized magazine prints, covers, and layouts for mass distribution",
                icon: <BookOpen className="h-10 w-10 text-primary" />
              },
              {
                name: "Education & Schools",
                description: "Educational materials, labels, and packaging for schools and universities",
                icon: <School className="h-10 w-10 text-primary" />
              },
              {
                name: "And Many More",
                description: "We cater to diverse industries with customized printing and packaging solutions",
                icon: <Building className="h-10 w-10 text-primary" />
              }
            ].map((industry, index) => (
              <motion.div 
                key={index}
                className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="mb-4">{industry.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{industry.name}</h3>
                <p className="text-gray-600">{industry.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Our Products & Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              High-quality printing and packaging solutions for every business need
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                name: "UV Printing Services",
                image: uvPrinting,
                description: "High-quality UV printing for vibrant colors and durability"
              },
              {
                name: "Custom Tags",
                image: tags,
                description: "Branded tags for product identification and information"
              },
              {
                name: "Medicine Boxes",
                image: medicineBoxes,
                description: "Precisely printed packaging for pharmaceutical products"
              },
              {
                name: "Digital & Offset Printing",
                image: digital,
                description: "Versatile printing solutions for all your business needs"
              }
            ].map((product, index) => (
              <motion.div 
                key={index} 
                className="group"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <div className="overflow-hidden rounded-lg shadow-md group-hover:shadow-lg transition-shadow duration-300">
                  <img 
                    src={product.image} 
                    alt={product.name}
                    className="w-full h-52 object-cover transition-transform duration-300 group-hover:scale-105" 
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-semibold mb-2">{product.name}</h3>
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    <Link to="/order" className="text-primary font-medium flex items-center">
                      Order Now <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="bg-primary text-white section-padding">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3">Why Choose Micro UV Printers</h2>
            <p className="max-w-2xl mx-auto opacity-90">
              We combine decades of experience with cutting-edge technology to deliver exceptional results
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: "30+ Years Experience",
                description: "Decades of expertise in the printing and packaging industry"
              },
              {
                title: "State-of-the-Art Technology",
                description: "Advanced UV printing equipment for superior quality outputs"
              },
              {
                title: "Customized Solutions",
                description: "Tailored printing and packaging solutions for every client"
              },
              {
                title: "Timely Delivery",
                description: "Reliable schedules and prompt deliveries across India"
              },
              {
                title: "Quality Assurance",
                description: "Stringent quality checks for every product we deliver"
              },
              {
                title: "Customer Support",
                description: "Dedicated team providing excellent pre and post-sales support"
              }
            ].map((item, index) => (
              <motion.div 
                key={index} 
                className="bg-white/10 p-6 rounded-lg"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
              >
                <h3 className="text-xl font-semibold mb-3">{item.title}</h3>
                <p className="opacity-90">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Government Verification Section */}
      <section className="bg-gray-50 section-padding">
        <div className="container-custom">
          <motion.div
            className="text-center bg-white p-8 rounded-2xl shadow-md"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex justify-center mb-4">
              <Badge className="bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 text-lg px-4 py-2">
                <BadgeCheck className="h-5 w-5" />
                Government Verified
              </Badge>
            </div>
            <h2 className="text-3xl font-bold mb-4">Trusted by Government & Private Sectors</h2>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg">
              We've successfully executed public sector and private contracts, ensuring compliance with procurement standards. 
              Our commitment to quality and regulatory adherence has made us a preferred partner for government institutions 
              and major corporations across India.
            </p>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <motion.div
          className="container-custom bg-gray-100 rounded-2xl p-8 lg:p-12"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
              <p className="text-gray-600 mb-6">
                Contact us today to discuss your printing and packaging requirements.
                Our team is ready to help you bring your vision to life.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/contact">
                  <Button>Contact Us</Button>
                </Link>
                <Link to="/order">
                  <Button variant="outline">Place an Order</Button>
                </Link>
                <Link to="/coming-soon">
                  <Button variant="outline" className="flex items-center gap-2 bg-red-100 text-red-700 hover:bg-red-200 border-red-300">
                    <Clock className="h-4 w-4" /> Same Day Delivery Coming Soon
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block">
              <img 
                src="/contact-image.jpg" 
                alt="Contact Micro UV Printers" 
                className="rounded-lg shadow-md"
              />
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
