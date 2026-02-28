import { Bitcoin } from "lucide-react";
import { Link } from "react-router-dom";

const links = {
  Product: [
    { label: "Payment Widget", href: "/pay" },
    { label: "Dashboard", href: "/dashboard" },
    { label: "API Docs", href: "#" },
    { label: "Pricing", href: "/#pricing" },
  ],
  Developers: [
    { label: "Documentation", href: "#" },
    { label: "GitHub", href: "#" },
    { label: "SDK", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "/#contact" },
  ],
  Legal: [
    { label: "Privacy", href: "#" },
    { label: "Terms", href: "#" },
    { label: "Security", href: "#" },
  ],
};

function isInternalRoute(href: string) {
  return href.startsWith("/") && !href.startsWith("/#");
}

export function Footer() {
  return (
    <footer className="py-20 border-t border-border/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg gradient-bitcoin flex items-center justify-center">
                <Bitcoin className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-foreground text-lg">SatsTerminal</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enterprise-grade Bitcoin payment infrastructure built on Stacks.
            </p>
          </div>

          {/* Links */}
          {Object.entries(links).map(([category, items]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{category}</h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item.label}>
                    {isInternalRoute(item.href) ? (
                      <Link to={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-border/30 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © 2026 SatsTerminal. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            Powered by
            <span className="text-gradient-bitcoin font-semibold">Stacks</span>
            · Secured by
            <span className="text-gradient-bitcoin font-semibold">Bitcoin</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
