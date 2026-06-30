/**
 * Stacks Contract Interaction Helpers
 * For calling Satpilot  contract functions
 */

import {
  fetchCallReadOnlyFunction,
  cvToJSON,
  uintCV,
  stringUtf8CV,
  principalCV,
  boolCV,
  noneCV,
  someCV,
  type ClarityValue,
} from '@stacks/transactions';
import { STACKS_TESTNET, STACKS_MAINNET } from '@stacks/network';
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  NETWORK,
  API_URL,
  INVOICE_STATUS_NAMES,
} from './contract';

// Get network based on config
export function getNetwork() {
  return NETWORK === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;
}

// Generic read-only function caller
export async function callReadOnly<T = unknown>(
  functionName: string,
  functionArgs: ClarityValue[] = [],
  senderAddress?: string
): Promise<T> {
  const result = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    network: getNetwork(),
    senderAddress: senderAddress || CONTRACT_ADDRESS,
  });
  
  return cvToJSON(result) as T;
}

// ============================================
// Platform Stats
// ============================================

export interface PlatformStats {
  totalMerchants: number;
  totalInvoices: number;
  totalVolume: number;
  totalFeesCollected: number;
  totalRefunds: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  const result = await callReadOnly<{ value: Record<string, { value: string }> }>('get-platform-stats');
  const data = result.value;
  
  return {
    totalMerchants: parseInt(data['total-merchants']?.value || '0'),
    totalInvoices: parseInt(data['total-invoices']?.value || '0'),
    totalVolume: parseInt(data['total-volume']?.value || '0'),
    totalFeesCollected: parseInt(data['total-fees-collected']?.value || '0'),
    totalRefunds: parseInt(data['total-refunds']?.value || '0'),
  };
}

// ============================================
// Contract Config
// ============================================

export interface ContractConfig {
  owner: string;
  pendingOwner: string | null;
  feeRecipient: string;
  feeBps: number;
  isPaused: boolean;
  minInvoice: number;
  maxInvoice: number;
  maxExpiryBlocks: number;
  timelockBlocks: number;
}

export async function getContractConfig(): Promise<ContractConfig> {
  const result = await callReadOnly<{ value: Record<string, { value: string | boolean | { value: string } }> }>('get-contract-config');
  const data = result.value;

  return {
    owner: (data.owner?.value as string) || '',
    pendingOwner: (data['pending-owner']?.value as { value: string })?.value || null,
    feeRecipient: (data['fee-recipient']?.value as string) || '',
    feeBps: parseInt(data['platform-fee-bps']?.value as string || '50'),
    isPaused: data['is-paused']?.value === true,
    minInvoice: parseInt(data['min-invoice-amount']?.value as string || '1000'),
    maxInvoice: parseInt(data['max-invoice-amount']?.value as string || '100000000000'),
    maxExpiryBlocks: parseInt(data['max-expiry-blocks']?.value as string || '52560'),
    timelockBlocks: parseInt(data['timelock-blocks']?.value as string || '144'),
  };
}

/** A queued, timelocked fee-config change (or null if none pending). */
export interface PendingConfig {
  bps: number;
  recipient: string;
  executeAfter: number;
}

export async function getPendingConfig(): Promise<PendingConfig | null> {
  const result = await callReadOnly<{ value: { value: Record<string, { value: string }> } | null }>('get-pending-config');
  const inner = result.value?.value;
  if (!inner) return null;
  return {
    bps: parseInt(inner.bps?.value || '0'),
    recipient: inner.recipient?.value || '',
    executeAfter: parseInt(inner['execute-after']?.value || '0'),
  };
}

// ============================================
// Merchant Functions
// ============================================

export interface Merchant {
  id: number;
  name: string;
  description: string | null;
  webhookUrl: string | null;
  isActive: boolean;
  isVerified: boolean;
  totalReceived: number;
  invoiceCount: number;
  registeredAt: number;
}

export async function getMerchant(address: string): Promise<Merchant | null> {
  try {
    const result = await callReadOnly<{ value: Record<string, { value: string | boolean | { value: string } }> | null }>(
      'get-merchant',
      [principalCV(address)]
    );
    
    if (!result.value) return null;
    const data = result.value;
    
    return {
      id: parseInt(data.id?.value as string || '0'),
      name: data.name?.value as string || '',
      description: (data.description?.value as { value: string })?.value || null,
      webhookUrl: (data['webhook-url']?.value as { value: string })?.value || null,
      isActive: data['is-active']?.value === true,
      isVerified: data['is-verified']?.value === true,
      totalReceived: parseInt(data['total-received']?.value as string || '0'),
      invoiceCount: parseInt(data['invoice-count']?.value as string || '0'),
      registeredAt: parseInt(data['registered-at']?.value as string || '0'),
    };
  } catch {
    return null;
  }
}

