import { Link } from "react-router";
import { AlertCircle } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex p-4 bg-blue-100 rounded-full mb-4">
          <AlertCircle className="w-12 h-12 text-blue-600" />
        </div>
        <h1 className="text-4xl mb-2">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The page you're looking for doesn't exist.
        </p>
        <Link
          to="/"
          className="inline-flex px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
