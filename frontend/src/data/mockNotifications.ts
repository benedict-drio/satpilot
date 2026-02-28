export type NotificationType = "payment" | "warning" | "refund" | "info" | "system";

export interface Notification {
  id: string;
  title: string;
  description: string;
  type: NotificationType;
  time: string;
  read: boolean;
}

export const mockNotifications: Notification[] = [
  {
    id: "notif-1",
    title: "Payment received",
    description: "250,000 sats from CryptoShop Pro",
    type: "payment",
    time: "12 min ago",
    read: false,
  },
  {
    id: "notif-2",
    title: "Invoice INV-005 expired",
    description: "No payment received before expiry",
    type: "warning",
    time: "2 hours ago",
    read: false,
  },
  {
    id: "notif-3",
    title: "Refund issued",
    description: "320,000 sats to Chain Analytics",
    type: "refund",
    time: "5 hours ago",
    read: false,
  },
  {
    id: "notif-4",
    title: "New invoice created",
    description: "INV-011 for Web3 Agency",
    type: "info",
    time: "8 hours ago",
    read: true,
  },
  {
    id: "notif-5",
    title: "Partial payment received",
    description: "75,000 sats on INV-003",
    type: "payment",
    time: "Yesterday",
    read: true,
  },
  {
    id: "notif-6",
    title: "System maintenance",
    description: "Scheduled for Feb 20, 2:00 AM UTC",
    type: "system",
    time: "2 days ago",
    read: true,
  },
];