export async function isMerchant(address: string): Promise<boolean> {
  const result = await callReadOnly<{ value: boolean }>('is-merchant', [principalCV(address)]);
  return result.value === true;
}

// ============================================
// Invoice Functions
// ============================================

export interface Invoice {
  id: number;
  merchant: string;
  asset: number;          // 0 = sBTC, 1 = STX
  amount: number;
  amountPaid: number;
  amountRefunded: number;
  netReceived: number;
  feeBps: number;
  memo: string;
  referenceId: string | null;
  status: number;
  statusName: string;
  createdAt: number;
  expiresAt: number;
  paidAt: number | null;
  /** Most recent payer principal (invoice `payer` field), or null if unpaid. */
  paidBy: string | null;
  allowPartial: boolean;
  allowOverpay: boolean;
}

export async function getInvoice(invoiceId: number): Promise<Invoice | null> {
  try {
    const result = await callReadOnly<{ value: Record<string, { value: string | boolean | { value: string } }> | null }>(
      'get-invoice',
      [uintCV(invoiceId)]
    );
    
    if (!result.value) return null;
    const data = result.value;
    const status = parseInt(data.status?.value as string || '0');
    
    return {
      id: invoiceId,
      merchant: data.merchant?.value as string || '',
      asset: parseInt(data.asset?.value as string || '0'),
      amount: parseInt(data.amount?.value as string || '0'),
      amountPaid: parseInt(data['amount-paid']?.value as string || '0'),
      amountRefunded: parseInt(data['amount-refunded']?.value as string || '0'),
      netReceived: parseInt(data['net-received']?.value as string || '0'),
      feeBps: parseInt(data['fee-bps']?.value as string || '0'),
      memo: data.memo?.value as string || '',
      referenceId: (data['reference-id']?.value as { value: string })?.value || null,
      status,
      statusName: INVOICE_STATUS_NAMES[status] || 'unknown',
      createdAt: parseInt(data['created-at']?.value as string || '0'),
      expiresAt: parseInt(data['expires-at']?.value as string || '0'),
      paidAt: data['paid-at']?.value ? parseInt((data['paid-at']?.value as { value: string })?.value || '0') : null,
      paidBy: (data.payer?.value as { value: string })?.value || null,
      allowPartial: data['allow-partial']?.value === true,
      allowOverpay: data['allow-overpay']?.value === true,
    };
  } catch {
    return null;
  }
}

export async function isInvoicePayable(invoiceId: number): Promise<boolean> {
  const result = await callReadOnly<{ value: boolean }>('is-invoice-payable', [uintCV(invoiceId)]);
  return result.value === true;
}

export async function getInvoiceNonce(): Promise<number> {
  const result = await callReadOnly<{ value: string }>('get-invoice-nonce');
  return parseInt(result.value || '0');
}

/** Current Stacks chain tip height — used to measure timelock progress. */
export async function getStacksBlockHeight(): Promise<number> {
  try {
    const res = await fetch(`${API_URL}/v2/info`);
    const data = await res.json();
    return data.stacks_tip_height ?? 0;
  } catch {
    return 0;
  }
}

export async function getRefundableAmount(invoiceId: number): Promise<number> {
  const result = await callReadOnly<{ value: string }>('get-refundable-amount', [uintCV(invoiceId)]);
  return parseInt(result.value || '0');
}

/** Still-refundable amount for a specific payer (what refund-invoice enforces). */
export async function getRefundableForPayer(invoiceId: number, payer: string): Promise<number> {
  const result = await callReadOnly<{ value: string }>('get-refundable-for-payer', [uintCV(invoiceId), principalCV(payer)]);
  return parseInt(result.value || '0');
}

export async function getMerchantInvoiceCount(address: string): Promise<number> {
  const result = await callReadOnly<{ value: string }>('get-merchant-invoice-count', [principalCV(address)]);
  return parseInt(result.value || '0');
}

