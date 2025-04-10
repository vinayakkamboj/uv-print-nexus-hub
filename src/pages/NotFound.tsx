
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export default function NotFound() {
  useEffect(() => {
    document.title = "404 - Page Not Found | Micro UV Printers";
  }, []);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 py-16">
      <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-gray-600 max-w-md mb-8">
        Sorry, the page you are looking for doesn't exist or has been moved.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <Link to="/">
          <Button>Go to Homepage</Button>
        </Link>
        <Link to="/contact">
          <Button variant="outline">Contact Support</Button>
        </Link>
      </div>
    </div>
  );
}
