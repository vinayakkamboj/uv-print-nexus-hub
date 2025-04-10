
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";

const navigation = [
  { name: "Home", href: "/" },
  { name: "About", href: "/about" },
  { name: "Portfolio", href: "/portfolio" },
  { name: "Testimonials", href: "/testimonials" },
  { name: "FAQs", href: "/faqs" },
  { name: "Contact", href: "/contact" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  const toggleMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      <nav className="container-custom flex items-center justify-between py-4">
        {/* Logo - Made smaller */}
        <Link to="/" className="flex items-center transition-transform duration-300 hover:scale-105">
          <img
            src="/logo.png"
            alt="Micro UV Printers"
            className="h-6 w-auto"
          />
          <span className="ml-2 text-sm font-bold text-primary hidden sm:block">
            Micro UV Printers
          </span>
        </Link>

        {/* Desktop Navigation with animation */}
        <div className="hidden md:flex space-x-6">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className="text-gray-700 hover:text-primary transition-colors duration-200 font-medium relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:origin-center after:scale-x-0 after:transition-transform hover:after:scale-x-100"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center space-x-3">
          {user ? (
            <>
              <Link to="/dashboard">
                <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">Dashboard</Button>
              </Link>
              <Button size="sm" onClick={() => logout()} className="transition-all duration-200 hover:scale-105">Logout</Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="outline" size="sm" className="transition-all duration-200 hover:scale-105">Log In</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="transition-all duration-200 hover:scale-105">Sign Up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden">
          <Button variant="ghost" onClick={toggleMenu} className="-m-2.5 p-2.5 transition-transform duration-200 hover:scale-110">
            <span className="sr-only">Open main menu</span>
            {mobileMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </Button>
        </div>
      </nav>

      {/* Mobile Menu with animation */}
      <div
        className={cn(
          "fixed inset-0 z-40 md:hidden bg-white transform transition-transform ease-in-out duration-300",
          mobileMenuOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b">
          <Link to="/" className="flex items-center" onClick={() => setMobileMenuOpen(false)}>
            <img
              src="/logo.png"
              alt="Micro UV Printers"
              className="h-8 w-auto"
            />
            <span className="ml-2 text-lg font-bold text-primary">
              Micro UV Printers
            </span>
          </Link>
          <Button variant="ghost" onClick={toggleMenu} className="-m-2.5 p-2.5">
            <span className="sr-only">Close menu</span>
            <X className="h-6 w-6" aria-hidden="true" />
          </Button>
        </div>
        <div className="py-6 px-4 space-y-4">
          {navigation.map((item) => (
            <div key={item.name}>
              <Link
                to={item.href}
                className="block py-2 text-base font-medium text-gray-700 hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            </div>
          ))}
          
          <div className="pt-4 border-t border-gray-200 space-y-4">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="block w-full py-2 text-center rounded-md bg-muted text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Button
                  className="w-full"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block w-full py-2 text-center rounded-md bg-muted text-primary font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  className="block w-full py-2 text-center rounded-md bg-primary text-white font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
