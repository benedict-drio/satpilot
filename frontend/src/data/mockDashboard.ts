export type InvoiceStatus = "pending" | "partial" | "paid" | "expired" | "cancelled" | "refunded";

export interface Invoice {
  id: string;
  customer: string;
  memo: string;
  amountSats: number;
  amountPaidSats: number;
  status: InvoiceStatus;
  reference: string;
  createdAt: string;
  expiresAt: string;
  txHash?: string;
  events: { label: string; description?: string; time: string }[];
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
}

export interface StatCard {
  label: string;
  value: number;
  format: "btc" | "count" | "percent" | "btc-fee";
  trend: number; // positive = up, negative = down
  icon: string; // lucide icon name
}

export const statsCards: StatCard[] = [
  { label: "Total Volume", value: 2.4518, format: "btc", trend: 12.5, icon: "Bitcoin" },
  { label: "Active Invoices", value: 24, format: "count", trend: 8.2, icon: "FileText" },
  { label: "Success Rate", value: 94.7, format: "percent", trend: 3.1, icon: "TrendingUp" },
  { label: "Platform Fee", value: 0.0123, format: "btc-fee", trend: -2.4, icon: "Percent" },
];

export const revenueData: RevenueDataPoint[] = [
  { date: "Feb 13", revenue: 0.182 },
  { date: "Feb 14", revenue: 0.345 },
  { date: "Feb 15", revenue: 0.271 },
  { date: "Feb 16", revenue: 0.512 },
  { date: "Feb 17", revenue: 0.389 },
  { date: "Feb 18", revenue: 0.428 },
  { date: "Feb 19", revenue: 0.324 },
];

