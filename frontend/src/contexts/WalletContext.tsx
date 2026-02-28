import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  connect as stacksConnect,
  disconnect as stacksDisconnect,
  isConnected as stacksIsConnected,
  getLocalStorage,
} from "@stacks/connect";
import { NETWORK } from "@/lib/contract";

// Detect network from address prefix
export function getNetworkFromAddress(address: string): "mainnet" | "testnet" | null {
  if (address.startsWith("SP")) return "mainnet";
  if (address.startsWith("ST")) return "testnet";
  return null;
}

// Required network for this app
export const REQUIRED_NETWORK = NETWORK as "mainnet" | "testnet";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  stxAddress: string | null;
  isConnecting: boolean;
  isWrongNetwork: boolean;
  walletNetwork: "mainnet" | "testnet" | null;
  connectionError: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearConnectionError: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const truncate = (addr: string, start = 4, end = 4) =>
  addr.length <= start + end + 3
    ? addr
    : `${addr.slice(0, start)}...${addr.slice(-end)}`;

// Helper to get STX address from stored addresses
function getStxAddressFromStorage(): string | null {
  try {
    const storage = getLocalStorage();
    // addresses structure: { stx: [{ address }], btc: [{ address }] }
    if (storage?.addresses?.stx?.[0]?.address) {
      return storage.addresses.stx[0].address;
    }
    return null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [stxAddress, setStxAddress] = useState<string | null>(null);
  const [walletNetwork, setWalletNetwork] = useState<"mainnet" | "testnet" | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const clearConnectionError = useCallback(() => setConnectionError(null), []);

  // Compute if wrong network
  const isWrongNetwork = walletNetwork !== null && walletNetwork !== REQUIRED_NETWORK;

  // Helper to set address and detect network
  const setAddressWithNetwork = useCallback((addr: string | null) => {
    setAddress(addr);
    setStxAddress(addr);
    if (addr) {
      setWalletNetwork(getNetworkFromAddress(addr));
    } else {
      setWalletNetwork(null);
    }
  }, []);

  // Check for existing session on mount - auto-disconnect if wrong network
  useEffect(() => {
    if (stacksIsConnected()) {
      const addr = getStxAddressFromStorage();
      if (addr) {
        const network = getNetworkFromAddress(addr);
        if (network !== REQUIRED_NETWORK) {
          // Wrong network - disconnect and don't restore session
          stacksDisconnect();
          console.warn(`Auto-disconnected: ${network} wallet detected, but ${REQUIRED_NETWORK} is required.`);
        } else {
          setAddressWithNetwork(addr);
          setIsConnected(true);
        }
      }
    }
  }, [setAddressWithNetwork]);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      const response = await stacksConnect({
        forceWalletSelect: false,
      });

      // Get STX address from response
      // connect() returns { addresses: AddressEntry[] } with symbol property
      if (response?.addresses) {
        const stxAddr = response.addresses.find((a) => a.symbol === 'STX');
        if (stxAddr?.address) {
          const network = getNetworkFromAddress(stxAddr.address);
          
          // Reject mainnet connections when testnet is required (and vice versa)
          if (network !== REQUIRED_NETWORK) {
            // Immediately disconnect the wrong-network wallet
            stacksDisconnect();
            const errorMsg = `Wrong network! You connected a ${network} wallet, but this app requires ${REQUIRED_NETWORK}. Please switch to a ${REQUIRED_NETWORK} account in your wallet and try again.`;
            setConnectionError(errorMsg);
            throw new Error(errorMsg);
          }
          
          setAddressWithNetwork(stxAddr.address);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
      if (error instanceof Error && error.message.includes("Wrong network")) {
        // Re-throw network errors so UI can handle them
        throw error;
      }
    } finally {
      setIsConnecting(false);
    }
  }, [setAddressWithNetwork]);

  const disconnect = useCallback(() => {
    stacksDisconnect();
    setIsConnected(false);
    setAddressWithNetwork(null);
    setConnectionError(null);
  }, [setAddressWithNetwork]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        stxAddress,
        isConnecting,
        isWrongNetwork,
        walletNetwork,
        connectionError,
        connect,
        disconnect,
        clearConnectionError,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
