import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  LogOut,
  Loader2,
  Copy,
  Check,
  ExternalLink,
  ChevronDown,
  Shield,
  AlertTriangle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useWallet, truncate, REQUIRED_NETWORK } from "@/contexts/WalletContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface WalletButtonProps {
  variant?: "default" | "compact" | "minimal";
  className?: string;
  showNetwork?: boolean;
}

export function WalletButton({
  variant = "default",
  className,
  showNetwork = true,
}: WalletButtonProps) {
  const { isConnected, address, isConnecting, isWrongNetwork, walletNetwork, connectionError, connect, disconnect, clearConnectionError } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      if (error instanceof Error) {
        toast({
          variant: "destructive",
          title: "Connection Failed",
          description: error.message,
        });
      }
    }
  };

  const copyAddress = async () => {
    if (!address) return;
    await navigator.clipboard.writeText(address);
    setCopied(true);
    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const openExplorer = () => {
    if (!address) return;
    const network = walletNetwork || REQUIRED_NETWORK;
    const baseUrl = network === "mainnet" 
      ? "https://explorer.stacks.co/address"
      : "https://explorer.hiro.so/address";
    window.open(`${baseUrl}/${address}?chain=${network}`, "_blank");
  };

  // Connected state
  if (isConnected && address) {
    if (variant === "minimal") {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full",
                "bg-success/10 border border-success/20 text-success",
                "text-xs font-medium transition-all hover:bg-success/20",
                className
              )}
            >
              <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
              {truncate(address, 4, 4)}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <ConnectedMenuContent
              address={address}
              copied={copied}
              copyAddress={copyAddress}
              openExplorer={openExplorer}
              disconnect={disconnect}
              showNetwork={showNetwork}
              isWrongNetwork={isWrongNetwork}
              walletNetwork={walletNetwork}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            className={cn(
              "group flex items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
              isWrongNetwork
                ? "border-destructive/40 bg-destructive/5 hover:bg-destructive/10"
                : "border-border bg-card hover:bg-secondary",
              className
            )}
            whileTap={{ scale: 0.98 }}
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
          >
            {/* Status dot — quiet by default, pings on hover */}
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full rounded-full opacity-60 group-hover:animate-ping",
                  isWrongNetwork ? "bg-destructive" : "bg-success"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  isWrongNetwork ? "bg-destructive" : "bg-success"
                )}
              />
            </span>

            {isWrongNetwork ? (
              <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
            ) : (
              <Wallet className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}

            <div className="flex flex-col items-start leading-tight">
              <span className={cn("font-mono", isWrongNetwork ? "text-destructive" : "text-foreground")}>
                {truncate(address, 4, 4)}
              </span>
              {showNetwork && variant !== "compact" && (
                <span
                  className={cn(
                    "text-[10px] uppercase tracking-wider",
                    isWrongNetwork ? "text-destructive/80" : "text-muted-foreground"
                  )}
                >
                  {isWrongNetwork ? "Wrong network" : REQUIRED_NETWORK === "mainnet" ? "Mainnet" : "Testnet"}
                </span>
              )}
            </div>

            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                isWrongNetwork ? "text-destructive/60" : "text-muted-foreground",
                isHovered && "rotate-180"
              )}
            />
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
          <ConnectedMenuContent
            address={address}
            copied={copied}
            copyAddress={copyAddress}
            openExplorer={openExplorer}
            disconnect={disconnect}
            showNetwork={showNetwork}
            isWrongNetwork={isWrongNetwork}
            walletNetwork={walletNetwork}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Disconnected state
  if (variant === "minimal") {
    return (
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        size="sm"
        className={cn(
          "gap-2 rounded-full text-xs",
          className
        )}
      >
        {isConnecting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Wallet className="w-3 h-3" />
        )}
        {isConnecting ? "Connecting" : "Connect"}
      </Button>
    );
  }

  return (
    <motion.button
      onClick={handleConnect}
      disabled={isConnecting}
      className={cn(
        "group relative flex items-center gap-2 px-5 py-2.5 rounded-xl",
        "gradient-bitcoin text-primary-foreground font-semibold text-sm",
        "shadow-glow hover:brightness-110",
        "disabled:opacity-70 disabled:cursor-not-allowed",
        "transition-all duration-300",
        variant === "compact" && "px-4 py-2",
        className
      )}
      whileHover={{ scale: isConnecting ? 1 : 1.02 }}
      whileTap={{ scale: isConnecting ? 1 : 0.98 }}
    >
      {/* Content */}
      <div className="relative flex items-center gap-2">
        <AnimatePresence mode="wait">
          {isConnecting ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, rotate: -180 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 180 }}
            >
              <Loader2 className="w-4 h-4 animate-spin" />
            </motion.div>
          ) : (
            <motion.div
              key="wallet"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
            >
              <Wallet className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>
        <span>{isConnecting ? "Connecting…" : "Connect Wallet"}</span>
        {/* Testnet badge */}
        {REQUIRED_NETWORK === "testnet" && !isConnecting && variant !== "compact" && (
          <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-white/20 rounded tracking-wider">
            Testnet
          </span>
        )}
      </div>
    </motion.button>
  );
}

