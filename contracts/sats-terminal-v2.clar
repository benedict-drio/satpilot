;; title: SatsTerminal V2
;; version: 2.0.0
;; summary: Enterprise sBTC Payment Terminal for Merchants
;; description: Production-ready payment infrastructure with invoices, partial payments,
;;              refunds, platform fees, and comprehensive merchant management.
;;              Built for Stacks Endowment Grant - Getting Started Track

;; ============================================================================
;; CONSTANTS
;; ============================================================================

;; sBTC token contract reference (testnet & simnet)
(define-constant SBTC_TOKEN 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token)

;; Contract deployer
(define-constant DEPLOYER tx-sender)

;; Error codes - Authorization
(define-constant ERR_UNAUTHORIZED (err u1001))
(define-constant ERR_CONTRACT_PAUSED (err u1002))
(define-constant ERR_OWNERSHIP_PENDING (err u1003))
(define-constant ERR_NOT_PENDING_OWNER (err u1004))

;; Error codes - Merchant
(define-constant ERR_MERCHANT_NOT_FOUND (err u2001))
(define-constant ERR_MERCHANT_EXISTS (err u2002))
(define-constant ERR_MERCHANT_INACTIVE (err u2003))
(define-constant ERR_MERCHANT_SUSPENDED (err u2004))

;; Error codes - Invoice
(define-constant ERR_INVOICE_NOT_FOUND (err u3001))
(define-constant ERR_INVOICE_ALREADY_PAID (err u3002))
(define-constant ERR_INVOICE_EXPIRED (err u3003))
(define-constant ERR_INVOICE_CANCELLED (err u3004))
(define-constant ERR_INVOICE_NOT_PAYABLE (err u3005))
(define-constant ERR_INVALID_AMOUNT (err u3006))
(define-constant ERR_AMOUNT_TOO_LOW (err u3007))
(define-constant ERR_AMOUNT_TOO_HIGH (err u3008))
(define-constant ERR_PARTIAL_NOT_ALLOWED (err u3009))
(define-constant ERR_OVERPAY_NOT_ALLOWED (err u3010))

;; Error codes - Payment & Refund
(define-constant ERR_TRANSFER_FAILED (err u4001))
(define-constant ERR_REFUND_EXCEEDS_PAID (err u4002))
(define-constant ERR_NO_REFUND_AVAILABLE (err u4003))
(define-constant ERR_SELF_PAYMENT (err u4004))

;; Invoice status codes
(define-constant STATUS_PENDING u0)
(define-constant STATUS_PARTIAL u1)
(define-constant STATUS_PAID u2)
(define-constant STATUS_EXPIRED u3)
(define-constant STATUS_CANCELLED u4)
(define-constant STATUS_REFUNDED u5)

;; Platform configuration
(define-constant PLATFORM_FEE_BPS u50)        ;; 0.5% platform fee
(define-constant BPS_DENOMINATOR u10000)
(define-constant MIN_INVOICE_AMOUNT u1000)    ;; 1000 sats minimum (~$1)
(define-constant MAX_INVOICE_AMOUNT u100000000000) ;; 1000 BTC max
(define-constant MAX_EXPIRY_BLOCKS u52560)    ;; ~1 year max expiry

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

;; Contract state
(define-data-var contract-paused bool false)
(define-data-var contract-owner principal DEPLOYER)
(define-data-var pending-owner (optional principal) none)
(define-data-var fee-recipient principal DEPLOYER)
(define-data-var platform-fee-bps uint PLATFORM_FEE_BPS)

;; Counters
(define-data-var invoice-nonce uint u0)
(define-data-var merchant-count uint u0)
(define-data-var refund-nonce uint u0)

;; Global statistics
(define-data-var total-volume uint u0)
(define-data-var total-invoices uint u0)
(define-data-var total-fees-collected uint u0)
(define-data-var total-refunds uint u0)

;; ============================================================================
;; DATA MAPS
;; ============================================================================

;; Merchant registry with full profile
(define-map merchants
  principal
  {
    id: uint,
    name: (string-utf8 64),
    description: (optional (string-utf8 256)),
    webhook-url: (optional (string-utf8 256)),
    total-received: uint,
    total-refunded: uint,
    invoice-count: uint,
    registered-at: uint,
    is-active: bool,
    is-verified: bool
  }
)