export const invoices: Invoice[] = [
  {
    id: "INV-001",
    customer: "CryptoShop Pro",
    memo: "Premium plan subscription",
    amountSats: 250000,
    amountPaidSats: 250000,
    status: "paid",
    reference: "REF-20250219-001",
    createdAt: "2025-02-19T10:30:00Z",
    expiresAt: "2025-02-19T11:30:00Z",
    txHash: "0x8a3f...c4e2",
    events: [
      { label: "Invoice Created", time: "10:30 AM" },
      { label: "Payment Received", description: "250,000 sats", time: "10:42 AM" },
      { label: "Confirmed", description: "6/6 confirmations", time: "10:55 AM" },
    ],
  },
  {
    id: "INV-002",
    customer: "BitMerchant",
    memo: "API access — annual",
    amountSats: 500000,
    amountPaidSats: 0,
    status: "pending",
    reference: "REF-20250219-002",
    createdAt: "2025-02-19T09:15:00Z",
    expiresAt: "2025-02-19T10:15:00Z",
    events: [{ label: "Invoice Created", time: "9:15 AM" }],
  },
  {
    id: "INV-003",
    customer: "StacksPay",
    memo: "Widget integration fee",
    amountSats: 150000,
    amountPaidSats: 75000,
    status: "partial",
    reference: "REF-20250218-003",
    createdAt: "2025-02-18T14:20:00Z",
    expiresAt: "2025-02-18T15:20:00Z",
    txHash: "0x1b7e...d9a1",
    events: [
      { label: "Invoice Created", time: "2:20 PM" },
      { label: "Payment Received", description: "75,000 sats", time: "2:35 PM" },
    ],
  },
  {
    id: "INV-004",
    customer: "DeFi Labs",
    memo: "Consulting services",
    amountSats: 1000000,
    amountPaidSats: 1000000,
    status: "paid",
    reference: "REF-20250218-004",
    createdAt: "2025-02-18T11:00:00Z",
    expiresAt: "2025-02-18T12:00:00Z",
    txHash: "0x3c9d...e5f3",
    events: [
      { label: "Invoice Created", time: "11:00 AM" },
      { label: "Payment Received", description: "1,000,000 sats", time: "11:15 AM" },
      { label: "Confirmed", description: "6/6 confirmations", time: "11:30 AM" },
    ],
  },
  {
    id: "INV-005",
    customer: "NFT Marketplace",
    memo: "Platform listing fee",
    amountSats: 75000,
    amountPaidSats: 0,
    status: "expired",
    reference: "REF-20250217-005",
    createdAt: "2025-02-17T16:45:00Z",
    expiresAt: "2025-02-17T17:45:00Z",
    events: [
      { label: "Invoice Created", time: "4:45 PM" },
      { label: "Expired", description: "No payment received", time: "5:45 PM" },
    ],
  },
  {
    id: "INV-006",
    customer: "Chain Analytics",
    memo: "Data export — Q1",
    amountSats: 320000,
    amountPaidSats: 320000,
    status: "refunded",
    reference: "REF-20250217-006",
    createdAt: "2025-02-17T09:00:00Z",
    expiresAt: "2025-02-17T10:00:00Z",
    txHash: "0x6f2a...b8c4",
    events: [
      { label: "Invoice Created", time: "9:00 AM" },
      { label: "Payment Received", description: "320,000 sats", time: "9:12 AM" },
      { label: "Confirmed", time: "9:25 AM" },
      { label: "Refund Issued", description: "320,000 sats returned", time: "10:30 AM" },
    ],
  },
  {
    id: "INV-007",
    customer: "Wallet Co",
    memo: "Partnership deposit",
    amountSats: 800000,
    amountPaidSats: 0,
    status: "cancelled",
    reference: "REF-20250216-007",
    createdAt: "2025-02-16T13:30:00Z",
    expiresAt: "2025-02-16T14:30:00Z",
    events: [
      { label: "Invoice Created", time: "1:30 PM" },
      { label: "Cancelled", description: "Cancelled by merchant", time: "1:45 PM" },
    ],
  },
  {
    id: "INV-008",
    customer: "Block Studios",
    memo: "Smart contract audit",
    amountSats: 1500000,
    amountPaidSats: 1500000,
    status: "paid",
    reference: "REF-20250216-008",
    createdAt: "2025-02-16T10:00:00Z",
    expiresAt: "2025-02-16T11:00:00Z",
    txHash: "0xaa12...ff98",
    events: [
      { label: "Invoice Created", time: "10:00 AM" },
      { label: "Payment Received", description: "1,500,000 sats", time: "10:08 AM" },
      { label: "Confirmed", description: "6/6 confirmations", time: "10:22 AM" },
    ],
  },
  {
    id: "INV-009",
    customer: "Satoshi Exchange",
    memo: "Monthly API subscription",
    amountSats: 180000,
    amountPaidSats: 0,
    status: "pending",
    reference: "REF-20250219-009",
    createdAt: "2025-02-19T08:00:00Z",
    expiresAt: "2025-02-19T09:00:00Z",
    events: [{ label: "Invoice Created", time: "8:00 AM" }],
  },
  {
    id: "INV-010",
    customer: "Lightning Dev",
    memo: "Integration support",
    amountSats: 420000,
    amountPaidSats: 420000,
    status: "paid",
    reference: "REF-20250215-010",
    createdAt: "2025-02-15T15:30:00Z",
    expiresAt: "2025-02-15T16:30:00Z",
    txHash: "0xd4e5...1a2b",
    events: [
      { label: "Invoice Created", time: "3:30 PM" },
      { label: "Payment Received", description: "420,000 sats", time: "3:41 PM" },
      { label: "Confirmed", description: "6/6 confirmations", time: "3:55 PM" },
    ],
  },
  {
    id: "INV-011",
    customer: "Web3 Agency",
    memo: "Landing page design",
    amountSats: 650000,
    amountPaidSats: 0,
    status: "pending",
    reference: "REF-20250219-011",
    createdAt: "2025-02-19T07:45:00Z",
    expiresAt: "2025-02-19T08:45:00Z",
    events: [{ label: "Invoice Created", time: "7:45 AM" }],
  },
  {
    id: "INV-012",
    customer: "Token Forge",
    memo: "Token launch package",
    amountSats: 2000000,
    amountPaidSats: 2000000,
    status: "paid",
    reference: "REF-20250214-012",
    createdAt: "2025-02-14T12:00:00Z",
    expiresAt: "2025-02-14T13:00:00Z",
    txHash: "0x7890...abcd",
    events: [
      { label: "Invoice Created", time: "12:00 PM" },
      { label: "Payment Received", description: "2,000,000 sats", time: "12:20 PM" },
      { label: "Confirmed", description: "6/6 confirmations", time: "12:35 PM" },
    ],
  },
  {
    id: "INV-013",
    customer: "Ordinals Market",
    memo: "Marketplace listing",
    amountSats: 95000,
    amountPaidSats: 0,
    status: "expired",
    reference: "REF-20250215-013",
    createdAt: "2025-02-15T18:00:00Z",
    expiresAt: "2025-02-15T18:15:00Z",
    events: [
      { label: "Invoice Created", time: "6:00 PM" },
      { label: "Expired", description: "No payment received", time: "6:15 PM" },
    ],
  },
];

