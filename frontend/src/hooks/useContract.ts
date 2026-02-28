/**
 * useContract Hook
 * React hooks for SatsTerminal contract interactions
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { request } from '@stacks/connect';
import { Cl } from '@stacks/transactions';
import { useWallet } from '@/contexts/WalletContext';
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  CONTRACT_FUNCTIONS,
  CONTRACT_PRINCIPAL,
  NETWORK,
} from '@/lib/contract';
import {
  getPlatformStats,
  getContractConfig,
  getMerchant,
  getInvoice,
  getInvoiceNonce,
  isInvoicePayable,
  getSbtcBalance,
  waitForTx,
  type PlatformStats,
  type ContractConfig,
  type Merchant,
  type Invoice,
} from '@/lib/stacks';

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
  refundAmount: number;
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
          Cl.uint(params.invoiceId),
          Cl.uint(params.refundAmount),
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
