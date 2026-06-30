;; title: Satpilot
;; version: 1.0.0
;; summary: Enterprise sBTC Payment Rails for Merchants
;; description: Production-ready payment infrastructure with invoices, partial payments,
;;              refunds, platform fees, and comprehensive merchant management.
;;              Built for Stacks Endowment Grant - Getting Started Track

;; ============================================================================
;; CONSTANTS
;; ============================================================================

;; SIP-010 trait - the canonical standard trait, so we call sBTC as a checked token arg.
;; NOTE: this is the TESTNET trait principal. For a mainnet deploy, change it to
;; 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE.sip-010-trait-ft-standard.sip-010-trait
(use-trait ft-trait 'ST1NXBK3K5YYMD6FD41MVNP3JS1GABZ8TRVX023PT.sip-010-trait-ft-standard.sip-010-trait)

;; Default sBTC token contract (mainnet). On other networks the owner points the
;; `sbtc-token` data-var at the correct deployment via set-sbtc-token, then locks it.
(define-constant SBTC_CONTRACT 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token)

;; Contract deployer
(define-constant DEPLOYER tx-sender)

;; Error codes - Authorization
(define-constant ERR_UNAUTHORIZED (err u1001))
(define-constant ERR_CONTRACT_PAUSED (err u1002))
(define-constant ERR_OWNERSHIP_PENDING (err u1003))
(define-constant ERR_NOT_PENDING_OWNER (err u1004))
(define-constant ERR_INVALID_INPUT (err u1005))
(define-constant ERR_NO_PENDING_CONFIG (err u1006))
(define-constant ERR_TIMELOCK_NOT_EXPIRED (err u1007))

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
(define-constant ERR_INVOICE_NOT_EXPIRED (err u3011))
(define-constant ERR_DUPLICATE_REFERENCE (err u3012))
(define-constant ERR_INVALID_ASSET (err u3013))
(define-constant ERR_WRONG_ASSET (err u3014))

;; Error codes - Payment & Refund
(define-constant ERR_TRANSFER_FAILED (err u4001))
(define-constant ERR_REFUND_EXCEEDS_PAID (err u4002))
(define-constant ERR_NO_REFUND_AVAILABLE (err u4003))
(define-constant ERR_SELF_PAYMENT (err u4004))
(define-constant ERR_INVALID_TOKEN (err u4005))
(define-constant ERR_TOKEN_LOCKED (err u4006))

;; Error codes - Agentic payments (vault + mandates)
(define-constant ERR_MANDATE_NOT_FOUND   (err u5001))
(define-constant ERR_MANDATE_REVOKED     (err u5002))
(define-constant ERR_MANDATE_EXPIRED     (err u5003))
(define-constant ERR_WINDOW_CAP_EXCEEDED (err u5004))  ;; payment would exceed the rolling-window budget
(define-constant ERR_PER_TX_LIMIT        (err u5005))  ;; single payment over per-tx cap
(define-constant ERR_INSUFFICIENT_VAULT  (err u5006))  ;; owner's vault can't cover it
(define-constant ERR_AGENT_IS_OWNER      (err u5007))  ;; an owner cannot grant a mandate to itself
(define-constant ERR_MANDATE_EXISTS      (err u5008))  ;; an active mandate already exists for this agent
(define-constant ERR_RECIPIENT_NOT_ALLOWED (err u5009)) ;; invoice merchant is not on the mandate's allowlist
(define-constant ERR_VAULT_NOT_EMPTY     (err u5010))  ;; sBTC token can't be changed while vaults hold sBTC

;; Payment assets (which token an invoice is denominated in / paid with)
(define-constant ASSET_SBTC u0)   ;; sBTC (SIP-010), amounts in sats (8 decimals)
(define-constant ASSET_STX u1)    ;; native STX, amounts in micro-STX (6 decimals)

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
(define-constant MAX_EXPIRY_BLOCKS u52560)    ;; ~1 year max expiry (burn/Bitcoin blocks, ~144/day)
(define-constant MIN_PAYMENT_AMOUNT u1000)    ;; min per partial payment (prevents dust / fee-rounding evasion)
(define-constant TIMELOCK_BLOCKS u144)        ;; ~1 day delay on fee changes (burn/Bitcoin blocks)

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

;; Contract state
(define-data-var contract-paused bool false)
(define-data-var contract-owner principal DEPLOYER)
(define-data-var pending-owner (optional principal) none)
(define-data-var fee-recipient principal DEPLOYER)
(define-data-var platform-fee-bps uint PLATFORM_FEE_BPS)

;; Expected sBTC token. Defaults to mainnet; owner sets the right one per network
;; (then locks it) so the same bytecode runs portably on testnet and mainnet.
(define-data-var sbtc-token principal SBTC_CONTRACT)
(define-data-var sbtc-token-locked bool false)

;; Total sBTC currently escrowed across all vaults (== sum of sBTC vault-balances).
;; Used to block set-sbtc-token while funds are held, preventing token/accounting mismatch.
(define-data-var total-sbtc-vaulted uint u0)

;; Timelocked, pending change to fee config (none when no change is queued).
;; Both the fee rate and recipient are proposed together and applied atomically.
(define-data-var pending-config
  (optional { bps: uint, recipient: principal, execute-after: uint })
  none
)

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
    is-active: bool,        ;; self-controlled: merchant toggles via (de)activate-merchant
    is-suspended: bool,     ;; admin-controlled: only owner can set/clear; blocks self-reactivation
    is-verified: bool
  }
)

