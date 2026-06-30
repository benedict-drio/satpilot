/**
 * useContract Hook
 * React hooks for Satpilot contract interactions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@stacks/connect';
import { Cl, type ClarityValue } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  CONTRACT_FUNCTIONS,
  CONTRACT_PRINCIPAL,
  NETWORK,
  SBTC_PRINCIPAL,
} from '@/lib/contract';
import {
  getPlatformStats,
  getContractConfig,
  getMerchant,
  getInvoice,
  getInvoiceNonce,
  isInvoicePayable,
  getSbtcBalance,
  getMerchantInvoices,
  getPendingConfig,
  getStacksBlockHeight,
  getVaultBalance,
  getMandateRemaining,
  waitForTx,
  type PlatformStats,
  type ContractConfig,
  type Merchant,
  type Invoice,
  type PendingConfig,
  type MandateInfo,
} from '@/lib/stacks';
import { ASSET } from '@/lib/contract';

// ============================================
// Read-Only Queries
// ============================================

export function usePlatformStats() {
  return useQuery<PlatformStats>({
    queryKey: ['platform-stats'],
    queryFn: getPlatformStats,
    staleTime: 30000, // 30 seconds
  });
}

export function useContractConfig() {
  return useQuery<ContractConfig>({
    queryKey: ['contract-config'],
    queryFn: getContractConfig,
    staleTime: 60000, // 1 minute
  });
}

export function useMerchant(address: string | null) {
  return useQuery<Merchant | null>({
    queryKey: ['merchant', address],
    queryFn: () => (address ? getMerchant(address) : Promise.resolve(null)),
    enabled: !!address,
    staleTime: 30000,
  });
}

export function useInvoice(invoiceId: number | null) {
  return useQuery<Invoice | null>({
    queryKey: ['invoice', invoiceId],
    queryFn: () => (invoiceId !== null ? getInvoice(invoiceId) : Promise.resolve(null)),
    enabled: invoiceId !== null,
    staleTime: 10000, // 10 seconds - invoices change more frequently
  });
}

export function useInvoicePayable(invoiceId: number | null) {
  return useQuery<boolean>({
    queryKey: ['invoice-payable', invoiceId],
    queryFn: () => (invoiceId !== null ? isInvoicePayable(invoiceId) : Promise.resolve(false)),
    enabled: invoiceId !== null,
    staleTime: 10000,
  });
}

export function useInvoiceNonce() {
  return useQuery<number>({
    queryKey: ['invoice-nonce'],
    queryFn: getInvoiceNonce,
    staleTime: 5000,
  });
}

export function useSbtcBalance(address: string | null) {
  return useQuery<number>({
    queryKey: ['sbtc-balance', address],
    queryFn: () => (address ? getSbtcBalance(address) : Promise.resolve(0)),
    enabled: !!address,
    staleTime: 30000,
  });
}

// ============================================
// Contract Write Mutations
// ============================================

interface CreateInvoiceParams {
  amount: number;
  /** 0 = sBTC (sats), 1 = STX (micro-STX). Defaults to sBTC. */
  asset?: number;
  memo: string;
  referenceId?: string;
  expiresInBlocks: number;
  allowPartial: boolean;
  allowOverpay: boolean;
}

export function useCreateInvoice() {
  const queryClient = useQueryClient();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: CreateInvoiceParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.CREATE_INVOICE,
        functionArgs: [
          Cl.uint(params.amount),
          Cl.uint(params.asset ?? 0),
          Cl.stringUtf8(params.memo),
          params.referenceId ? Cl.some(Cl.stringUtf8(params.referenceId)) : Cl.none(),
          Cl.uint(params.expiresInBlocks),
          Cl.bool(params.allowPartial),
          Cl.bool(params.allowOverpay),
        ],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      
      const txid = result.txid;
      setTxId(txid);
      return txid;
    },
    onSuccess: async (txId) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);
      
      if (result.status === 'success') {
        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        queryClient.invalidateQueries({ queryKey: ['merchant'] });
        queryClient.invalidateQueries({ queryKey: ['invoice-nonce'] });
      }
      
      return result;
    },
  });

  return {
    ...mutation,
    txId,
    isWaiting,
  };
}