// Menu content for connected state
function ConnectedMenuContent({
  address,
  copied,
  copyAddress,
  openExplorer,
  disconnect,
  showNetwork,
  isWrongNetwork,
  walletNetwork,
}: {
  address: string;
  copied: boolean;
  copyAddress: () => void;
  openExplorer: () => void;
  disconnect: () => void;
  showNetwork: boolean;
  isWrongNetwork: boolean;
  walletNetwork: "mainnet" | "testnet" | null;
}) {
  return (
    <>
      {/* Wrong network warning */}
      {isWrongNetwork && (
        <div className="px-2 py-3 mb-2 rounded-lg bg-destructive/10 border border-destructive/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div className="text-xs">
              <p className="font-semibold text-destructive">Wrong Network</p>
              <p className="text-muted-foreground mt-0.5">
                Connected to <span className="font-medium capitalize">{walletNetwork}</span>.
                This app requires <span className="font-medium capitalize">{REQUIRED_NETWORK}</span>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className={cn(
        "px-2 py-3 mb-2 rounded-lg",
        isWrongNetwork ? "bg-destructive/5" : "bg-muted/50"
      )}>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-10 h-10 rounded-lg border",
            isWrongNetwork 
              ? "bg-destructive/20 border-destructive/30"
              : "bg-success/20 border-success/30"
          )}>
            {isWrongNetwork ? (
              <AlertTriangle className="w-5 h-5 text-destructive" />
            ) : (
              <Shield className="w-5 h-5 text-success" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{truncate(address, 6, 6)}</p>
            {showNetwork && (
              <p className={cn(
                "text-xs flex items-center gap-1.5",
                isWrongNetwork ? "text-destructive" : "text-muted-foreground"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full",
                  isWrongNetwork ? "bg-destructive" : "bg-success"
                )} />
                {isWrongNetwork 
                  ? `${walletNetwork} (wrong)` 
                  : (REQUIRED_NETWORK === "mainnet" ? "Stacks Mainnet" : "Stacks Testnet")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <DropdownMenuItem
        onClick={copyAddress}
        className="gap-3 py-2.5 cursor-pointer rounded-lg"
      >
        {copied ? (
          <Check className="w-4 h-4 text-success" />
        ) : (
          <Copy className="w-4 h-4 text-muted-foreground" />
        )}
        <span>{copied ? "Copied!" : "Copy Address"}</span>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={openExplorer}
        className="gap-3 py-2.5 cursor-pointer rounded-lg"
      >
        <ExternalLink className="w-4 h-4 text-muted-foreground" />
        <span>View on Explorer</span>
      </DropdownMenuItem>

      <DropdownMenuSeparator className="my-2" />

      <DropdownMenuItem
        onClick={disconnect}
        className="gap-3 py-2.5 cursor-pointer rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
      >
        <LogOut className="w-4 h-4" />
        <span>Disconnect</span>
      </DropdownMenuItem>
    </>
  );
}
