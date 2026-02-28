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

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  stxAddress: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
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

  // Check for existing session on mount
  useEffect(() => {
    if (stacksIsConnected()) {
      const addr = getStxAddressFromStorage();
      if (addr) {
        setAddress(addr);
        setStxAddress(addr);
        setIsConnected(true);
      }
    }
  }, []);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const response = await stacksConnect({
        forceWalletSelect: false,
      });

      // Get STX address from response
      // connect() returns { addresses: AddressEntry[] } with symbol property
      if (response?.addresses) {
        const stxAddr = response.addresses.find((a) => a.symbol === 'STX');
        if (stxAddr?.address) {
          setAddress(stxAddr.address);
          setStxAddress(stxAddr.address);
          setIsConnected(true);
        }
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    stacksDisconnect();
    setIsConnected(false);
    setAddress(null);
    setStxAddress(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        address,
        stxAddress,
        isConnecting,
        connect,
        disconnect,
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
