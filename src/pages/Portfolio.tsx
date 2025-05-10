import { useEffect, useState } from "react";
import medicineBoxes from '../assets/medicinebox.jpg';
import manual from "../assets/manual.jpg";
import productPackaging from "../assets/productPackaging.jpg";
import shippingLogistics from "../assets/shippinglogistics.jpg";
import premiumStickers from "../assets/premiumstickers.jpg";
import foodPackaging from "../assets/foodpackaging.jpg";

// Sample portfolio data
const portfolioItems = [
  {
    id: 1,
    title: "Premium Medicine Boxes",
    category: "pharma",
    type: "boxes",
    client: "Leading Pharmaceutical Company",
    description: "Custom designed medicine boxes with anti-counterfeiting features and vibrant UV printing for brand recognition.",
    image: medicineBoxes
  },
  {
    id: 2,
    title: "Automobile Parts Labels",
    category: "automobile",
    type: "labels",
    client: "Auto Components Manufacturer",
    description: "Durable, weather-resistant labels for automobile parts with scannable QR codes for inventory tracking.",
    image: manual
  },
  {
    id: 3,
    title: "Product Packaging for Electronics",
    category: "manufacturing",
    type: "boxes",
    client: "Electronics Manufacturer",
    description: "Innovative packaging solution for consumer electronics with premium finish and multi-color UV printing.",
    image: productPackaging
  },
  {
    id: 4,
    title: "Premium Stickers Collection",
    category: "retail",
    type: "stickers",
    client: "Retail Chain",
    description: "High-quality promotional stickers with special effects UV printing for retail marketing campaign.",
    image: premiumStickers
  },
  {
    id: 5,
    title: "Logistics Shipping Labels",
    category: "logistics",
    type: "labels",
    client: "Logistics Service Provider",
    description: "Weather-resistant shipping labels with barcode integration for nationwide logistics operations.",
    image: shippingLogistics
  },
  {
    id: 6,
    title: "Food Product Packaging",
    category: "food",
    type: "boxes",
    client: "Food Processing Company",
    description: "Food-grade packaging with vibrant colors and protective coatings for extended shelf life.",
    image: foodPackaging
  }
];

// Filter categories
const categories = [
  { id: "all", name: "All" },
  { id: "boxes", name: "Boxes & Cartons" },
  { id: "labels", name: "Labels" },
  { id: "stickers", name: "Stickers" },
  { id: "pharma", name: "Pharmaceutical" }
];

export default function Portfolio() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [filteredItems, setFilteredItems] = useState(portfolioItems);
  
  useEffect(() => {
    document.title = "Portfolio | Micro UV Printers";
    
    // Filter items based on active filter
    if (activeFilter === "all") {
      setFilteredItems(portfolioItems);
    } else {
      setFilteredItems(
        portfolioItems.filter(
          item => item.category === activeFilter || item.type === activeFilter
        )
      );
    }
  }, [activeFilter]);

  return (
    <div className="container-custom py-12 fade-in">
      <h1 className="text-4xl font-bold text-center mb-8 animate-slide-up">Our Portfolio</h1>
      <p className="text-gray-700 text-center max-w-3xl mx-auto mb-12 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        Explore our diverse range of printing and packaging solutions crafted for various industries. 
        Each project showcases our commitment to quality, innovation, and attention to detail.
      </p>
      
      {/* Filter buttons */}
      <div className="flex flex-wrap justify-center gap-2 mb-8 animate-slide-up" style={{ animationDelay: "0.2s" }}>
        {categories.map((category, index) => (
          <button
            key={category.id}
            onClick={() => setActiveFilter(category.id)}
            className={`px-4 py-2 rounded-full transition-all duration-300 ${
              activeFilter === category.id
                ? "bg-primary text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800"
            } hover-scale`}
            style={{ animationDelay: `${0.1 * index}s` }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Portfolio grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredItems.map((item, index) => (
          <div 
            key={item.id} 
            className="bg-white rounded-lg shadow-md overflow-hidden hover-glow animate-slide-up"
            style={{ animationDelay: `${0.1 * index}s` }}
          >
            <div className="h-64 bg-gray-200 overflow-hidden">
              <img 
                src={item.image} 
                alt={item.title} 
                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                loading="lazy"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 mb-3">Client: {item.client}</p>
              <p className="text-gray-700 mb-4">{item.description}</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700 hover-scale">
                  {item.category}
                </span>
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700 hover-scale">
                  {item.type}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-16 bg-gray-50 p-8 rounded-lg animate-fade-in" style={{ animationDelay: "0.5s" }}>
        <h2 className="text-2xl font-semibold mb-4">Have a Project in Mind?</h2>
        <p className="text-gray-700 mb-6">
          Whether you need packaging solutions, labels, stickers, or any other printing service, 
          we're here to help bring your vision to life.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href="/contact" className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-md transition-all duration-300 hover:scale-105 hover:shadow-md">
            Contact Us
          </a>
          <a href="/order" className="bg-white border border-primary text-primary hover:bg-gray-50 px-6 py-2 rounded-md transition-all duration-300 hover:scale-105 hover:shadow-md">
            Request a Quote
          </a>
        </div>
      </div>
    </div>
  );
}
