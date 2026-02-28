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

;; Invoice storage with partial payment support
(define-map invoices
  uint
  {
    merchant: principal,
    amount: uint,
    amount-paid: uint,
    amount-refunded: uint,
    memo: (string-utf8 256),
    reference-id: (optional (string-utf8 64)),
    status: uint,
    payer: (optional principal),
    allow-partial: bool,
    allow-overpay: bool,
    created-at: uint,
    expires-at: uint,
    paid-at: (optional uint)
  }
)

;; Individual payment records (for partial payments tracking)
(define-map invoice-payments
  { invoice-id: uint, payment-index: uint }
  {
    payer: principal,
    amount: uint,
    fee-paid: uint,
    block-height: uint
  }
)

;; Payment count per invoice
(define-map invoice-payment-counts uint uint)

;; Refund records
(define-map refunds
  uint
  {
    invoice-id: uint,
    merchant: principal,
    recipient: principal,
    amount: uint,
    reason: (string-utf8 256),
    processed-at: uint
  }
)

;; ============================================================================
;; PRIVATE HELPER FUNCTIONS
;; ============================================================================

;; Calculate platform fee from amount
(define-private (calculate-fee (amount uint))
  (/ (* amount (var-get platform-fee-bps)) BPS_DENOMINATOR)
)

;; Check if contract is operational
(define-private (is-operational)
  (not (var-get contract-paused))
)

;; Check if caller is owner
(define-private (is-owner)
  (is-eq tx-sender (var-get contract-owner))
)

;; Check if invoice is expired
(define-private (is-invoice-expired (expires-at uint))
  (> stacks-block-height expires-at)
)

;; Get next invoice ID
(define-private (get-next-invoice-id)
  (let ((current-id (var-get invoice-nonce)))
    (var-set invoice-nonce (+ current-id u1))
    (+ current-id u1)
  )
)

;; Get next refund ID
(define-private (get-next-refund-id)
  (let ((current-id (var-get refund-nonce)))
    (var-set refund-nonce (+ current-id u1))
    (+ current-id u1)
  )
)

;; Safe subtraction (prevent underflow)
(define-private (safe-sub (a uint) (b uint))
  (if (>= a b) (- a b) u0)
)

;; ============================================================================
;; AUTHORIZATION CHECKS
;; ============================================================================

(define-read-only (check-is-owner)
  (ok (asserts! (is-owner) ERR_UNAUTHORIZED))
)

(define-read-only (check-is-operational)
  (ok (asserts! (is-operational) ERR_CONTRACT_PAUSED))
)

;; ============================================================================
;; ADMIN FUNCTIONS
;; ============================================================================

;; Pause contract (emergency)
(define-public (pause-contract)
  (begin
    (try! (check-is-owner))
    (var-set contract-paused true)
    (print { event: "contract-paused", by: tx-sender, block: stacks-block-height })
    (ok true)
  )
)

;; Unpause contract
(define-public (unpause-contract)
  (begin
    (try! (check-is-owner))
    (var-set contract-paused false)
    (print { event: "contract-unpaused", by: tx-sender, block: stacks-block-height })
    (ok true)
  )
)

;; Initiate ownership transfer (2-step for security)
(define-public (transfer-ownership (new-owner principal))
  (begin
    (try! (check-is-owner))
    (var-set pending-owner (some new-owner))
    (print { event: "ownership-transfer-initiated", from: tx-sender, to: new-owner })
    (ok true)
  )
)

;; Accept ownership (called by new owner)
(define-public (accept-ownership)
  (let ((pending (unwrap! (var-get pending-owner) ERR_OWNERSHIP_PENDING)))
    (asserts! (is-eq tx-sender pending) ERR_NOT_PENDING_OWNER)
    (var-set contract-owner pending)
    (var-set pending-owner none)
    (print { event: "ownership-transferred", new-owner: tx-sender })
    (ok true)
  )
)

;; Update fee recipient
(define-public (set-fee-recipient (recipient principal))
  (begin
    (try! (check-is-owner))
    (var-set fee-recipient recipient)
    (print { event: "fee-recipient-updated", recipient: recipient })
    (ok true)
  )
)

;; Update platform fee (max 5%)
(define-public (set-platform-fee (fee-bps uint))
  (begin
    (try! (check-is-owner))
    (asserts! (<= fee-bps u500) ERR_INVALID_AMOUNT) ;; Max 5%
    (var-set platform-fee-bps fee-bps)
    (print { event: "platform-fee-updated", fee-bps: fee-bps })
    (ok true)
  )
)

;; Verify merchant (admin only)
(define-public (verify-merchant (merchant-address principal))
  (let ((merchant (unwrap! (map-get? merchants merchant-address) ERR_MERCHANT_NOT_FOUND)))
    (try! (check-is-owner))
    (map-set merchants merchant-address (merge merchant { is-verified: true }))
    (print { event: "merchant-verified", merchant: merchant-address })
    (ok true)
  )
)

;; Suspend merchant (admin only)
(define-public (suspend-merchant (merchant-address principal))
  (let ((merchant (unwrap! (map-get? merchants merchant-address) ERR_MERCHANT_NOT_FOUND)))
    (try! (check-is-owner))
    (map-set merchants merchant-address (merge merchant { is-active: false }))
    (print { event: "merchant-suspended", merchant: merchant-address })
    (ok true)
  )
)

;; ============================================================================
;; MERCHANT FUNCTIONS
;; ============================================================================

;; Register as a merchant
(define-public (register-merchant 
  (name (string-utf8 64))
  (description (optional (string-utf8 256)))
  (webhook-url (optional (string-utf8 256)))
)
  (let (
    (caller tx-sender)
    (new-id (+ (var-get merchant-count) u1))
  )
    (try! (check-is-operational))
    (asserts! (is-none (map-get? merchants caller)) ERR_MERCHANT_EXISTS)
    
    (map-set merchants caller {
      id: new-id,
      name: name,
      description: description,
      webhook-url: webhook-url,
      total-received: u0,
      total-refunded: u0,
      invoice-count: u0,
      registered-at: stacks-block-height,
      is-active: true,
      is-verified: false
    })
    
    (var-set merchant-count new-id)
    
    (print {
      event: "merchant-registered",
      merchant: caller,
      id: new-id,
      name: name,
      block: stacks-block-height
    })
    
    (ok new-id)
  )
)