interface PayInvoiceParams {
  invoiceId: number;
  amount: number;
}

export function usePayInvoice() {
  const queryClient = useQueryClient();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: PayInvoiceParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.PAY_INVOICE,
        functionArgs: [
          Cl.principal(SBTC_PRINCIPAL),
          Cl.uint(params.invoiceId),
          Cl.uint(params.amount),
        ],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      setTxId(result.txid);
      return result.txid;
    },
    onSuccess: async (txId, variables) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);
      
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sbtc-balance'] });
      }
      
      return result;
    },
  });

  return {
    ...mutation,
    txId,
    isWaiting,
  };
}

interface RegisterMerchantParams {
  name: string;
  description?: string;
  webhookUrl?: string;
}

export function useRegisterMerchant() {
  const queryClient = useQueryClient();
  const { address } = useWallet();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: RegisterMerchantParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.REGISTER_MERCHANT,
        functionArgs: [
          Cl.stringUtf8(params.name),
          params.description ? Cl.some(Cl.stringUtf8(params.description)) : Cl.none(),
          params.webhookUrl ? Cl.some(Cl.stringUtf8(params.webhookUrl)) : Cl.none(),
        ],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      setTxId(result.txid);
      return result.txid;
    },
    onSuccess: async (txId) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);
      
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['merchant', address] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      }
      
      return result;
    },
  });

  return {
    ...mutation,
    txId,
    isWaiting,
  };
}

interface RefundInvoiceParams {
  invoiceId: number;
  /** The address that paid and will receive the refund (the invoice payer). */
  recipient: string;
  refundAmount: number;
  reason: string;
}

export function useRefundInvoice() {
  const queryClient = useQueryClient();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: RefundInvoiceParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.REFUND_INVOICE,
        functionArgs: [
          Cl.principal(SBTC_PRINCIPAL),
          Cl.uint(params.invoiceId),
          Cl.principal(params.recipient),
          Cl.uint(params.refundAmount),
          Cl.stringUtf8(params.reason),
        ],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      setTxId(result.txid);
      return result.txid;
    },
    onSuccess: async (txId, variables) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);
      
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
        queryClient.invalidateQueries({ queryKey: ['sbtc-balance'] });
      }
      
      return result;
    },
  });

  return {
    ...mutation,
    txId,
    isWaiting,
  };
}

export function useCancelInvoice() {
  const queryClient = useQueryClient();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.CANCEL_INVOICE,
        functionArgs: [Cl.uint(invoiceId)],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      setTxId(result.txid);
      return result.txid;
    },
    onSuccess: async (txId, invoiceId) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);

      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      }

      return result;
    },
  });

  return {
    ...mutation,
    txId,
    isWaiting,
  };
}

// ============================================
// Merchant invoice enumeration (on-chain index)
// ============================================

/**
 * A merchant's invoices, read from the on-chain merchant->invoice index (newest first).
 * Interim source until Chainhook -> Supabase indexing is live; the component API is the same.
 */
export function useMerchantInvoices(address: string | null, limit = 50) {
  return useQuery<Invoice[]>({
    queryKey: ['merchant-invoices', address, limit],
    queryFn: () => (address ? getMerchantInvoices(address, limit) : Promise.resolve([])),
    enabled: !!address,
    staleTime: 15000,
  });
}

/** The queued, timelocked fee-config change (or null). */
export function usePendingConfig() {
  return useQuery<PendingConfig | null>({
    queryKey: ['pending-config'],
    queryFn: getPendingConfig,
    staleTime: 30000,
  });
}

/** Current Stacks chain tip height (polled), for timelock countdowns. */
export function useStacksBlockHeight() {
  return useQuery<number>({
    queryKey: ['stacks-block-height'],
    queryFn: getStacksBlockHeight,
    staleTime: 10000,
    refetchInterval: 30000,
  });
}

// ============================================
// Permissionless / admin mutations
// ============================================

/** Permissionlessly flip a past-expiry invoice to STATUS_EXPIRED. */
export function useExpireInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (invoiceId: number) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.EXPIRE_INVOICE,
        functionArgs: [Cl.uint(invoiceId)],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId, invoiceId) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      }
      return result;
    },
  });
}

