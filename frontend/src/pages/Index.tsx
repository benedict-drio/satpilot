import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesGrid } from "@/components/landing/FeaturesGrid";
import { PricingSection } from "@/components/landing/PricingSection";
import { FAQSection } from "@/components/landing/FAQSection";
import { ContactSection } from "@/components/landing/ContactSection";
import { SocialProof } from "@/components/landing/SocialProof";
import { WidgetShowcase } from "@/components/landing/WidgetShowcase";
import { Footer } from "@/components/landing/Footer";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

const Index = () => {
  useDocumentTitle("Bitcoin Payment Infrastructure");
  return (
    <div className="min-h-screen bg-background" id="main-content">
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <Navbar />
      <HeroSection />
      <FeaturesGrid />
      <PricingSection />
      <FAQSection />
      <ContactSection />
      <SocialProof />
      <WidgetShowcase />
      <Footer />
    </div>
  );
};

export default Index;
