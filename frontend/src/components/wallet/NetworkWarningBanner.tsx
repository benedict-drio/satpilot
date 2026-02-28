import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X, ExternalLink, Info, FlaskConical } from "lucide-react";
import { useWallet, REQUIRED_NETWORK } from "@/contexts/WalletContext";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function NetworkWarningBanner() {
  const { connectionError, clearConnectionError, isConnected } = useWallet();
  const [infoDismissed, setInfoDismissed] = useState(false);

  // Show connection error as floating card
  if (connectionError) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[100]"
        >
          <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl shadow-2xl shadow-red-500/20 border border-red-400/30 p-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20 backdrop-blur shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-white text-sm">
                  Connection Rejected
                </p>
                <p className="text-xs text-white/90 mt-1">
                  {connectionError}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs h-7"
                    onClick={() => window.open(
                      "https://www.hiro.so/blog/how-to-use-testnet-stx-tokens",
                      "_blank"
                    )}
                  >
                    <ExternalLink className="w-3 h-3 mr-1.5" />
                    Get Testnet STX
                  </Button>
                </div>
              </div>
              <button
                onClick={clearConnectionError}
                className="p-1.5 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Show testnet info as small floating badge (bottom-left)
  if (!isConnected && REQUIRED_NETWORK === "testnet" && !infoDismissed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="fixed bottom-4 left-4 z-[100]"
        >
          <div className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full pl-3 pr-2 py-1.5 shadow-lg shadow-orange-500/20 border border-orange-400/30">
            <FlaskConical className="w-4 h-4 text-white" />
            <span className="text-white text-xs font-semibold">
              Testnet Mode
            </span>
            <a 
              href="https://www.hiro.so/blog/how-to-use-testnet-stx-tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-white/80 hover:text-white text-xs underline hover:no-underline"
            >
              Get STX
            </a>
            <button
              onClick={() => setInfoDismissed(true)}
              className="p-0.5 rounded-full hover:bg-white/20 text-white/70 hover:text-white transition-colors ml-1"
              aria-label="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return null;
}
