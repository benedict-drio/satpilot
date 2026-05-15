/**
 * SatsRail Contract Configuration
 * Deployed on Stacks Testnet
 */

// Contract addresses
export const CONTRACT_ADDRESS = 'ST3P2G9ZK7B309EGAM9QAM143YGDNBGGQAW3RPRRQ';
export const CONTRACT_NAME = 'sats-terminal-v2';
export const CONTRACT_PRINCIPAL = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

// sBTC Token contract (testnet)
export const SBTC_ADDRESS = 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT';
export const SBTC_NAME = 'sbtc-token';
export const SBTC_PRINCIPAL = `${SBTC_ADDRESS}.${SBTC_NAME}`;

// Network configuration
export const NETWORK: 'testnet' | 'mainnet' = 'testnet';
export const API_URL = 'https://api.testnet.hiro.so';
export const EXPLORER_URL = 'https://explorer.hiro.so';

// Invoice status codes (from contract)
export const INVOICE_STATUS = {
  PENDING: 0,
  PARTIAL: 1,
  PAID: 2,
  EXPIRED: 3,
  CANCELLED: 4,
  REFUNDED: 5,
} as const;

export const INVOICE_STATUS_NAMES: Record<number, string> = {
  0: 'pending',
  1: 'partial',
  2: 'paid',
  3: 'expired',
  4: 'cancelled',
  5: 'refunded',
};

// Contract function names
export const CONTRACT_FUNCTIONS = {
  // Read-only
  GET_PLATFORM_STATS: 'get-platform-stats',
  GET_MERCHANT: 'get-merchant',
  GET_INVOICE: 'get-invoice',
  GET_INVOICE_STATUS: 'get-invoice-status',
  IS_INVOICE_PAYABLE: 'is-invoice-payable',
  GET_CONTRACT_CONFIG: 'get-contract-config',
  IS_PAUSED: 'is-paused',
  GET_INVOICE_NONCE: 'get-invoice-nonce',
  GET_REFUNDABLE_AMOUNT: 'get-refundable-amount',
  GET_INVOICE_PAYMENT_COUNT: 'get-invoice-payment-count',
  IS_MERCHANT: 'is-merchant',
  IS_MERCHANT_ACTIVE: 'is-merchant-active',
  
  // Public (require wallet)
  REGISTER_MERCHANT: 'register-merchant',
  UPDATE_MERCHANT_PROFILE: 'update-merchant-profile',
  CREATE_INVOICE: 'create-invoice',
  PAY_INVOICE: 'pay-invoice',
  CANCEL_INVOICE: 'cancel-invoice',
  REFUND_INVOICE: 'refund-invoice',
  ACTIVATE_MERCHANT: 'activate-merchant',
  DEACTIVATE_MERCHANT: 'deactivate-merchant',
} as const;

// Platform fee (0.5% = 50 basis points)
export const PLATFORM_FEE_BPS = 50;

// Formatting helpers
export function formatSats(sats: number): string {
  return sats.toLocaleString();
}

export function satsToBtc(sats: number): number {
  return sats / 100_000_000;
}

export function btcToSats(btc: number): number {
  return Math.floor(btc * 100_000_000);
}

export function truncateAddress(address: string, start = 4, end = 4): string {
  if (address.length <= start + end + 3) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}

export function getExplorerTxUrl(txid: string): string {
  return `${EXPLORER_URL}/txid/${txid}?chain=${NETWORK}`;
}

export function getExplorerAddressUrl(address: string): string {
  return `${EXPLORER_URL}/address/${address}?chain=${NETWORK}`;
}

export function getExplorerContractUrl(): string {
  return `${EXPLORER_URL}/address/${CONTRACT_PRINCIPAL}?chain=${NETWORK}`;
}