;; Invoice storage with partial payment support
(define-map invoices
  uint
  {
    merchant: principal,
    asset: uint,              ;; ASSET_SBTC or ASSET_STX
    amount: uint,
    amount-paid: uint,        ;; gross paid by all payers (drives PAID/PARTIAL status)
    amount-refunded: uint,    ;; net refunded so far (drives REFUNDED status)
    net-received: uint,       ;; gross paid minus platform fees = max refundable
    fee-bps: uint,            ;; platform fee rate snapshotted at creation (payer-stable)
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

;; Merchant -> invoice index: lets clients enumerate a merchant's invoices on-chain.
;; seq runs 1..(get invoice-count merchant); maps to the global invoice id.
(define-map merchant-invoice-ids
  { merchant: principal, seq: uint }
  uint
)

;; Idempotency index: a merchant's external reference-id maps to one invoice id.
;; Prevents duplicate invoices for the same order and enables order-id lookups.
(define-map merchant-reference
  { merchant: principal, reference-id: (string-utf8 64) }
  uint
)

;; Per-payer ledger: tracks the net amount (after platform fee) the merchant
;; received from each payer on an invoice, and how much has been refunded back.
;; Refunds are issued per payer against this ledger so funds always return to the
;; address that actually paid, capped at what the merchant received (fees are non-refundable).
(define-map invoice-payer-ledger
  { invoice-id: uint, payer: principal }
  { net-paid: uint, refunded: uint }
)

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
;; AGENTIC PAYMENT STATE (vault + mandates)
;; ============================================================================

;; Owner-funded balances the contract custodies, per asset. Agents spend against
;; this; owners can withdraw the unspent remainder at any time. Funds are escrowed
;; by the contract so an agent never needs the owner's signing key.
(define-map vault-balances
  { owner: principal, asset: uint }
  uint
)

;; A scoped spending authority an owner grants to an agent principal.
;;   per-tx-limit   - max amount per single payment
;;   window-blocks  - length of the rolling budget window (in burn/Bitcoin blocks)
;;   window-cap     - max total spend allowed within any one window
;;   window-start   - burn block the current window began at (lazily rolled forward)
;;   window-spent   - amount already spent inside the current window
;;   expires-at     - burn block after which the mandate is dead regardless of budget
;;   active         - owner can revoke instantly by clearing this
;;   restricted     - when true, the agent may only pay merchants in `allowed`
;;   allowed        - the recipient (merchant) allowlist; ignored unless `restricted`
;; A lifetime cap is just a mandate whose window-blocks span its whole duration.
(define-map mandates
  { owner: principal, agent: principal }
  {
    asset: uint,
    per-tx-limit: uint,
    window-blocks: uint,
    window-cap: uint,
    window-start: uint,
    window-spent: uint,
    expires-at: uint,
    active: bool,
    created-at: uint,
    restricted: bool,
    allowed: (list 20 principal)
  }
)

;; ============================================================================
;; PRIVATE HELPER FUNCTIONS
;; ============================================================================

;; Calculate platform fee for a given bps rate (used with the invoice's snapshotted rate)
(define-private (calculate-fee-with-bps (amount uint) (bps uint))
  (/ (* amount bps) BPS_DENOMINATOR)
)

;; Preview the platform fee for an amount at the current live rate (read-only helper)
(define-read-only (calculate-fee (amount uint))
  (calculate-fee-with-bps amount (var-get platform-fee-bps))
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
  (> burn-block-height expires-at)
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

;; Normalize a mandate's rolling window against the current burn block. If the
;; current window has fully elapsed, the window resets: it restarts now with zero
;; spent. Returns the effective { window-start, window-spent } to charge against.
(define-private (roll-window (m {
    asset: uint, per-tx-limit: uint, window-blocks: uint, window-cap: uint,
    window-start: uint, window-spent: uint, expires-at: uint, active: bool, created-at: uint,
    restricted: bool, allowed: (list 20 principal) }))
  (if (>= burn-block-height (+ (get window-start m) (get window-blocks m)))
    { window-start: burn-block-height, window-spent: u0 }
    { window-start: (get window-start m), window-spent: (get window-spent m) }
  )
)

;; Returns true if the mandate permits paying `merchant` (unrestricted, or on the allowlist).
(define-private (mandate-allows-recipient (m {
    asset: uint, per-tx-limit: uint, window-blocks: uint, window-cap: uint,
    window-start: uint, window-spent: uint, expires-at: uint, active: bool, created-at: uint,
    restricted: bool, allowed: (list 20 principal) }) (merchant principal))
  (or (not (get restricted m))
      (is-some (index-of? (get allowed m) merchant)))
)

;; Shared payment validation (asset-agnostic). Returns (ok true) or an error.
(define-private (assert-payable (invoice-id uint) (payer principal) (amount uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (merchant-data (unwrap! (map-get? merchants (get merchant invoice)) ERR_MERCHANT_NOT_FOUND))
    (remaining (safe-sub (get amount invoice) (get amount-paid invoice)))
  )
    (asserts! (not (is-eq payer (get merchant invoice))) ERR_SELF_PAYMENT)
    (asserts! (not (get is-suspended merchant-data)) ERR_MERCHANT_SUSPENDED)
    (asserts! (get is-active merchant-data) ERR_MERCHANT_INACTIVE)
    (asserts! (not (is-invoice-expired (get expires-at invoice))) ERR_INVOICE_EXPIRED)
    (asserts! (or (is-eq (get status invoice) STATUS_PENDING)
                  (is-eq (get status invoice) STATUS_PARTIAL)) ERR_INVOICE_NOT_PAYABLE)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    ;; Min payment unless it clears the balance (blocks dust / fee-rounding evasion)
    (asserts! (or (>= amount MIN_PAYMENT_AMOUNT) (>= amount remaining)) ERR_AMOUNT_TOO_LOW)
    (asserts! (or (get allow-partial invoice) (>= amount remaining)) ERR_PARTIAL_NOT_ALLOWED)
    (asserts! (or (get allow-overpay invoice) (<= amount remaining)) ERR_OVERPAY_NOT_ALLOWED)
    (ok true)
  )
)

;; Shared post-transfer bookkeeping for a payment (asset-agnostic).
(define-private (finalize-payment (invoice-id uint) (payer principal) (amount uint) (fee uint) (merchant-amount uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (merchant-data (unwrap! (map-get? merchants (get merchant invoice)) ERR_MERCHANT_NOT_FOUND))
    (payment-count (default-to u0 (map-get? invoice-payment-counts invoice-id)))
    (new-amount-paid (+ (get amount-paid invoice) amount))
    (new-status (if (>= (+ (get amount-paid invoice) amount) (get amount invoice)) STATUS_PAID STATUS_PARTIAL))
    (payer-ledger (default-to { net-paid: u0, refunded: u0 }
                    (map-get? invoice-payer-ledger { invoice-id: invoice-id, payer: payer })))
  )
    ;; Record the individual payment
    (map-set invoice-payments { invoice-id: invoice-id, payment-index: payment-count }
      { payer: payer, amount: amount, fee-paid: fee, block-height: burn-block-height })
    (map-set invoice-payment-counts invoice-id (+ payment-count u1))
    ;; Per-payer net ledger (for fee-capped, correctly-targeted refunds)
    (map-set invoice-payer-ledger { invoice-id: invoice-id, payer: payer }
      (merge payer-ledger { net-paid: (+ (get net-paid payer-ledger) merchant-amount) }))
    ;; Invoice totals + status
    (map-set invoices invoice-id (merge invoice {
      amount-paid: new-amount-paid,
      net-received: (+ (get net-received invoice) merchant-amount),
      status: new-status,
      payer: (some payer),
      paid-at: (if (is-eq new-status STATUS_PAID) (some burn-block-height) (get paid-at invoice))
    }))
    ;; Merchant + global stats
    (map-set merchants (get merchant invoice)
      (merge merchant-data { total-received: (+ (get total-received merchant-data) merchant-amount) }))
    (var-set total-volume (+ (var-get total-volume) amount))
    (var-set total-fees-collected (+ (var-get total-fees-collected) fee))
    (print {
      event: "invoice-payment",
      invoice-id: invoice-id,
      payer: payer,
      amount: amount,
      fee: fee,
      asset: (get asset invoice),
      new-status: new-status,
      total-paid: new-amount-paid
    })
    (ok { status: new-status, amount-paid: new-amount-paid, remaining: (safe-sub (get amount invoice) new-amount-paid) })
  )
)

;; Shared refund validation (merchant-only, per-payer, fee-capped). Returns (ok true) or error.
(define-private (assert-refundable (invoice-id uint) (recipient principal) (refund-amount uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (payer-ledger (unwrap! (map-get? invoice-payer-ledger { invoice-id: invoice-id, payer: recipient }) ERR_NO_REFUND_AVAILABLE))
    (refundable (safe-sub (get net-paid payer-ledger) (get refunded payer-ledger)))
  )
    (asserts! (is-eq tx-sender (get merchant invoice)) ERR_UNAUTHORIZED)
    (asserts! (> refundable u0) ERR_NO_REFUND_AVAILABLE)
    (asserts! (<= refund-amount refundable) ERR_REFUND_EXCEEDS_PAID)
    (asserts! (> refund-amount u0) ERR_INVALID_AMOUNT)
    (ok true)
  )
)

;; Shared post-transfer bookkeeping for a refund (asset-agnostic). Returns the refund id.
(define-private (finalize-refund (invoice-id uint) (recipient principal) (refund-amount uint) (reason (string-utf8 256)))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (merchant-data (unwrap! (map-get? merchants (get merchant invoice)) ERR_MERCHANT_NOT_FOUND))
    (caller tx-sender)
    (payer-ledger (unwrap! (map-get? invoice-payer-ledger { invoice-id: invoice-id, payer: recipient }) ERR_NO_REFUND_AVAILABLE))
    (refund-id (get-next-refund-id))
    (new-refunded (+ (get amount-refunded invoice) refund-amount))
  )
    (map-set invoice-payer-ledger { invoice-id: invoice-id, payer: recipient }
      (merge payer-ledger { refunded: (+ (get refunded payer-ledger) refund-amount) }))
    (map-set refunds refund-id {
      invoice-id: invoice-id,
      merchant: caller,
      recipient: recipient,
      amount: refund-amount,
      reason: reason,
      processed-at: burn-block-height
    })
    (map-set invoices invoice-id (merge invoice {
      amount-refunded: new-refunded,
      status: (if (>= new-refunded (get net-received invoice)) STATUS_REFUNDED (get status invoice))
    }))
    (map-set merchants caller (merge merchant-data { total-refunded: (+ (get total-refunded merchant-data) refund-amount) }))
    (var-set total-refunds (+ (var-get total-refunds) refund-amount))
    (print {
      event: "invoice-refunded",
      refund-id: refund-id,
      invoice-id: invoice-id,
      merchant: caller,
      recipient: recipient,
      amount: refund-amount,
      asset: (get asset invoice),
      reason: reason
    })
    (ok refund-id)
  )
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
    (print { event: "contract-paused", by: tx-sender, block: burn-block-height })
    (ok true)
  )
)

;; Unpause contract
(define-public (unpause-contract)
  (begin
    (try! (check-is-owner))
    (var-set contract-paused false)
    (print { event: "contract-unpaused", by: tx-sender, block: burn-block-height })
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

;; --- Timelocked fee configuration (fee rate + recipient) ---
;; Money-moving config changes are queued and can only be executed after
;; TIMELOCK_BLOCKS, giving the public time to react if the owner key is compromised.

;; Step 1: propose a new fee rate and recipient (owner only)
(define-public (propose-config-change (new-fee-bps uint) (new-recipient principal))
  (begin
    (try! (check-is-owner))
    (asserts! (<= new-fee-bps u500) ERR_INVALID_AMOUNT) ;; Max 5%
    (var-set pending-config (some {
      bps: new-fee-bps,
      recipient: new-recipient,
      execute-after: (+ burn-block-height TIMELOCK_BLOCKS)
    }))
    (print {
      event: "config-change-proposed",
      fee-bps: new-fee-bps,
      recipient: new-recipient,
      execute-after: (+ burn-block-height TIMELOCK_BLOCKS)
    })
    (ok true)
  )
)

;; Step 2 (anytime before execution): cancel a queued change (owner only)
(define-public (cancel-config-change)
  (begin
    (try! (check-is-owner))
    (asserts! (is-some (var-get pending-config)) ERR_NO_PENDING_CONFIG)
    (var-set pending-config none)
    (print { event: "config-change-cancelled", by: tx-sender })
    (ok true)
  )
)

;; Step 3: execute the queued change once the timelock has elapsed (owner only)
(define-public (execute-config-change)
  (let ((pending (unwrap! (var-get pending-config) ERR_NO_PENDING_CONFIG)))
    (try! (check-is-owner))
    (asserts! (>= burn-block-height (get execute-after pending)) ERR_TIMELOCK_NOT_EXPIRED)
    (var-set platform-fee-bps (get bps pending))
    (var-set fee-recipient (get recipient pending))
    (var-set pending-config none)
    (print {
      event: "config-change-executed",
      fee-bps: (get bps pending),
      recipient: (get recipient pending)
    })
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

;; Suspend merchant (admin only). Sets the admin-controlled flag so the merchant
;; cannot re-enable itself via activate-merchant.
(define-public (suspend-merchant (merchant-address principal))
  (let ((merchant (unwrap! (map-get? merchants merchant-address) ERR_MERCHANT_NOT_FOUND)))
    (try! (check-is-owner))
    (map-set merchants merchant-address (merge merchant { is-suspended: true }))
    (print { event: "merchant-suspended", merchant: merchant-address })
    (ok true)
  )
)

;; Lift an admin suspension (admin only)
(define-public (unsuspend-merchant (merchant-address principal))
  (let ((merchant (unwrap! (map-get? merchants merchant-address) ERR_MERCHANT_NOT_FOUND)))
    (try! (check-is-owner))
    (map-set merchants merchant-address (merge merchant { is-suspended: false }))
    (print { event: "merchant-unsuspended", merchant: merchant-address })
    (ok true)
  )
)

;; Point the contract at the correct sBTC token for this network (owner only,
;; only while unlocked). Payments/refunds enforce that the token passed in equals this.
(define-public (set-sbtc-token (token principal))
  (begin
    (try! (check-is-owner))
    (asserts! (not (var-get sbtc-token-locked)) ERR_TOKEN_LOCKED)
    ;; Refuse to swap the token out from under escrowed funds (would strand them).
    (asserts! (is-eq (var-get total-sbtc-vaulted) u0) ERR_VAULT_NOT_EMPTY)
    (var-set sbtc-token token)
    (print { event: "sbtc-token-set", token: token })
    (ok true)
  )
)

;; Permanently lock the sBTC token so it can never be changed again (owner only).
(define-public (lock-sbtc-token)
  (begin
    (try! (check-is-owner))
    (var-set sbtc-token-locked true)
    (print { event: "sbtc-token-locked", token: (var-get sbtc-token) })
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
    (asserts! (> (len name) u0) ERR_INVALID_INPUT)

    (map-set merchants caller {
      id: new-id,
      name: name,
      description: description,
      webhook-url: webhook-url,
      total-received: u0,
      total-refunded: u0,
      invoice-count: u0,
      registered-at: burn-block-height,
      is-active: true,
      is-suspended: false,
      is-verified: false
    })
    
    (var-set merchant-count new-id)
    
    (print {
      event: "merchant-registered",
      merchant: caller,
      id: new-id,
      name: name,
      block: burn-block-height
    })
    
    (ok new-id)
  )
)

;; Update merchant profile
(define-public (update-merchant-profile
  (name (string-utf8 64))
  (description (optional (string-utf8 256)))
  (webhook-url (optional (string-utf8 256)))
)
  (let (
    (caller tx-sender)
    (merchant (unwrap! (map-get? merchants caller) ERR_MERCHANT_NOT_FOUND))
  )
    (try! (check-is-operational))
    (asserts! (> (len name) u0) ERR_INVALID_INPUT)

    (map-set merchants caller (merge merchant {
      name: name,
      description: description,
      webhook-url: webhook-url
    }))
    
    (print { event: "merchant-profile-updated", merchant: caller })
    (ok true)
  )
)

;; Deactivate merchant (self)
(define-public (deactivate-merchant)
  (let (
    (caller tx-sender)
    (merchant (unwrap! (map-get? merchants caller) ERR_MERCHANT_NOT_FOUND))
  )
    (map-set merchants caller (merge merchant { is-active: false }))
    (print { event: "merchant-deactivated", merchant: caller })
    (ok true)
  )
)

;; Reactivate merchant (self)
(define-public (activate-merchant)
  (let (
    (caller tx-sender)
    (merchant (unwrap! (map-get? merchants caller) ERR_MERCHANT_NOT_FOUND))
  )
    (try! (check-is-operational))
    (asserts! (not (get is-suspended merchant)) ERR_MERCHANT_SUSPENDED)
    (map-set merchants caller (merge merchant { is-active: true }))
    (print { event: "merchant-activated", merchant: caller })
    (ok true)
  )
)

;; ============================================================================
;; INVOICE FUNCTIONS
;; ============================================================================

;; Create a new invoice. `asset` is ASSET_SBTC or ASSET_STX.
(define-public (create-invoice
  (amount uint)
  (asset uint)
  (memo (string-utf8 256))
  (reference-id (optional (string-utf8 64)))
  (expires-in-blocks uint)
  (allow-partial bool)
  (allow-overpay bool)
)
  (let (
    (caller tx-sender)
    (merchant (unwrap! (map-get? merchants caller) ERR_MERCHANT_NOT_FOUND))
    (invoice-id (get-next-invoice-id))
    (expiry-block (+ burn-block-height expires-in-blocks))
    (merchant-seq (+ (get invoice-count merchant) u1))
  )
    (try! (check-is-operational))
    (asserts! (not (get is-suspended merchant)) ERR_MERCHANT_SUSPENDED)
    (asserts! (get is-active merchant) ERR_MERCHANT_INACTIVE)
    (asserts! (or (is-eq asset ASSET_SBTC) (is-eq asset ASSET_STX)) ERR_INVALID_ASSET)
    (asserts! (>= amount MIN_INVOICE_AMOUNT) ERR_AMOUNT_TOO_LOW)
    (asserts! (<= amount MAX_INVOICE_AMOUNT) ERR_AMOUNT_TOO_HIGH)
    (asserts! (> expires-in-blocks u0) ERR_INVALID_INPUT)
    (asserts! (<= expires-in-blocks MAX_EXPIRY_BLOCKS) ERR_INVALID_INPUT)
    ;; Idempotency: a reference-id can map to at most one invoice per merchant
    (asserts! (match reference-id
                ref (is-none (map-get? merchant-reference { merchant: caller, reference-id: ref }))
                true)
              ERR_DUPLICATE_REFERENCE)

    (map-set invoices invoice-id {
      merchant: caller,
      asset: asset,
      amount: amount,
      amount-paid: u0,
      amount-refunded: u0,
      net-received: u0,
      fee-bps: (var-get platform-fee-bps),
      memo: memo,
      reference-id: reference-id,
      status: STATUS_PENDING,
      payer: none,
      allow-partial: allow-partial,
      allow-overpay: allow-overpay,
      created-at: burn-block-height,
      expires-at: expiry-block,
      paid-at: none
    })
    
    (map-set invoice-payment-counts invoice-id u0)

    ;; Index this invoice under the merchant for on-chain enumeration
    (map-set merchant-invoice-ids { merchant: caller, seq: merchant-seq } invoice-id)

    ;; Index by external reference-id for idempotency / order lookups
    (match reference-id
      ref (map-set merchant-reference { merchant: caller, reference-id: ref } invoice-id)
      true)

    ;; Update merchant stats
    (map-set merchants caller (merge merchant {
      invoice-count: merchant-seq
    }))

    (var-set total-invoices (+ (var-get total-invoices) u1))
    
    (print {
      event: "invoice-created",
      invoice-id: invoice-id,
      merchant: caller,
      asset: asset,
      amount: amount,
      expires-at: expiry-block,
      reference-id: reference-id,
      allow-partial: allow-partial
    })
    
    (ok invoice-id)
  )
)

;; Pay an sBTC invoice (supports partial payments). `token` must be the configured sBTC token.
(define-public (pay-invoice (token <ft-trait>) (invoice-id uint) (amount uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (payer tx-sender)
    (fee (calculate-fee-with-bps amount (get fee-bps invoice)))
    (merchant-amount (- amount fee))
  )
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_SBTC) ERR_WRONG_ASSET)
    (asserts! (is-eq (contract-of token) (var-get sbtc-token)) ERR_INVALID_TOKEN)
    (try! (assert-payable invoice-id payer amount))
    ;; Transfer sBTC: payer -> merchant (minus fee), and fee -> platform
    (try! (contract-call? token transfer merchant-amount payer (get merchant invoice) none))
    (if (> fee u0)
      (try! (contract-call? token transfer fee payer (var-get fee-recipient) none))
      true
    )
    (finalize-payment invoice-id payer amount fee merchant-amount)
  )
)

;; Pay a STX invoice (supports partial payments). Uses the native STX transfer.
(define-public (pay-invoice-stx (invoice-id uint) (amount uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (payer tx-sender)
    (fee (calculate-fee-with-bps amount (get fee-bps invoice)))
    (merchant-amount (- amount fee))
  )
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_STX) ERR_WRONG_ASSET)
    (try! (assert-payable invoice-id payer amount))
    ;; Transfer STX: payer -> merchant (minus fee), and fee -> platform
    (try! (stx-transfer? merchant-amount payer (get merchant invoice)))
    (if (> fee u0)
      (try! (stx-transfer? fee payer (var-get fee-recipient)))
      true
    )
    (finalize-payment invoice-id payer amount fee merchant-amount)
  )
)

;; Cancel invoice (merchant only, only if unpaid)
(define-public (cancel-invoice (invoice-id uint))
  (let (
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (caller tx-sender)
  )
    (asserts! (is-eq caller (get merchant invoice)) ERR_UNAUTHORIZED)
    (asserts! (is-eq (get status invoice) STATUS_PENDING) ERR_INVOICE_NOT_PAYABLE)
    
    (map-set invoices invoice-id (merge invoice { status: STATUS_CANCELLED }))

    (print { event: "invoice-cancelled", invoice-id: invoice-id, by: caller })
    (ok true)
  )
)

;; Mark an expired invoice as STATUS_EXPIRED on-chain (callable by anyone, permissionless
;; bookkeeping). Only affects still-open invoices that are past their expiry block.
;; Refunds of already-paid amounts remain available afterwards.
(define-public (expire-invoice (invoice-id uint))
  (let ((invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND)))
    (asserts! (or (is-eq (get status invoice) STATUS_PENDING)
                  (is-eq (get status invoice) STATUS_PARTIAL)) ERR_INVOICE_NOT_PAYABLE)
    (asserts! (is-invoice-expired (get expires-at invoice)) ERR_INVOICE_NOT_EXPIRED)
    (map-set invoices invoice-id (merge invoice { status: STATUS_EXPIRED }))
    (print { event: "invoice-expired", invoice-id: invoice-id, by: tx-sender })
    (ok true)
  )
)