interface ProposeConfigParams {
  feeBps: number;
  recipient: string;
}

/** Owner: queue a timelocked fee-rate + fee-recipient change. */
export function useProposeConfigChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: ProposeConfigParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.PROPOSE_CONFIG_CHANGE,
        functionArgs: [Cl.uint(params.feeBps), Cl.principal(params.recipient)],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['pending-config'] });
      }
      return result;
    },
  });
}

/** Owner: cancel a queued fee-config change. */
export function useCancelConfigChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.CANCEL_CONFIG_CHANGE,
        functionArgs: [],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['pending-config'] });
      }
      return result;
    },
  });
}

/** Owner: execute a queued fee-config change once the timelock has elapsed. */
export function useExecuteConfigChange() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.EXECUTE_CONFIG_CHANGE,
        functionArgs: [],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['pending-config'] });
        queryClient.invalidateQueries({ queryKey: ['contract-config'] });
      }
      return result;
    },
  });
}

/** Pay a STX invoice via the native STX path (no token arg). */
export function usePayInvoiceStx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: PayInvoiceParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.PAY_INVOICE_STX,
        functionArgs: [Cl.uint(params.invoiceId), Cl.uint(params.amount)],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId, variables) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      }
      return result;
    },
  });
}

/** Refund a STX invoice via the native STX path (no token arg). */
export function useRefundInvoiceStx() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: RefundInvoiceParams) => {
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName: CONTRACT_FUNCTIONS.REFUND_INVOICE_STX,
        functionArgs: [
          Cl.uint(params.invoiceId),
          Cl.principal(params.recipient),
          Cl.uint(params.refundAmount),
          Cl.stringUtf8(params.reason),
        ],
        network: NETWORK,
        postConditionMode: 'allow',
      });
      return result.txid;
    },
    onSuccess: async (txId, variables) => {
      const result = await waitForTx(txId);
      if (result.status === 'success') {
        queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
        queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      }
      return result;
    },
  });
}

// ============================================
// Agentic Payments — vault + mandates
// ============================================

/** An owner's escrowed vault balance for an asset (0 = sBTC, 1 = STX). */
export function useVaultBalance(owner: string | null, asset: number) {
  return useQuery<number>({
    queryKey: ['vault-balance', owner, asset],
    queryFn: () => (owner ? getVaultBalance(owner, asset) : Promise.resolve(0)),
    enabled: !!owner,
    staleTime: 15000,
  });
}

/** Live mandate snapshot for an (owner, agent) pair; polled so the meter stays fresh. */
export function useMandateRemaining(owner: string | null, agent: string | null) {
  return useQuery<MandateInfo | null>({
    queryKey: ['mandate-remaining', owner, agent],
    queryFn: () =>
      owner && agent ? getMandateRemaining(owner, agent) : Promise.resolve(null),
    enabled: !!owner && !!agent,
    staleTime: 10000,
    refetchInterval: 20000,
  });
}

/** Shared write-mutation wrapper matching the rest of this file (txId + isWaiting). */
function useContractWrite<TParams>(
  build: (params: TParams) => { functionName: string; functionArgs: ClarityValue[] },
  invalidate: (queryClient: ReturnType<typeof useQueryClient>, params: TParams) => void,
) {
  const queryClient = useQueryClient();
  const [txId, setTxId] = useState<string | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);

  const mutation = useMutation({
    mutationFn: async (params: TParams) => {
      const { functionName, functionArgs } = build(params);
      const result = await request('stx_callContract', {
        contract: CONTRACT_PRINCIPAL,
        functionName,
        functionArgs,
        network: NETWORK,
        postConditionMode: 'allow',
      });
      setTxId(result.txid);
      return result.txid;
    },
    onSuccess: async (txId, params) => {
      setIsWaiting(true);
      const result = await waitForTx(txId);
      setIsWaiting(false);
      if (result.status === 'success') invalidate(queryClient, params);
      return result;
    },
  });

  return { ...mutation, txId, isWaiting };
}

interface VaultParams {
  asset: number;
  amount: number;
}

