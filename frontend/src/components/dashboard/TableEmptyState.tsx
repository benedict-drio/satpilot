import { type ReactNode } from "react";

type Variant = "search" | "invoices" | "payments" | "refunds";

interface Props {
  title?: string;
  description?: string;
  variant?: Variant;
  children?: ReactNode;
}

function SearchIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-muted-foreground">
      <circle cx="35" cy="35" r="22" strokeDasharray="4 3" stroke="currentColor" strokeWidth="2" opacity="0.4" />
      <circle cx="35" cy="35" r="14" stroke="currentColor" strokeWidth="2" />
      <line x1="53" y1="53" x2="65" y2="65" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="29" y1="35" x2="41" y2="35" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function InvoicesIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-muted-foreground">
      <rect x="18" y="10" width="36" height="50" rx="4" stroke="currentColor" strokeWidth="2" />
      <line x1="26" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="26" y1="32" x2="42" y2="32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <line x1="26" y1="40" x2="38" y2="40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
      <path d="M52 48 L56 38 L60 48 L56 45 Z" className="text-primary/40 animate-pulse" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <line x1="56" y1="48" x2="56" y2="56" className="text-primary/40 animate-pulse" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function PaymentsIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-muted-foreground">
      <rect x="14" y="22" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
      <rect x="14" y="30" width="40" height="6" fill="currentColor" opacity="0.15" />
      <circle cx="28" cy="44" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
      <circle cx="36" cy="44" r="3" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
      <path d="M56 30 L64 26 M56 38 L64 42" className="text-primary/40 animate-pulse" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M62 22 L68 22 L68 46 L62 46" className="text-primary/40 animate-pulse" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function RefundsIllustration() {
  return (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="text-muted-foreground">
      <path d="M40 16 A24 24 0 1 1 16 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3" opacity="0.4" />
      <path d="M40 16 A24 24 0 0 0 16 40" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M40 10 L40 22 L28 16 Z" stroke="currentColor" strokeWidth="1.5" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="40" r="10" className="text-primary/40 animate-pulse" stroke="currentColor" strokeWidth="2" />
      <text x="40" y="44" textAnchor="middle" className="text-primary/40 animate-pulse" fill="currentColor" fontSize="12" fontWeight="bold">₿</text>
    </svg>
  );
}

const illustrations: Record<Variant, () => JSX.Element> = {
  search: SearchIllustration,
  invoices: InvoicesIllustration,
  payments: PaymentsIllustration,
  refunds: RefundsIllustration,
};

export function TableEmptyState({
  title = "No results found",
  description = "Try adjusting your filters or search query.",
  variant = "search",
  children,
}: Props) {
  const Illustration = illustrations[variant];
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="mb-4">
        <Illustration />
      </div>
      <h3 className="text-base font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