export const paymentVolume = [
  { date: "Feb 13", volume: 0 },
  { date: "Feb 14", volume: 2000000 },
  { date: "Feb 15", volume: 420000 },
  { date: "Feb 16", volume: 2300000 },
  { date: "Feb 17", volume: 320000 },
  { date: "Feb 18", volume: 1150000 },
  { date: "Feb 19", volume: 250000 },
];

export function formatSats(sats: number): string {
  return sats.toLocaleString();
}

export function formatBtc(sats: number): string {
  return `${(sats / 100_000_000).toFixed(4)} BTC`;
}

export function satsToBtc(sats: number): string {
  return (sats / 100_000_000).toFixed(8);
}

export function satsToUsd(sats: number, rate = 97500): string {
  return (sats / 100_000_000 * rate).toFixed(2);
}

export type RefundStatus = "processed" | "pending" | "failed";

export interface Refund {
  id: string;
  invoiceId: string;
  customer: string;
  amountSats: number;
  reason: string;
  status: RefundStatus;
  createdAt: string;
  txHash?: string;
}

export const refunds: Refund[] = [
  {
    id: "RFD-001",
    invoiceId: "INV-006",
    customer: "Chain Analytics",
    amountSats: 320000,
    reason: "Service not delivered as agreed",
    status: "processed",
    createdAt: "2025-02-17T10:30:00Z",
    txHash: "0x9a1b...f2c3",
  },
  {
    id: "RFD-002",
    invoiceId: "INV-001",
    customer: "CryptoShop Pro",
    amountSats: 125000,
    reason: "Partial refund — downgraded plan",
    status: "processed",
    createdAt: "2025-02-19T14:00:00Z",
    txHash: "0x4d5e...a6b7",
  },
  {
    id: "RFD-003",
    invoiceId: "INV-004",
    customer: "DeFi Labs",
    amountSats: 1000000,
    reason: "Project cancelled by client",
    status: "pending",
    createdAt: "2025-02-19T09:45:00Z",
  },
  {
    id: "RFD-004",
    invoiceId: "INV-008",
    customer: "Block Studios",
    amountSats: 750000,
    reason: "Duplicate payment",
    status: "processed",
    createdAt: "2025-02-16T15:20:00Z",
    txHash: "0xbb12...cc98",
  },
  {
    id: "RFD-005",
    invoiceId: "INV-010",
    customer: "Lightning Dev",
    amountSats: 420000,
    reason: "Scope reduction",
    status: "failed",
    createdAt: "2025-02-15T17:00:00Z",
  },
  {
    id: "RFD-006",
    invoiceId: "INV-012",
    customer: "Token Forge",
    amountSats: 500000,
    reason: "Feature not yet available",
    status: "pending",
    createdAt: "2025-02-18T11:30:00Z",
  },
  {
    id: "RFD-007",
    invoiceId: "INV-003",
    customer: "StacksPay",
    amountSats: 75000,
    reason: "Billing error",
    status: "processed",
    createdAt: "2025-02-18T16:45:00Z",
    txHash: "0xe3f4...d5a6",
  },
];
