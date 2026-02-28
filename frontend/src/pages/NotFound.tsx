import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Bitcoin } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
    document.title = "Page Not Found | SatsTerminal";
    return () => { document.title = "SatsTerminal"; };
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background gradient-dark-glow flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl gradient-bitcoin flex items-center justify-center mb-8">
        <Bitcoin className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-7xl font-display font-bold text-gradient-bitcoin mb-4">404</h1>
      <p className="text-xl text-foreground font-display font-semibold mb-2">Page not found</p>
      <p className="text-muted-foreground max-w-md mb-8">
        The page you're looking for doesn't exist or has been moved. Let's get you back on track.
      </p>
      <div className="flex gap-3">
        <Button asChild variant="outline">
          <Link to="/">Home</Link>
        </Button>
        <Button asChild className="gradient-bitcoin text-primary-foreground">
          <Link to="/dashboard">Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