;; ============================================================================
;; REFUND FUNCTIONS
;; ============================================================================

;; Refund an sBTC invoice (merchant only). Refunds a specific payer, capped at the net
;; amount the merchant actually received from that payer (platform fees are
;; non-refundable). Funds always return to the address that paid.
(define-public (refund-invoice
  (token <ft-trait>)
  (invoice-id uint)
  (recipient principal)
  (refund-amount uint)
  (reason (string-utf8 256))
)
  (let ((invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND)))
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_SBTC) ERR_WRONG_ASSET)
    (asserts! (is-eq (contract-of token) (var-get sbtc-token)) ERR_INVALID_TOKEN)
    (try! (assert-refundable invoice-id recipient refund-amount))
    ;; Transfer sBTC from merchant back to the actual payer
    (try! (contract-call? token transfer refund-amount tx-sender recipient none))
    (finalize-refund invoice-id recipient refund-amount reason)
  )
)

;; Refund a STX invoice (merchant only). Same per-payer, fee-capped rules; native STX.
(define-public (refund-invoice-stx
  (invoice-id uint)
  (recipient principal)
  (refund-amount uint)
  (reason (string-utf8 256))
)
  (let ((invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND)))
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_STX) ERR_WRONG_ASSET)
    (try! (assert-refundable invoice-id recipient refund-amount))
    ;; Transfer STX from merchant back to the actual payer
    (try! (stx-transfer? refund-amount tx-sender recipient))
    (finalize-refund invoice-id recipient refund-amount reason)
  )
)

