
import { useEffect } from "react";

export default function About() {
  useEffect(() => {
    document.title = "About Us | Micro UV Printers";
  }, []);

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold text-center mb-12">About Micro UV Printers</h1>
      
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">30+ Years of Excellence</h2>
        <p className="text-gray-700 mb-4">
          Since our establishment in 1995, Micro UV Printers has been at the forefront of the printing and packaging industry in India. 
          What started as a small family business in Dehradun has grown into a trusted partner for businesses across multiple industries.
        </p>
        <p className="text-gray-700 mb-4">
          Our journey has been marked by continuous innovation, quality improvement, and building long-lasting relationships with our clients.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Our UV Printing Technology</h2>
          <p className="text-gray-700 mb-4">
            We specialize in UV (Ultraviolet) printing, a cutting-edge technology that uses ultraviolet lights to dry or cure ink as it is printed.
            This technology allows us to print on a wide variety of materials, including plastics, paper, and cardboard.
          </p>
          <p className="text-gray-700">
            The advantages of UV printing include:
          </p>
          <ul className="list-disc pl-5 mt-2 space-y-1 text-gray-700">
            <li>Superior image quality and color vibrancy</li>
            <li>Environmental friendliness with low VOC emissions</li>
            <li>Instant drying for faster production times</li>
            <li>Excellent durability and resistance to scratching</li>
            <li>Ability to print on various materials and surfaces</li>
          </ul>
        </div>
        <div className="bg-gray-100 rounded-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Industries We Serve</h2>
          <div className="space-y-3">
            <div>
              <h3 className="text-lg font-medium text-primary">Pharmaceutical</h3>
              <p className="text-gray-700">Specialized in medicine boxes, labels, and package inserts with strict quality control.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-primary">Automobile</h3>
              <p className="text-gray-700">Durable labels, instruction manuals, and packaging solutions for auto parts.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-primary">Manufacturing</h3>
              <p className="text-gray-700">Custom packaging solutions designed for industrial products and equipment.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-primary">Logistics</h3>
              <p className="text-gray-700">Weather-resistant labels, shipping documents, and tracking solutions.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-primary">And Many More</h3>
              <p className="text-gray-700">We cater to diverse industries with customized printing and packaging solutions.</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Our Commitment</h2>
        <p className="text-gray-700 mb-4">
          At Micro UV Printers, we are committed to:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-primary mb-2">Quality Excellence</h3>
            <p className="text-gray-700">We maintain rigorous quality standards at every stage of production.</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-primary mb-2">Timely Delivery</h3>
            <p className="text-gray-700">We understand the importance of deadlines in business operations.</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-primary mb-2">Customer Satisfaction</h3>
            <p className="text-gray-700">We work closely with our clients to ensure their needs are met.</p>
          </div>
        </div>
      </div>
      
      <div>
        <h2 className="text-2xl font-semibold mb-4">Our Facilities</h2>
        <p className="text-gray-700 mb-4">
          Our state-of-the-art production facility in Dehradun is equipped with the latest UV printing technology and staffed by skilled professionals with years of experience in the printing industry.
        </p>
        <div className="bg-gray-100 p-6 rounded-lg">
          <p className="italic text-gray-700">
            "We invite you to visit our facility and see our operations firsthand. Contact us to schedule a visit."
          </p>
        </div>
      </div>
    </div>
  );
}
