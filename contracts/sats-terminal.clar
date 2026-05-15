;; title: SatsRail
;; version: 1.0.0
;; summary: sBTC Payment Rails for Merchants
;; description: A payment processing contract that enables merchants to accept 
;;              sBTC payments with tracking, refunds, and merchant management.

;; ============================================================================
;; CONSTANTS
;; ============================================================================

;; sBTC token contract reference (testnet)
(define-constant SBTC_TOKEN 'ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token)

;; Contract owner
(define-constant CONTRACT_OWNER tx-sender)

;; Error codes
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_INVALID_AMOUNT (err u101))
(define-constant ERR_PAYMENT_NOT_FOUND (err u102))
(define-constant ERR_ALREADY_REFUNDED (err u103))
(define-constant ERR_MERCHANT_NOT_FOUND (err u104))
(define-constant ERR_MERCHANT_INACTIVE (err u105))
(define-constant ERR_TRANSFER_FAILED (err u106))
(define-constant ERR_ALREADY_REGISTERED (err u107))
(define-constant ERR_SELF_PAYMENT (err u108))

;; ============================================================================
;; DATA VARIABLES
;; ============================================================================

;; Global statistics
(define-data-var total-payments uint u0)
(define-data-var total-volume uint u0)
(define-data-var total-merchants uint u0)
(define-data-var payment-nonce uint u0)

;; ============================================================================
;; DATA MAPS
;; ============================================================================

;; Payment records
(define-map payments
  { payment-id: uint }
  {
    payer: principal,
    merchant: principal,
    amount: uint,
    memo: (string-utf8 256),
    block-height: uint,
    refunded: bool
  }
)

;; Merchant registry
(define-map merchants
  { address: principal }
  {
    name: (string-utf8 64),
    active: bool,
    total-received: uint,
    payment-count: uint,
    registered-at: uint
  }
)

;; ============================================================================
;; PRIVATE FUNCTIONS
;; ============================================================================

;; Generate the next payment ID
(define-private (get-next-payment-id)
  (let ((current-id (var-get payment-nonce)))
    (var-set payment-nonce (+ current-id u1))
    current-id
  )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - MERCHANT MANAGEMENT
;; ============================================================================

;; Register as a merchant
(define-public (register-merchant (name (string-utf8 64)))
  (let ((caller tx-sender))
    ;; Check if already registered
    (asserts! (is-none (map-get? merchants { address: caller })) ERR_ALREADY_REGISTERED)
    
    ;; Register the merchant
    (map-set merchants
      { address: caller }
      {
        name: name,
        active: true,
        total-received: u0,
        payment-count: u0,
        registered-at: stacks-block-height
      }
    )
    
    ;; Update merchant count
    (var-set total-merchants (+ (var-get total-merchants) u1))
    
    (ok true)
  )
)

;; Update merchant name
(define-public (update-merchant-name (new-name (string-utf8 64)))
  (let ((merchant-data (unwrap! (map-get? merchants { address: tx-sender }) ERR_MERCHANT_NOT_FOUND)))
    (map-set merchants
      { address: tx-sender }
      (merge merchant-data { name: new-name })
    )
    (ok true)
  )
)

;; Deactivate merchant (pause receiving payments)
(define-public (deactivate-merchant)
  (let ((merchant-data (unwrap! (map-get? merchants { address: tx-sender }) ERR_MERCHANT_NOT_FOUND)))
    (map-set merchants
      { address: tx-sender }
      (merge merchant-data { active: false })
    )
    (ok true)
  )
)

;; Reactivate merchant
(define-public (activate-merchant)
  (let ((merchant-data (unwrap! (map-get? merchants { address: tx-sender }) ERR_MERCHANT_NOT_FOUND)))
    (map-set merchants
      { address: tx-sender }
      (merge merchant-data { active: true })
    )
    (ok true)
  )
)

;; ============================================================================
;; PUBLIC FUNCTIONS - PAYMENTS
;; ============================================================================

;; Process a payment to a registered merchant
(define-public (pay 
  (merchant principal) 
  (amount uint) 
  (memo (string-utf8 256)))
  (let 
    (
      (payer tx-sender)
      (payment-id (get-next-payment-id))
      (merchant-data (unwrap! (map-get? merchants { address: merchant }) ERR_MERCHANT_NOT_FOUND))
    )
    
    ;; Validations
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (get active merchant-data) ERR_MERCHANT_INACTIVE)
    (asserts! (not (is-eq payer merchant)) ERR_SELF_PAYMENT)
    
    ;; Transfer sBTC from payer to merchant
    (try! (contract-call? SBTC_TOKEN transfer amount payer merchant none))
    
    ;; Record the payment
    (map-set payments
      { payment-id: payment-id }
      {
        payer: payer,
        merchant: merchant,
        amount: amount,
        memo: memo,
        block-height: stacks-block-height,
        refunded: false
      }
    )
    
    ;; Update merchant stats
    (map-set merchants
      { address: merchant }
      (merge merchant-data {
        total-received: (+ (get total-received merchant-data) amount),
        payment-count: (+ (get payment-count merchant-data) u1)
      })
    )
    
    ;; Update global stats
    (var-set total-payments (+ (var-get total-payments) u1))
    (var-set total-volume (+ (var-get total-volume) amount))
    
    (ok payment-id)
  )
)

;; Refund a payment (merchant only)
(define-public (refund (payment-id uint))
  (let 
    (
      (payment (unwrap! (map-get? payments { payment-id: payment-id }) ERR_PAYMENT_NOT_FOUND))
      (merchant tx-sender)
    )
    
    ;; Validations
    (asserts! (is-eq merchant (get merchant payment)) ERR_UNAUTHORIZED)
    (asserts! (not (get refunded payment)) ERR_ALREADY_REFUNDED)
    
    ;; Transfer sBTC back to payer
    (try! (contract-call? SBTC_TOKEN transfer 
      (get amount payment) 
      merchant 
      (get payer payment) 
      none))
    
    ;; Mark payment as refunded
    (map-set payments
      { payment-id: payment-id }
      (merge payment { refunded: true })
    )
    
    (ok true)
  )
)

;; ============================================================================
;; READ-ONLY FUNCTIONS
;; ============================================================================

;; Get payment details
(define-read-only (get-payment (payment-id uint))
  (map-get? payments { payment-id: payment-id })
)

;; Get merchant details
(define-read-only (get-merchant (address principal))
  (map-get? merchants { address: address })
)

;; Check if address is a registered merchant
(define-read-only (is-merchant (address principal))
  (is-some (map-get? merchants { address: address }))
)

;; Check if merchant is active
(define-read-only (is-merchant-active (address principal))
  (match (map-get? merchants { address: address })
    merchant-data (get active merchant-data)
    false
  )
)

;; Get global statistics
(define-read-only (get-stats)
  {
    total-payments: (var-get total-payments),
    total-volume: (var-get total-volume),
    total-merchants: (var-get total-merchants)
  }
)

;; Get current payment nonce (next payment ID)
(define-read-only (get-payment-nonce)
  (var-get payment-nonce)
)