;; ============================================================================
;; AGENTIC PAYMENT FUNCTIONS (vault + mandates)
;; ============================================================================

;; --- Vault funding (owner-controlled) ------------------------------------

;; Deposit sBTC into the caller's vault. The contract escrows the funds so a
;; mandated agent can spend them later without the owner's signing key.
(define-public (vault-deposit-sbtc (token <ft-trait>) (amount uint))
  (let (
    (owner tx-sender)
    (bal (default-to u0 (map-get? vault-balances { owner: tx-sender, asset: ASSET_SBTC })))
  )
    (try! (check-is-operational))
    (asserts! (is-eq (contract-of token) (var-get sbtc-token)) ERR_INVALID_TOKEN)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (contract-call? token transfer amount owner current-contract none))
    (map-set vault-balances { owner: owner, asset: ASSET_SBTC } (+ bal amount))
    (var-set total-sbtc-vaulted (+ (var-get total-sbtc-vaulted) amount))
    (print { event: "vault-deposit", owner: owner, asset: ASSET_SBTC, amount: amount, balance: (+ bal amount) })
    (ok (+ bal amount))
  )
)

;; Withdraw unspent sBTC from the caller's vault back to the caller.
(define-public (vault-withdraw-sbtc (token <ft-trait>) (amount uint))
  (let (
    (owner tx-sender)
    (bal (default-to u0 (map-get? vault-balances { owner: tx-sender, asset: ASSET_SBTC })))
  )
    (asserts! (is-eq (contract-of token) (var-get sbtc-token)) ERR_INVALID_TOKEN)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= bal amount) ERR_INSUFFICIENT_VAULT)
    ;; effect before interaction: debit the vault, then move funds out
    (map-set vault-balances { owner: owner, asset: ASSET_SBTC } (- bal amount))
    (var-set total-sbtc-vaulted (- (var-get total-sbtc-vaulted) amount))
    (try! (as-contract?
      ((with-ft (contract-of token) "sbtc-token" amount))
      (try! (contract-call? token transfer amount current-contract owner none))
    ))
    (print { event: "vault-withdraw", owner: owner, asset: ASSET_SBTC, amount: amount, balance: (- bal amount) })
    (ok (- bal amount))
  )
)

