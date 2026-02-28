/**
 * SatsTerminal V2 - Enterprise Contract Tests
 * Tests: merchant registration, invoices, payments, partial payments, 
 *        refunds, admin controls, and platform fees
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Cl, ClarityType } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const merchant1 = accounts.get("wallet_1")!;
const merchant2 = accounts.get("wallet_2")!;
const customer1 = accounts.get("wallet_3")!;
const customer2 = accounts.get("wallet_4")!;
const newOwner = accounts.get("wallet_5")!;

const CONTRACT_NAME = "sats-terminal-v2";

describe("SatsTerminal V2 - Enterprise Tests", () => {
  
  // ========================================
  // ADMIN FUNCTIONS
  // ========================================
  describe("Admin Controls", () => {
    
    it("allows owner to pause contract", () => {
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
      
      const { result: isPaused } = simnet.callReadOnlyFn(CONTRACT_NAME, "is-paused", [], deployer);
      expect(isPaused).toBeBool(true);
    });
    
    it("allows owner to unpause contract", () => {
      simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], deployer);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "unpause-contract", [], deployer);
      expect(result).toBeOk(Cl.bool(true));
      
      const { result: isPaused } = simnet.callReadOnlyFn(CONTRACT_NAME, "is-paused", [], deployer);
      expect(isPaused).toBeBool(false);
    });
    
    it("prevents non-owner from pausing", () => {
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], merchant1);
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });
    
    it("supports two-step ownership transfer", () => {
      // Initiate transfer
      const { result: initResult } = simnet.callPublicFn(
        CONTRACT_NAME, 
        "transfer-ownership", 
        [Cl.principal(newOwner)], 
        deployer
      );
      expect(initResult).toBeOk(Cl.bool(true));
      
      // Accept transfer
      const { result: acceptResult } = simnet.callPublicFn(
        CONTRACT_NAME, 
        "accept-ownership", 
        [], 
        newOwner
      );
      expect(acceptResult).toBeOk(Cl.bool(true));
      
      // Verify new owner can pause
      const { result: pauseResult } = simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], newOwner);
      expect(pauseResult).toBeOk(Cl.bool(true));
    });
    
    it("allows owner to set platform fee", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME, 
        "set-platform-fee", 
        [Cl.uint(100)], // 1%
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("prevents fee above 5%", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME, 
        "set-platform-fee", 
        [Cl.uint(600)], // 6% - should fail
        deployer
      );
      expect(result).toBeErr(Cl.uint(3006)); // ERR_INVALID_AMOUNT
    });
  });
  
  // ========================================
  // MERCHANT REGISTRATION
  // ========================================
  describe("Merchant Registration", () => {
    
    it("allows registration with full profile", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [
          Cl.stringUtf8("Coffee Shop"),
          Cl.some(Cl.stringUtf8("Best coffee in town")),
          Cl.some(Cl.stringUtf8("https://webhook.example.com"))
        ],
        merchant1
      );
      expect(result).toBeOk(Cl.uint(1));
    });
    
    it("prevents duplicate registration", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop 1"), Cl.none(), Cl.none()],
        merchant1
      );
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop 2"), Cl.none(), Cl.none()],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(2002)); // ERR_MERCHANT_EXISTS
    });
    
    it("blocks registration when paused", () => {
      simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], deployer);
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop"), Cl.none(), Cl.none()],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(1002)); // ERR_CONTRACT_PAUSED
    });
    
    it("allows profile updates", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Old Name"), Cl.none(), Cl.none()],
        merchant1
      );
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "update-merchant-profile",
        [
          Cl.stringUtf8("New Name"),
          Cl.some(Cl.stringUtf8("Updated description")),
          Cl.some(Cl.stringUtf8("https://new-webhook.example.com"))
        ],
        merchant1
      );
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("allows owner to verify merchant", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop"), Cl.none(), Cl.none()],
        merchant1
      );
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "verify-merchant",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });
  });
  
  // ========================================
  // INVOICE MANAGEMENT
  // ========================================
  describe("Invoice System", () => {
    
    beforeEach(() => {
      // Register merchant before each invoice test
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Test Store"), Cl.none(), Cl.none()],
        merchant1
      );
    });
    
    it("creates invoice with all options", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [
          Cl.uint(50000),                    // 50,000 sats
          Cl.stringUtf8("Order #001"),       // memo
          Cl.some(Cl.stringUtf8("ORD-001")), // reference ID
          Cl.uint(1000),                     // expires in 1000 blocks
          Cl.bool(true),                     // allow partial
          Cl.bool(false)                     // no overpay
        ],
        merchant1
      );
      expect(result).toBeOk(Cl.uint(1));
    });
    
    it("rejects invoice below minimum", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [
          Cl.uint(100),                      // Too low (min is 1000)
          Cl.stringUtf8("Small order"),
          Cl.none(),
          Cl.uint(100),
          Cl.bool(false),
          Cl.bool(false)
        ],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(3007)); // ERR_AMOUNT_TOO_LOW
    });
    
    it("allows merchant to cancel unpaid invoice", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "cancel-invoice",
        [Cl.uint(1)],
        merchant1
      );
      expect(result).toBeOk(Cl.bool(true));
    });
    
    it("returns correct invoice status", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-invoice-status",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeSome(Cl.uint(0)); // STATUS_PENDING
    });
    
    it("checks invoice payable status", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      
      const { result } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-invoice-payable",
        [Cl.uint(1)],
        deployer
      );
      expect(result).toBeBool(true);
    });
  });
  
  // ========================================
  // READ-ONLY FUNCTIONS
  // ========================================
  describe("Read-Only Functions", () => {
    
    it("returns platform stats", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(result).toBeTuple({
        "total-volume": Cl.uint(0),
        "total-invoices": Cl.uint(0),
        "total-merchants": Cl.uint(0),
        "total-fees-collected": Cl.uint(0),
        "total-refunds": Cl.uint(0)
      });
    });
    
    it("returns contract config", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-contract-config", [], deployer);
      const config = Cl.prettyPrint(result);
      expect(config).toContain("platform-fee-bps: u50");
      expect(config).toContain("is-paused: false");
      expect(config).toContain("min-invoice-amount: u1000");
    });
    
    it("correctly identifies merchants", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop"), Cl.none(), Cl.none()],
        merchant1
      );
      
      const { result: isMerchant } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-merchant",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(isMerchant).toBeBool(true);
      
      const { result: notMerchant } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-merchant",
        [Cl.principal(customer1)],
        deployer
      );
      expect(notMerchant).toBeBool(false);
    });
    
    it("tracks merchant active status", () => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Shop"), Cl.none(), Cl.none()],
        merchant1
      );
      
      const { result: active } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-merchant-active",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(active).toBeBool(true);
      
      simnet.callPublicFn(CONTRACT_NAME, "deactivate-merchant", [], merchant1);
      
      const { result: inactive } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-merchant-active",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(inactive).toBeBool(false);
    });
    
    it("returns invoice nonce", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-nonce", [], deployer);
      expect(result).toBeUint(0);
    });
  });

  // ========================================
  // MERCHANT MANAGEMENT
  // ========================================
  describe("Merchant Management", () => {
    
    beforeEach(() => {
      simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Test Store"), Cl.none(), Cl.none()],
        merchant1
      );
    });
    
    it("allows deactivation and reactivation", () => {
      // Deactivate
      const { result: deactResult } = simnet.callPublicFn(
        CONTRACT_NAME,
        "deactivate-merchant",
        [],
        merchant1
      );
      expect(deactResult).toBeOk(Cl.bool(true));
      
      // Reactivate
      const { result: actResult } = simnet.callPublicFn(
        CONTRACT_NAME,
        "activate-merchant",
        [],
        merchant1
      );
      expect(actResult).toBeOk(Cl.bool(true));
    });
    
    it("inactive merchant cannot create invoices", () => {
      simnet.callPublicFn(CONTRACT_NAME, "deactivate-merchant", [], merchant1);
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(2003)); // ERR_MERCHANT_INACTIVE
    });
    
    it("owner can suspend merchant", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "suspend-merchant",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
      
      // Merchant should be inactive
      const { result: active } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "is-merchant-active",
        [Cl.principal(merchant1)],
        deployer
      );
      expect(active).toBeBool(false);
    });
  });
  
  // ========================================
  // STATISTICS TRACKING
  // ========================================
  describe("Statistics", () => {
    
    it("tracks merchant count", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Shop 1"), Cl.none(), Cl.none()], merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Shop 2"), Cl.none(), Cl.none()], merchant2);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-merchants: u2");
    });
    
    it("tracks invoice count", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Shop"), Cl.none(), Cl.none()], merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Order 1"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.stringUtf8("Order 2"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-invoices: u2");
    });
  });

  // ========================================
  // PAYMENT FLOW - REAL sBTC TRANSFERS
  // Note: These tests require sBTC tokens to be minted to test wallets.
  // Simnet's sbtc-balance config doesn't auto-mint to cached sBTC contracts.
  // To enable: Use sbtc-deposit's protocol-mint or a test setup script.
  // ========================================
  describe.skip("Payment Flow (requires sBTC minting)", () => {
    
    beforeEach(() => {
      // TODO: Mint sBTC tokens to test wallets using sbtc-deposit
      // Register merchant
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Payment Test Store"), Cl.none(), Cl.none()], merchant1);
    });
    
    it("allows full payment of invoice", () => {
      // Create invoice for 10,000 sats
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Full Payment Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Pay invoice in full
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        customer1
      );
      
      expect(result).toBeOk(Cl.tuple({
        "status": Cl.uint(2), // STATUS_PAID
        "amount-paid": Cl.uint(10000),
        "remaining": Cl.uint(0)
      }));
    });
    
    it("deducts platform fee from payment", () => {
      // Create invoice for 10,000 sats (0.5% fee = 50 sats)
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Fee Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Pay invoice
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Check fees collected
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-fees-collected: u50");
    });
    
    it("updates invoice status to PAID", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Status Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-status", [Cl.uint(1)], deployer);
      expect(result).toBeSome(Cl.uint(2)); // STATUS_PAID
    });
    
    it("prevents payment to non-existent invoice", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(999), Cl.uint(10000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3001)); // ERR_INVOICE_NOT_FOUND
    });
    
    it("prevents self-payment", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Self Pay Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Merchant tries to pay own invoice
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4004)); // ERR_SELF_PAYMENT
    });
    
    it("prevents double payment on fully paid invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Double Pay Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // First payment - success
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Second payment - should fail
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        customer2
      );
      expect(result).toBeErr(Cl.uint(3005)); // ERR_INVOICE_NOT_PAYABLE
    });
    
    it("tracks total volume", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(25000), Cl.stringUtf8("Volume Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(25000)], customer1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-volume: u25000");
    });
    
    it("updates merchant total-received", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Merchant Stats"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-merchant", [Cl.principal(merchant1)], deployer);
      // Merchant receives 10000 - 50 (fee) = 9950
      expect(Cl.prettyPrint(result)).toContain("total-received: u9950");
    });
  });

  // ========================================
  // PARTIAL PAYMENTS (requires sBTC minting)
  // ========================================
  describe.skip("Partial Payments (requires sBTC minting)", () => {
    
    beforeEach(() => {
      // TODO: Mint sBTC tokens to test wallets
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Partial Pay Store"), Cl.none(), Cl.none()], merchant1);
    });
    
    it("allows partial payment when enabled", () => {
      // Create invoice with partial payments allowed
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(50000), Cl.stringUtf8("Partial Test"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // Pay 20,000 of 50,000
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(20000)],
        customer1
      );
      
      expect(result).toBeOk(Cl.tuple({
        "status": Cl.uint(1), // STATUS_PARTIAL
        "amount-paid": Cl.uint(20000),
        "remaining": Cl.uint(30000)
      }));
    });
    
    it("rejects partial payment when disabled", () => {
      // Create invoice with partial payments NOT allowed
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(50000), Cl.stringUtf8("No Partial"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Try to pay partial amount
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(20000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3009)); // ERR_PARTIAL_NOT_ALLOWED
    });
    
    it("allows multiple partial payments", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(30000), Cl.stringUtf8("Multi Partial"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // First partial payment
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Second partial payment
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer2);
      
      // Final payment
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        customer1
      );
      
      expect(result).toBeOk(Cl.tuple({
        "status": Cl.uint(2), // STATUS_PAID (now fully paid)
        "amount-paid": Cl.uint(30000),
        "remaining": Cl.uint(0)
      }));
    });
    
    it("tracks individual payment records", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.stringUtf8("Track Payments"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer2);
      
      // Check payment count
      const { result: count } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-invoice-payment-count",
        [Cl.uint(1)],
        deployer
      );
      expect(count).toBeUint(2);
      
      // Check first payment record
      const { result: payment0 } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-invoice-payment",
        [Cl.uint(1), Cl.uint(0)],
        deployer
      );
      expect(Cl.prettyPrint(payment0)).toContain("amount: u10000");
    });
    
    it("rejects overpayment when disabled", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("No Overpay"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // Try to pay more than invoice amount
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(15000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3010)); // ERR_OVERPAY_NOT_ALLOWED
    });
  });

  // ========================================
  // REFUNDS (requires sBTC minting)
  // ========================================
  describe.skip("Refunds (requires sBTC minting)", () => {
    
    beforeEach(() => {
      // TODO: Mint sBTC tokens to test wallets
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Refund Store"), Cl.none(), Cl.none()], merchant1);
    });
    
    it("allows merchant to refund paid invoice", () => {
      // Create and pay invoice
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Refund Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Refund full amount
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [Cl.uint(1), Cl.uint(10000), Cl.stringUtf8("Customer requested refund")],
        merchant1
      );
      
      expect(result).toBeOk(Cl.uint(1)); // Refund ID
    });
    
    it("allows partial refund", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.stringUtf8("Partial Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(20000)], customer1);
      
      // Partial refund (half)
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [Cl.uint(1), Cl.uint(10000), Cl.stringUtf8("Partial refund")],
        merchant1
      );
      expect(result).toBeOk(Cl.uint(1));
      
      // Check refundable amount remaining
      const { result: refundable } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-refundable-amount",
        [Cl.uint(1)],
        deployer
      );
      expect(refundable).toBeUint(10000);
    });
    
    it("prevents refund by non-merchant", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Unauth Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Customer tries to refund
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [Cl.uint(1), Cl.uint(10000), Cl.stringUtf8("Unauthorized")],
        customer1
      );
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });
    
    it("prevents refund exceeding paid amount", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Over Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Try to refund more than paid
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [Cl.uint(1), Cl.uint(15000), Cl.stringUtf8("Too much")],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4002)); // ERR_REFUND_EXCEEDS_PAID
    });
    
    it("prevents refund on unpaid invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Unpaid"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Try to refund unpaid invoice
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [Cl.uint(1), Cl.uint(5000), Cl.stringUtf8("No payment to refund")],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4003)); // ERR_NO_REFUND_AVAILABLE
    });
    
    it("tracks total refunds in stats", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Refund Stats"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      simnet.callPublicFn(CONTRACT_NAME, "refund-invoice", [Cl.uint(1), Cl.uint(5000), Cl.stringUtf8("Test")], merchant1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-refunds: u5000");
    });
    
    it("updates invoice status to REFUNDED when fully refunded", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Full Refund Status"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [Cl.uint(1), Cl.uint(10000)], customer1);
      simnet.callPublicFn(CONTRACT_NAME, "refund-invoice", [Cl.uint(1), Cl.uint(10000), Cl.stringUtf8("Full refund")], merchant1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-status", [Cl.uint(1)], deployer);
      expect(result).toBeSome(Cl.uint(5)); // STATUS_REFUNDED
    });
  });

  // ========================================
  // EDGE CASES & ERROR HANDLING
  // ========================================
  describe("Edge Cases", () => {
    
    it("prevents payment to cancelled invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Edge Store"), Cl.none(), Cl.none()], merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Cancel Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Cancel invoice
      simnet.callPublicFn(CONTRACT_NAME, "cancel-invoice", [Cl.uint(1)], merchant1);
      
      // Try to pay cancelled invoice
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3005)); // ERR_INVOICE_NOT_PAYABLE
    });
    
    it("prevents payment to inactive merchant invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Inactive Merchant"), Cl.none(), Cl.none()], merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Inactive Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Deactivate merchant
      simnet.callPublicFn(CONTRACT_NAME, "deactivate-merchant", [], merchant1);
      
      // Try to pay
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(10000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(2003)); // ERR_MERCHANT_INACTIVE
    });
    
    it("prevents operations when contract is paused", () => {
      simnet.callPublicFn(CONTRACT_NAME, "pause-contract", [], deployer);
      
      // Try to register merchant
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "register-merchant",
        [Cl.stringUtf8("Paused"), Cl.none(), Cl.none()],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(1002)); // ERR_CONTRACT_PAUSED
    });
    
    it("prevents zero amount payments", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Zero Store"), Cl.none(), Cl.none()], merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.stringUtf8("Zero Test"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [Cl.uint(1), Cl.uint(0)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3006)); // ERR_INVALID_AMOUNT
    });
    
    // Note: Tests below require sBTC minting to test wallets
    it.skip("prevents zero amount refunds (requires sBTC)", () => {
      // Requires paid invoice - needs sBTC
    });
    
    it.skip("correctly calculates refundable amount (requires sBTC)", () => {
      // Requires paid invoice - needs sBTC
    });
  });
});