export async function getMerchantInvoiceId(address: string, seq: number): Promise<number | null> {
  const result = await callReadOnly<{ value: { value: string } | null }>('get-merchant-invoice-id', [principalCV(address), uintCV(seq)]);
  const id = result.value?.value;
  return id != null ? parseInt(id) : null;
}

/**
 * Enumerate a merchant's invoices on-chain (newest first) via the merchant->invoice index.
 * Fine for small N; swap to the Supabase-indexed source once Chainhook ingestion is live.
 */
export async function getMerchantInvoices(address: string, limit = 50): Promise<Invoice[]> {
  const count = await getMerchantInvoiceCount(address);
  if (count === 0) return [];
  const end = Math.max(1, count - limit + 1);
  const seqs: number[] = [];
  for (let s = count; s >= end; s--) seqs.push(s);
  const ids = await Promise.all(seqs.map((s) => getMerchantInvoiceId(address, s)));
  const invoices = await Promise.all(
    ids.filter((id): id is number => id !== null).map((id) => getInvoice(id))
  );
  return invoices.filter((inv): inv is Invoice => inv !== null);
}

// ============================================
// Agentic Payments (vault + mandates)
// ============================================

/** An owner's escrowed vault balance for an asset (0 = sBTC sats, 1 = STX uSTX). */
export async function getVaultBalance(owner: string, asset: number): Promise<number> {
  const result = await callReadOnly<{ value: string }>(
    'get-vault-balance',
    [principalCV(owner), uintCV(asset)]
  );
  return parseInt(result.value || '0');
}

/** Live snapshot of an agent's mandate (rolling window already rolled forward). */
export interface MandateInfo {
  active: boolean;
  expired: boolean;
  perTxLimit: number;
  windowCap: number;
  windowSpent: number;
  windowRemaining: number;
  vaultBalance: number;
  /** What the agent can actually spend right now (0 if revoked/expired). */
  spendableNow: number;
}

export async function getMandateRemaining(owner: string, agent: string): Promise<MandateInfo | null> {
  const result = await callReadOnly<{ value: { value: Record<string, { value: string | boolean }> } | null }>(
    'get-mandate-remaining',
    [principalCV(owner), principalCV(agent)]
  );
  const inner = result.value?.value;
  if (!inner) return null;
  return {
    active: inner.active?.value === true,
    expired: inner.expired?.value === true,
    perTxLimit: parseInt((inner['per-tx-limit']?.value as string) || '0'),
    windowCap: parseInt((inner['window-cap']?.value as string) || '0'),
    windowSpent: parseInt((inner['window-spent']?.value as string) || '0'),
    windowRemaining: parseInt((inner['window-remaining']?.value as string) || '0'),
    vaultBalance: parseInt((inner['vault-balance']?.value as string) || '0'),
    spendableNow: parseInt((inner['spendable-now']?.value as string) || '0'),
  };
}

// ============================================
// sBTC Balance Check
// ============================================

export async function getSbtcBalance(address: string): Promise<number> {
  try {
    const response = await fetch(
      `${API_URL}/extended/v1/address/${address}/balances`
    );
    const data = await response.json();
    
    // Look for sBTC token balance
    const sbtcKey = Object.keys(data.fungible_tokens || {}).find(
      key => key.toLowerCase().includes('sbtc')
    );
    
    if (sbtcKey) {
      return parseInt(data.fungible_tokens[sbtcKey].balance || '0');
    }
    
    return 0;
  } catch {
    return 0;
  }
}

// ============================================
// Transaction Status Polling
// ============================================

export interface TxStatus {
  status: 'pending' | 'success' | 'failed';
  result?: string;
}

export async function getTxStatus(txid: string): Promise<TxStatus> {
  try {
    const response = await fetch(`${API_URL}/extended/v1/tx/${txid}`);
    const data = await response.json();
    
    if (data.tx_status === 'success') {
      return { status: 'success', result: data.tx_result?.repr };
    } else if (data.tx_status === 'abort_by_response' || data.tx_status === 'abort_by_post_condition') {
      return { status: 'failed', result: data.tx_result?.repr };
    }
    
    return { status: 'pending' };
  } catch {
    return { status: 'pending' };
  }
}

export async function waitForTx(txid: string, maxAttempts = 30, interval = 5000): Promise<TxStatus> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTxStatus(txid);
    if (status.status !== 'pending') {
      return status;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  return { status: 'pending' };
}