;; Deposit native STX into the caller's vault.
(define-public (vault-deposit-stx (amount uint))
  (let (
    (owner tx-sender)
    (bal (default-to u0 (map-get? vault-balances { owner: tx-sender, asset: ASSET_STX })))
  )
    (try! (check-is-operational))
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (stx-transfer? amount owner current-contract))
    (map-set vault-balances { owner: owner, asset: ASSET_STX } (+ bal amount))
    (print { event: "vault-deposit", owner: owner, asset: ASSET_STX, amount: amount, balance: (+ bal amount) })
    (ok (+ bal amount))
  )
)

;; Withdraw unspent STX from the caller's vault back to the caller.
(define-public (vault-withdraw-stx (amount uint))
  (let (
    (owner tx-sender)
    (bal (default-to u0 (map-get? vault-balances { owner: tx-sender, asset: ASSET_STX })))
  )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= bal amount) ERR_INSUFFICIENT_VAULT)
    ;; effect before interaction: debit the vault, then move funds out
    (map-set vault-balances { owner: owner, asset: ASSET_STX } (- bal amount))
    (try! (as-contract?
      ((with-stx amount))
      (try! (stx-transfer? amount current-contract owner))
    ))
    (print { event: "vault-withdraw", owner: owner, asset: ASSET_STX, amount: amount, balance: (- bal amount) })
    (ok (- bal amount))
  )
)

