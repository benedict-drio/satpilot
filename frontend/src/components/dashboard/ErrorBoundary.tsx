import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-6">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-display font-bold text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-muted-foreground max-w-md mb-6">
            An unexpected error occurred. Please try again or contact support if the issue persists.
          </p>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="gradient-bitcoin text-primary-foreground gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
