import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Check, ArrowLeft, Gift, Printer, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const Subscribe = () => {
  const [showSuccess, setShowSuccess] = useState(false);
  const embedContainerRef = useRef<HTMLDivElement>(null);

  // Update document head for SEO
  useEffect(() => {
    document.title = "PixFix Studio | 20% Off Coloring Pages";
    
    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', 'Get 20% off custom coloring pages made from your photos. Subscribe to receive your code.');

    return () => {
      document.title = "PixFix Studio";
    };
  }, []);

  // Listen for form submission events from embedded forms
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Handle common form submission signals from GHL or similar platforms
      if (
        event.data?.type === 'form_submitted' ||
        event.data?.formSubmitted ||
        event.data === 'form_success'
      ) {
        setShowSuccess(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const benefits = [
    { icon: Gift, text: "Great for kids, classrooms, and gifts" },
    { icon: Printer, text: "Print at home or add to a custom coloring book" },
    { icon: Clock, text: "Fast turnaround" },
  ];

  if (showSuccess) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            You're in!
          </h1>
          <p className="text-lg text-muted-foreground">
            Check your email for your 20% off code.
          </p>
          <Button asChild size="lg" className="mt-4">
            <Link to="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to PixFix Studio
            </Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="px-4 py-12 md:py-20">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Get 20% Off Your First PixFix Studio Order
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground">
            Turn any photo into a clean, print-ready coloring page in minutes.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <ul className="space-y-4">
            {benefits.map((benefit, index) => (
              <li key={index} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <benefit.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-foreground text-lg">{benefit.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA Form Section */}
      <section className="px-4 pb-12">
        <div className="max-w-lg mx-auto">
          <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-semibold text-foreground text-center mb-6">
              Claim Your Discount
            </h2>
            
            {/* GHL Embed Placeholder */}
            <div 
              ref={embedContainerRef}
              className="min-h-[200px] border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 flex items-center justify-center bg-muted/30"
            >
              <div className="text-center text-muted-foreground">
                <p className="font-medium mb-2">Paste GHL Embed Code Here</p>
                <p className="text-sm">Supports script embeds and iframe embeds</p>
              </div>
            </div>

            {/* Manual trigger for testing */}
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowSuccess(true)}
                className="text-xs text-muted-foreground hover:text-foreground underline"
              >
                Test success state
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Footer */}
      <footer className="px-4 py-8 border-t border-border">
        <div className="max-w-lg mx-auto text-center space-y-4">
          <div className="flex items-center justify-center gap-4 text-sm">
            <Link 
              to="/privacy-policy" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link 
              to="/terms-of-service" 
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Subscribe;