;; --- Mandate lifecycle (owner-controlled) --------------------------------

;; Grant (or replace) a spending mandate for an agent. Caps each payment
;; (per-tx-limit) and the total spendable within each rolling window of
;; window-blocks (window-cap), expiring after duration-blocks.
;; `allowed-merchants` scopes the agent to specific payees: an empty list leaves the
;; mandate unrestricted (the agent may pay any merchant up to the caps); a non-empty
;; list restricts the agent to paying only those merchants -- preventing a dishonest
;; agent from redirecting the owner's funds to itself.
(define-public (grant-mandate
  (agent principal)
  (asset uint)
  (per-tx-limit uint)
  (window-blocks uint)
  (window-cap uint)
  (duration-blocks uint)
  (allowed-merchants (list 20 principal))
)
  (let (
    (owner tx-sender)
    (is-restricted (> (len allowed-merchants) u0))
  )
    (asserts! (not (is-eq agent owner)) ERR_AGENT_IS_OWNER)
    (asserts! (or (is-eq asset ASSET_SBTC) (is-eq asset ASSET_STX)) ERR_INVALID_ASSET)
    (asserts! (and (> per-tx-limit u0) (> window-cap u0) (> window-blocks u0)) ERR_INVALID_INPUT)
    (asserts! (<= per-tx-limit window-cap) ERR_INVALID_INPUT)
    (asserts! (and (> duration-blocks u0) (<= duration-blocks MAX_EXPIRY_BLOCKS)) ERR_INVALID_INPUT)
    (map-set mandates { owner: owner, agent: agent }
      {
        asset: asset,
        per-tx-limit: per-tx-limit,
        window-blocks: window-blocks,
        window-cap: window-cap,
        window-start: burn-block-height,
        window-spent: u0,
        expires-at: (+ burn-block-height duration-blocks),
        active: true,
        created-at: burn-block-height,
        restricted: is-restricted,
        allowed: allowed-merchants
      })
    (print { event: "mandate-granted", owner: owner, agent: agent, asset: asset,
             per-tx-limit: per-tx-limit, window-blocks: window-blocks, window-cap: window-cap,
             expires-at: (+ burn-block-height duration-blocks),
             restricted: is-restricted, allowed: allowed-merchants })
    (ok true)
  )
)

;; Revoke an agent's mandate immediately (owner-only). Vault funds are untouched.
(define-public (revoke-mandate (agent principal))
  (let ((m (unwrap! (map-get? mandates { owner: tx-sender, agent: agent }) ERR_MANDATE_NOT_FOUND)))
    (map-set mandates { owner: tx-sender, agent: agent } (merge m { active: false }))
    (print { event: "mandate-revoked", owner: tx-sender, agent: agent })
    (ok true)
  )
)

