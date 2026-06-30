/**
 * Satpilot Contract Configuration
 * Deployed on Stacks Testnet
 */

// Contract addresses
export const CONTRACT_ADDRESS = 'ST3P2G9ZK7B309EGAM9QAM143YGDNBGGQAW3RPRRQ';
export const CONTRACT_NAME = 'satpilot';
export const CONTRACT_PRINCIPAL = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

// Network configuration
export const NETWORK: 'testnet' | 'mainnet' = 'testnet';

// sBTC token contract — must match the contract's configured `sbtc-token` (set via set-sbtc-token).
// NOTE: verify the current official sBTC testnet deployment before mainnet/testnet go-live.
export const SBTC_PRINCIPAL =
  (NETWORK as string) === 'mainnet'
    ? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token'
    : 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token';
export const [SBTC_ADDRESS, SBTC_NAME] = SBTC_PRINCIPAL.split('.') as [string, string];
export const API_URL = 'https://api.testnet.hiro.so';
export const EXPLORER_URL = 'https://explorer.hiro.so';

// Payment assets (from contract)
export const ASSET = {
  SBTC: 0,
  STX: 1,
} as const;
export const ASSET_NAMES: Record<number, string> = { 0: 'sBTC', 1: 'STX' };
// Base-unit decimals per asset: sBTC = sats (8), STX = micro-STX (6).
export const ASSET_DECIMALS: Record<number, number> = { 0: 8, 1: 6 };

/** Convert a human amount (e.g. 0.5 sBTC / 2 STX) to the contract's base units. */
export function toBaseUnits(amount: number, asset: number): number {
  return Math.round(amount * 10 ** (ASSET_DECIMALS[asset] ?? 8));
}

/** Format base units back to a human string in the asset's main unit. */
export function fromBaseUnits(base: number, asset: number): string {
  const d = ASSET_DECIMALS[asset] ?? 8;
  return (base / 10 ** d).toLocaleString(undefined, { maximumFractionDigits: d });
}

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
  GET_REFUNDABLE_FOR_PAYER: 'get-refundable-for-payer',
  GET_INVOICE_PAYMENT_COUNT: 'get-invoice-payment-count',
  IS_MERCHANT: 'is-merchant',
  IS_MERCHANT_ACTIVE: 'is-merchant-active',
  GET_MERCHANT_INVOICE_COUNT: 'get-merchant-invoice-count',
  GET_MERCHANT_INVOICE_ID: 'get-merchant-invoice-id',
  GET_MERCHANT_INVOICE: 'get-merchant-invoice',
  GET_INVOICE_BY_REFERENCE: 'get-invoice-by-reference',
  GET_PENDING_CONFIG: 'get-pending-config',
  GET_SBTC_TOKEN: 'get-sbtc-token',
  GET_VAULT_BALANCE: 'get-vault-balance',
  GET_MANDATE: 'get-mandate',
  GET_MANDATE_REMAINING: 'get-mandate-remaining',

  // Agentic payments (vault + mandates)
  VAULT_DEPOSIT_SBTC: 'vault-deposit-sbtc',
  VAULT_WITHDRAW_SBTC: 'vault-withdraw-sbtc',
  VAULT_DEPOSIT_STX: 'vault-deposit-stx',
  VAULT_WITHDRAW_STX: 'vault-withdraw-stx',
  GRANT_MANDATE: 'grant-mandate',
  REVOKE_MANDATE: 'revoke-mandate',
  PAY_INVOICE_AS_AGENT: 'pay-invoice-as-agent',
  PAY_INVOICE_STX_AS_AGENT: 'pay-invoice-stx-as-agent',

  // Public (require wallet)
  REGISTER_MERCHANT: 'register-merchant',
  UPDATE_MERCHANT_PROFILE: 'update-merchant-profile',
  CREATE_INVOICE: 'create-invoice',
  PAY_INVOICE: 'pay-invoice',
  PAY_INVOICE_STX: 'pay-invoice-stx',
  CANCEL_INVOICE: 'cancel-invoice',
  EXPIRE_INVOICE: 'expire-invoice',
  REFUND_INVOICE: 'refund-invoice',
  REFUND_INVOICE_STX: 'refund-invoice-stx',
  ACTIVATE_MERCHANT: 'activate-merchant',
  DEACTIVATE_MERCHANT: 'deactivate-merchant',

  // Admin (owner only)
  PROPOSE_CONFIG_CHANGE: 'propose-config-change',
  CANCEL_CONFIG_CHANGE: 'cancel-config-change',
  EXECUTE_CONFIG_CHANGE: 'execute-config-change',
  SET_SBTC_TOKEN: 'set-sbtc-token',
  LOCK_SBTC_TOKEN: 'lock-sbtc-token',
  SUSPEND_MERCHANT: 'suspend-merchant',
  UNSUSPEND_MERCHANT: 'unsuspend-merchant',
  VERIFY_MERCHANT: 'verify-merchant',
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