/** Deposit STX or sBTC into the caller's vault. */
export function useVaultDeposit(owner: string | null) {
  return useContractWrite<VaultParams>(
    ({ asset, amount }) =>
      asset === ASSET.SBTC
        ? {
            functionName: CONTRACT_FUNCTIONS.VAULT_DEPOSIT_SBTC,
            functionArgs: [Cl.principal(SBTC_PRINCIPAL), Cl.uint(amount)],
          }
        : {
            functionName: CONTRACT_FUNCTIONS.VAULT_DEPOSIT_STX,
            functionArgs: [Cl.uint(amount)],
          },
    (qc, { asset }) => qc.invalidateQueries({ queryKey: ['vault-balance', owner, asset] }),
  );
}

/** Withdraw unspent STX or sBTC from the caller's vault. */
export function useVaultWithdraw(owner: string | null) {
  return useContractWrite<VaultParams>(
    ({ asset, amount }) =>
      asset === ASSET.SBTC
        ? {
            functionName: CONTRACT_FUNCTIONS.VAULT_WITHDRAW_SBTC,
            functionArgs: [Cl.principal(SBTC_PRINCIPAL), Cl.uint(amount)],
          }
        : {
            functionName: CONTRACT_FUNCTIONS.VAULT_WITHDRAW_STX,
            functionArgs: [Cl.uint(amount)],
          },
    (qc, { asset }) => qc.invalidateQueries({ queryKey: ['vault-balance', owner, asset] }),
  );
}

interface GrantMandateParams {
  agent: string;
  asset: number;
  perTxLimit: number;
  windowBlocks: number;
  windowCap: number;
  durationBlocks: number;
  /** Merchant allowlist; empty = unrestricted (agent may pay any merchant). */
  allowedMerchants?: string[];
}

/** Owner: grant (or replace) an agent's spending mandate. */
export function useGrantMandate(owner: string | null) {
  return useContractWrite<GrantMandateParams>(
    (p) => ({
      functionName: CONTRACT_FUNCTIONS.GRANT_MANDATE,
      functionArgs: [
        Cl.principal(p.agent),
        Cl.uint(p.asset),
        Cl.uint(p.perTxLimit),
        Cl.uint(p.windowBlocks),
        Cl.uint(p.windowCap),
        Cl.uint(p.durationBlocks),
        Cl.list((p.allowedMerchants ?? []).map((m) => Cl.principal(m))),
      ],
    }),
    (qc, p) => qc.invalidateQueries({ queryKey: ['mandate-remaining', owner, p.agent] }),
  );
}

/** Owner: revoke an agent's mandate immediately. */
export function useRevokeMandate(owner: string | null) {
  return useContractWrite<{ agent: string }>(
    ({ agent }) => ({
      functionName: CONTRACT_FUNCTIONS.REVOKE_MANDATE,
      functionArgs: [Cl.principal(agent)],
    }),
    (qc, { agent }) => qc.invalidateQueries({ queryKey: ['mandate-remaining', owner, agent] }),
  );
}

interface PayAsAgentParams {
  owner: string;
  invoiceId: number;
  amount: number;
  asset: number;
}

/** Agent: settle an invoice from the owner's vault, within the mandate. */
export function usePayInvoiceAsAgent() {
  return useContractWrite<PayAsAgentParams>(
    (p) =>
      p.asset === ASSET.SBTC
        ? {
            functionName: CONTRACT_FUNCTIONS.PAY_INVOICE_AS_AGENT,
            functionArgs: [
              Cl.principal(SBTC_PRINCIPAL),
              Cl.principal(p.owner),
              Cl.uint(p.invoiceId),
              Cl.uint(p.amount),
            ],
          }
        : {
            functionName: CONTRACT_FUNCTIONS.PAY_INVOICE_STX_AS_AGENT,
            functionArgs: [Cl.principal(p.owner), Cl.uint(p.invoiceId), Cl.uint(p.amount)],
          },
    (qc, p) => {
      qc.invalidateQueries({ queryKey: ['invoice', p.invoiceId] });
      qc.invalidateQueries({ queryKey: ['vault-balance', p.owner, p.asset] });
    },
  );
}