;; --- Agentic settlement (agent signs, owner's vault pays) -----------------

;; Pay an sBTC invoice on behalf of `owner`. The agent (tx-sender) must hold an
;; active mandate from `owner`; the payment is enforced against per-tx-limit and
;; the rolling-window cap, then debited from the owner's escrowed vault. The
;; payer of record is the owner, so the existing refund path returns funds to it.
(define-public (pay-invoice-as-agent
  (token <ft-trait>)
  (owner principal)
  (invoice-id uint)
  (amount uint)
)
  (let (
    (agent tx-sender)
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (m (unwrap! (map-get? mandates { owner: owner, agent: agent }) ERR_MANDATE_NOT_FOUND))
    (rolled (roll-window m))
    (vbal (default-to u0 (map-get? vault-balances { owner: owner, asset: ASSET_SBTC })))
    (new-window-spent (+ (get window-spent rolled) amount))
    (fee (calculate-fee-with-bps amount (get fee-bps invoice)))
    (merchant-amount (- amount fee))
  )
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_SBTC) ERR_WRONG_ASSET)
    (asserts! (is-eq (get asset m) ASSET_SBTC) ERR_INVALID_ASSET)
    (asserts! (is-eq (contract-of token) (var-get sbtc-token)) ERR_INVALID_TOKEN)
    ;; --- mandate policy ---
    (asserts! (get active m) ERR_MANDATE_REVOKED)
    (asserts! (<= burn-block-height (get expires-at m)) ERR_MANDATE_EXPIRED)
    (asserts! (<= amount (get per-tx-limit m)) ERR_PER_TX_LIMIT)
    (asserts! (<= new-window-spent (get window-cap m)) ERR_WINDOW_CAP_EXCEEDED)
    (asserts! (>= vbal amount) ERR_INSUFFICIENT_VAULT)
    ;; standard invoice payability (payer-of-record = owner)
    (try! (assert-payable invoice-id owner amount))
    ;; recipient allowlist: a restricted mandate may only pay whitelisted merchants
    (asserts! (mandate-allows-recipient m (get merchant invoice)) ERR_RECIPIENT_NOT_ALLOWED)
    ;; --- EFFECTS first (check-effects-interactions): debit vault + charge window + record ---
    (map-set vault-balances { owner: owner, asset: ASSET_SBTC } (- vbal amount))
    (var-set total-sbtc-vaulted (- (var-get total-sbtc-vaulted) amount))
    (map-set mandates { owner: owner, agent: agent }
      (merge m { window-start: (get window-start rolled), window-spent: new-window-spent }))
    (print { event: "agentic-payment", invoice-id: invoice-id, agent: agent, owner: owner,
             asset: ASSET_SBTC, amount: amount, window-spent: new-window-spent })
    (let ((result (try! (finalize-payment invoice-id owner amount fee merchant-amount))))
      ;; --- INTERACTION last: move escrowed funds out of the contract vault ---
      (try! (as-contract?
        ((with-ft (contract-of token) "sbtc-token" amount))
        (try! (contract-call? token transfer merchant-amount current-contract (get merchant invoice) none))
        (if (> fee u0)
          (try! (contract-call? token transfer fee current-contract (var-get fee-recipient) none))
          true
        )
      ))
      (ok result)
    )
  )
)

