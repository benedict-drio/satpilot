import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface WalletContextType {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  connect: () => void;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const MOCK_ADDRESS = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7";
const truncate = (addr: string) => `${addr.slice(0, 4)}...${addr.slice(-4)}`;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(() => {
    setIsConnecting(true);
    setTimeout(() => {
      setAddress(MOCK_ADDRESS);
      setIsConnected(true);
      setIsConnecting(false);
    }, 800);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setAddress(null);
  }, []);

  return (
    <WalletContext.Provider value={{ isConnected, address, isConnecting, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}

export { truncate };