;; Pay a STX invoice on behalf of `owner` (same mandate rules; native STX vault).
(define-public (pay-invoice-stx-as-agent
  (owner principal)
  (invoice-id uint)
  (amount uint)
)
  (let (
    (agent tx-sender)
    (invoice (unwrap! (map-get? invoices invoice-id) ERR_INVOICE_NOT_FOUND))
    (m (unwrap! (map-get? mandates { owner: owner, agent: agent }) ERR_MANDATE_NOT_FOUND))
    (rolled (roll-window m))
    (vbal (default-to u0 (map-get? vault-balances { owner: owner, asset: ASSET_STX })))
    (new-window-spent (+ (get window-spent rolled) amount))
    (fee (calculate-fee-with-bps amount (get fee-bps invoice)))
    (merchant-amount (- amount fee))
  )
    (try! (check-is-operational))
    (asserts! (is-eq (get asset invoice) ASSET_STX) ERR_WRONG_ASSET)
    (asserts! (is-eq (get asset m) ASSET_STX) ERR_INVALID_ASSET)
    ;; --- mandate policy ---
    (asserts! (get active m) ERR_MANDATE_REVOKED)
    (asserts! (<= burn-block-height (get expires-at m)) ERR_MANDATE_EXPIRED)
    (asserts! (<= amount (get per-tx-limit m)) ERR_PER_TX_LIMIT)
    (asserts! (<= new-window-spent (get window-cap m)) ERR_WINDOW_CAP_EXCEEDED)
    (asserts! (>= vbal amount) ERR_INSUFFICIENT_VAULT)
    (try! (assert-payable invoice-id owner amount))
    ;; recipient allowlist: a restricted mandate may only pay whitelisted merchants
    (asserts! (mandate-allows-recipient m (get merchant invoice)) ERR_RECIPIENT_NOT_ALLOWED)
    ;; --- EFFECTS first (check-effects-interactions): debit vault + charge window + record ---
    (map-set vault-balances { owner: owner, asset: ASSET_STX } (- vbal amount))
    (map-set mandates { owner: owner, agent: agent }
      (merge m { window-start: (get window-start rolled), window-spent: new-window-spent }))
    (print { event: "agentic-payment", invoice-id: invoice-id, agent: agent, owner: owner,
             asset: ASSET_STX, amount: amount, window-spent: new-window-spent })
    (let ((result (try! (finalize-payment invoice-id owner amount fee merchant-amount))))
      ;; --- INTERACTION last: move escrowed STX out of the contract vault ---
      (try! (as-contract?
        ((with-stx amount))
        (try! (stx-transfer? merchant-amount current-contract (get merchant invoice)))
        (if (> fee u0)
          (try! (stx-transfer? fee current-contract (var-get fee-recipient)))
          true
        )
      ))
      (ok result)
    )
  )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS
;; ============================================================================

;; Get merchant details
(define-read-only (get-merchant (address principal))
  (map-get? merchants address)
)

;; Check if address is a registered merchant
(define-read-only (is-merchant (address principal))
  (is-some (map-get? merchants address))
)

;; Check if merchant is active (and not admin-suspended)
(define-read-only (is-merchant-active (address principal))
  (match (map-get? merchants address)
    merchant (and (get is-active merchant) (not (get is-suspended merchant)))
    false
  )
)

;; Get invoice details
(define-read-only (get-invoice (invoice-id uint))
  (map-get? invoices invoice-id)
)

;; Resolve a merchant's Nth invoice (seq runs 1..invoice-count) to its global id
(define-read-only (get-merchant-invoice-id (merchant principal) (seq uint))
  (map-get? merchant-invoice-ids { merchant: merchant, seq: seq })
)

;; Resolve a merchant's Nth invoice directly to the full invoice record
(define-read-only (get-merchant-invoice (merchant principal) (seq uint))
  (match (map-get? merchant-invoice-ids { merchant: merchant, seq: seq })
    invoice-id (map-get? invoices invoice-id)
    none
  )
)

;; Number of invoices a merchant has created (the max valid seq)
(define-read-only (get-merchant-invoice-count (merchant principal))
  (match (map-get? merchants merchant)
    m (get invoice-count m)
    u0
  )
)

;; Look up an invoice id by the merchant's external reference-id (idempotency key)
(define-read-only (get-invoice-by-reference (merchant principal) (reference-id (string-utf8 64)))
  (map-get? merchant-reference { merchant: merchant, reference-id: reference-id })
)

;; Get invoice status
(define-read-only (get-invoice-status (invoice-id uint))
  (match (map-get? invoices invoice-id)
    invoice (some (get status invoice))
    none
  )
)

;; Check if invoice is payable
(define-read-only (is-invoice-payable (invoice-id uint))
  (match (map-get? invoices invoice-id)
    invoice (and 
      (or (is-eq (get status invoice) STATUS_PENDING)
          (is-eq (get status invoice) STATUS_PARTIAL))
      (not (is-invoice-expired (get expires-at invoice)))
    )
    false
  )
)

;; Get total still-refundable amount for an invoice (net of platform fees)
(define-read-only (get-refundable-amount (invoice-id uint))
  (match (map-get? invoices invoice-id)
    invoice (safe-sub (get net-received invoice) (get amount-refunded invoice))
    u0
  )
)

;; Get still-refundable amount for a specific payer (this is what refund-invoice enforces)
(define-read-only (get-refundable-for-payer (invoice-id uint) (payer principal))
  (match (map-get? invoice-payer-ledger { invoice-id: invoice-id, payer: payer })
    ledger (safe-sub (get net-paid ledger) (get refunded ledger))
    u0
  )
)

;; Get a payer's full ledger entry for an invoice
(define-read-only (get-payer-ledger (invoice-id uint) (payer principal))
  (map-get? invoice-payer-ledger { invoice-id: invoice-id, payer: payer })
)

;; Get individual payment record
(define-read-only (get-invoice-payment (invoice-id uint) (payment-index uint))
  (map-get? invoice-payments { invoice-id: invoice-id, payment-index: payment-index })
)

;; Get payment count for invoice
(define-read-only (get-invoice-payment-count (invoice-id uint))
  (default-to u0 (map-get? invoice-payment-counts invoice-id))
)

;; Get refund details
(define-read-only (get-refund (refund-id uint))
  (map-get? refunds refund-id)
)

;; Get platform statistics
(define-read-only (get-platform-stats)
  {
    total-volume: (var-get total-volume),
    total-invoices: (var-get total-invoices),
    total-merchants: (var-get merchant-count),
    total-fees-collected: (var-get total-fees-collected),
    total-refunds: (var-get total-refunds)
  }
)

;; Get contract configuration
(define-read-only (get-contract-config)
  {
    owner: (var-get contract-owner),
    pending-owner: (var-get pending-owner),
    fee-recipient: (var-get fee-recipient),
    platform-fee-bps: (var-get platform-fee-bps),
    is-paused: (var-get contract-paused),
    min-invoice-amount: MIN_INVOICE_AMOUNT,
    max-invoice-amount: MAX_INVOICE_AMOUNT,
    max-expiry-blocks: MAX_EXPIRY_BLOCKS,
    timelock-blocks: TIMELOCK_BLOCKS
  }
)

;; Get the queued (timelocked) fee-config change, if any
(define-read-only (get-pending-config)
  (var-get pending-config)
)

;; Get the configured sBTC token principal and whether it's locked
(define-read-only (get-sbtc-token)
  { token: (var-get sbtc-token), locked: (var-get sbtc-token-locked) }
)

;; Check if contract is paused
(define-read-only (is-paused)
  (var-get contract-paused)
)

;; Get current invoice nonce
(define-read-only (get-invoice-nonce)
  (var-get invoice-nonce)
)

;; --- Agentic payment read-onlys ------------------------------------------

;; Get an owner's escrowed vault balance for an asset (ASSET_SBTC / ASSET_STX)
(define-read-only (get-vault-balance (owner principal) (asset uint))
  (default-to u0 (map-get? vault-balances { owner: owner, asset: asset }))
)

;; Get the raw mandate record for an (owner, agent) pair
(define-read-only (get-mandate (owner principal) (agent principal))
  (map-get? mandates { owner: owner, agent: agent })
)

;; Live view of an agent's remaining budget right now: rolls the window forward
;; if it has elapsed, and reports what is currently spendable. Returns none if no
;; mandate exists. `spendable-now` already accounts for revocation/expiry.
(define-read-only (get-mandate-remaining (owner principal) (agent principal))
  (match (map-get? mandates { owner: owner, agent: agent }) m
    (let (
      (rolled (roll-window m))
      (usable (and (get active m) (<= burn-block-height (get expires-at m))))
      (window-remaining (safe-sub (get window-cap m) (get window-spent rolled)))
    )
      (some {
        active: (get active m),
        expired: (> burn-block-height (get expires-at m)),
        per-tx-limit: (get per-tx-limit m),
        window-cap: (get window-cap m),
        window-spent: (get window-spent rolled),
        window-remaining: window-remaining,
        vault-balance: (default-to u0 (map-get? vault-balances { owner: owner, asset: (get asset m) })),
        spendable-now: (if usable window-remaining u0)
      })
    )
    none
  )
)
