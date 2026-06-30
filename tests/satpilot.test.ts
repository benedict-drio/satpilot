/**
 * Satpilot - Enterprise Contract Tests
 * Tests: merchant registration, invoices, payments, partial payments, 
 *        refunds, admin controls, and platform fees
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Cl, ClarityType, cvToValue } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const merchant1 = accounts.get("wallet_1")!;
const merchant2 = accounts.get("wallet_2")!;
const customer1 = accounts.get("wallet_3")!;
const customer2 = accounts.get("wallet_4")!;
const newOwner = accounts.get("wallet_5")!;

const CONTRACT_NAME = "satpilot";

// The configured sBTC token (simnet loads it at this mainnet principal via requirements,
// and the contract's sbtc-token var defaults to it).
const SBTC = Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token");

describe("Satpilot - Enterprise Tests", () => {
  
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
    
    it("allows owner to propose a fee-config change", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "propose-config-change",
        [Cl.uint(100), Cl.principal(deployer)], // 1% fee, same recipient
        deployer
      );
      expect(result).toBeOk(Cl.bool(true));
    });

    it("prevents proposing a fee above 5%", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "propose-config-change",
        [Cl.uint(600), Cl.principal(deployer)], // 6% - should fail
        deployer
      );
      expect(result).toBeErr(Cl.uint(3006)); // ERR_INVALID_AMOUNT
    });

    it("prevents non-owner from proposing a fee-config change", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "propose-config-change",
        [Cl.uint(100), Cl.principal(merchant1)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });

    it("enforces the timelock before a fee-config change can execute", () => {
      simnet.callPublicFn(CONTRACT_NAME, "propose-config-change",
        [Cl.uint(250), Cl.principal(merchant2)], deployer);

      // Too early
      const early = simnet.callPublicFn(CONTRACT_NAME, "execute-config-change", [], deployer);
      expect(early.result).toBeErr(Cl.uint(1007)); // ERR_TIMELOCK_NOT_EXPIRED

      // Advance past the ~1 day timelock (144 blocks)
      simnet.mineEmptyBurnBlocks(144);
      const ok = simnet.callPublicFn(CONTRACT_NAME, "execute-config-change", [], deployer);
      expect(ok.result).toBeOk(Cl.bool(true));

      // New fee + recipient now live
      const { result: config } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-contract-config", [], deployer);
      expect(Cl.prettyPrint(config)).toContain("platform-fee-bps: u250");
      expect(Cl.prettyPrint(config)).toContain(merchant2);
    });

    it("lets the owner cancel a queued fee-config change", () => {
      simnet.callPublicFn(CONTRACT_NAME, "propose-config-change",
        [Cl.uint(300), Cl.principal(merchant1)], deployer);

      const cancel = simnet.callPublicFn(CONTRACT_NAME, "cancel-config-change", [], deployer);
      expect(cancel.result).toBeOk(Cl.bool(true));

      // Nothing to execute now
      simnet.mineEmptyBurnBlocks(144);
      const exec = simnet.callPublicFn(CONTRACT_NAME, "execute-config-change", [], deployer);
      expect(exec.result).toBeErr(Cl.uint(1006)); // ERR_NO_PENDING_CONFIG
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
          Cl.uint(0),                        // asset: sBTC
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
          Cl.uint(0),                        // asset: sBTC
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
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

    it("suspended merchant cannot re-enable itself via activate-merchant", () => {
      simnet.callPublicFn(CONTRACT_NAME, "suspend-merchant", [Cl.principal(merchant1)], deployer);

      // Merchant attempts to bypass the suspension
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "activate-merchant", [], merchant1);
      expect(result).toBeErr(Cl.uint(2004)); // ERR_MERCHANT_SUSPENDED

      const { result: active } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "is-merchant-active", [Cl.principal(merchant1)], deployer
      );
      expect(active).toBeBool(false);
    });

    it("suspended merchant cannot create invoices", () => {
      simnet.callPublicFn(CONTRACT_NAME, "suspend-merchant", [Cl.principal(merchant1)], deployer);

      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Test"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(2004)); // ERR_MERCHANT_SUSPENDED
    });

    it("only owner can suspend a merchant", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME, "suspend-merchant", [Cl.principal(merchant1)], merchant2
      );
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });

    it("owner can lift a suspension and merchant can then reactivate", () => {
      simnet.callPublicFn(CONTRACT_NAME, "suspend-merchant", [Cl.principal(merchant1)], deployer);

      const { result: unsuspend } = simnet.callPublicFn(
        CONTRACT_NAME, "unsuspend-merchant", [Cl.principal(merchant1)], deployer
      );
      expect(unsuspend).toBeOk(Cl.bool(true));

      const { result: reactivate } = simnet.callPublicFn(CONTRACT_NAME, "activate-merchant", [], merchant1);
      expect(reactivate).toBeOk(Cl.bool(true));

      const { result: active } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "is-merchant-active", [Cl.principal(merchant1)], deployer
      );
      expect(active).toBeBool(true);
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Order 1"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.uint(0), Cl.stringUtf8("Order 2"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-invoices: u2");
    });
  });

  // ========================================
  // CONTRACT HARDENING ()
  // ========================================
  describe("Contract Hardening", () => {

    beforeEach(() => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("Hardened Store"), Cl.none(), Cl.none()], merchant1);
    });

    it("indexes invoices per merchant for on-chain enumeration", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("First"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.uint(0), Cl.stringUtf8("Second"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);

      const { result: count } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "get-merchant-invoice-count", [Cl.principal(merchant1)], deployer
      );
      expect(count).toBeUint(2);

      const { result: firstId } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "get-merchant-invoice-id", [Cl.principal(merchant1), Cl.uint(1)], deployer
      );
      expect(firstId).toBeSome(Cl.uint(1));

      const { result: secondId } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "get-merchant-invoice-id", [Cl.principal(merchant1), Cl.uint(2)], deployer
      );
      expect(secondId).toBeSome(Cl.uint(2));

      // Resolve seq -> full invoice
      const { result: secondInvoice } = simnet.callReadOnlyFn(
        CONTRACT_NAME, "get-merchant-invoice", [Cl.principal(merchant1), Cl.uint(2)], deployer
      );
      expect(Cl.prettyPrint(secondInvoice)).toContain("amount: u20000");
    });

    it("marks an expired invoice as STATUS_EXPIRED (permissionless)", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Expiring"), Cl.none(), Cl.uint(10), Cl.bool(false), Cl.bool(false)],
        merchant1);

      // Cannot expire before the expiry block
      const early = simnet.callPublicFn(CONTRACT_NAME, "expire-invoice", [Cl.uint(1)], merchant2);
      expect(early.result).toBeErr(Cl.uint(3011)); // ERR_INVOICE_NOT_EXPIRED

      simnet.mineEmptyBurnBlocks(11);

      // Anyone can now flip it to expired
      const ok = simnet.callPublicFn(CONTRACT_NAME, "expire-invoice", [Cl.uint(1)], merchant2);
      expect(ok.result).toBeOk(Cl.bool(true));

      const { result: status } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-status", [Cl.uint(1)], deployer);
      expect(status).toBeSome(Cl.uint(3)); // STATUS_EXPIRED
    });

    it("rejects registering with an empty name", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME, "register-merchant", [Cl.stringUtf8(""), Cl.none(), Cl.none()], merchant2
      );
      expect(result).toBeErr(Cl.uint(1005)); // ERR_INVALID_INPUT
    });

    it("rejects an invoice with zero expiry", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("No expiry"), Cl.none(), Cl.uint(0), Cl.bool(false), Cl.bool(false)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(1005)); // ERR_INVALID_INPUT
    });

    it("exposes the timelock window in contract config", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-contract-config", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("timelock-blocks: u144");
    });

    it("rejects a duplicate reference-id for the same merchant (idempotency)", () => {
      const ref = Cl.some(Cl.stringUtf8("ORDER-001"));
      const first = simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("First"), ref, Cl.uint(100), Cl.bool(false), Cl.bool(false)], merchant1);
      expect(first.result).toBeOk(Cl.uint(1));

      const dup = simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.uint(0), Cl.stringUtf8("Dup"), ref, Cl.uint(100), Cl.bool(false), Cl.bool(false)], merchant1);
      expect(dup.result).toBeErr(Cl.uint(3012)); // ERR_DUPLICATE_REFERENCE

      // Lookup by reference resolves to the original invoice
      const { result: byRef } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-by-reference",
        [Cl.principal(merchant1), Cl.stringUtf8("ORDER-001")], deployer);
      expect(byRef).toBeSome(Cl.uint(1));
    });

    it("allows the same reference-id across different merchants", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("Store 2"), Cl.none(), Cl.none()], merchant2);
      const ref = Cl.some(Cl.stringUtf8("INV-9"));
      const a = simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("A"), ref, Cl.uint(100), Cl.bool(false), Cl.bool(false)], merchant1);
      const b = simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("B"), ref, Cl.uint(100), Cl.bool(false), Cl.bool(false)], merchant2);
      expect(a.result).toBeOk(Cl.uint(1));
      expect(b.result).toBeOk(Cl.uint(2));
    });
  });

  // ========================================
  // sBTC TOKEN CONFIG (SIP-010 trait)
  // ========================================
  describe("sBTC Token Config", () => {

    it("defaults to the mainnet sBTC token, unlocked", () => {
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-sbtc-token", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("locked: false");
      expect(Cl.prettyPrint(result)).toContain("sbtc-token");
    });

    it("lets the owner set then lock the sBTC token", () => {
      const set = simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token",
        [Cl.contractPrincipal("ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT", "sbtc-token")], deployer);
      expect(set.result).toBeOk(Cl.bool(true));

      const lock = simnet.callPublicFn(CONTRACT_NAME, "lock-sbtc-token", [], deployer);
      expect(lock.result).toBeOk(Cl.bool(true));

      // Further changes are rejected once locked
      const again = simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token",
        [Cl.contractPrincipal("SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4", "sbtc-token")], deployer);
      expect(again.result).toBeErr(Cl.uint(4006)); // ERR_TOKEN_LOCKED
    });

    it("prevents non-owner from setting the sBTC token", () => {
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token",
        [Cl.contractPrincipal("ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT", "sbtc-token")], merchant1);
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });
  });

  // ========================================
  // STX PAYMENTS (native, run end-to-end — simnet wallets hold STX)
  // ========================================
  describe("STX Payments", () => {
    const ASSET_STX = Cl.uint(1);
    const ASSET_SBTC = Cl.uint(0);

    const stxBalance = (who: string): bigint =>
      (simnet.getAssetsMap().get("STX")?.get(who) ?? 0n) as bigint;

    beforeEach(() => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("STX Store"), Cl.none(), Cl.none()], merchant1);
    });

    it("pays a STX invoice in full via native STX transfer", () => {
      // 1 STX invoice (1,000,000 uSTX); 0.5% fee = 5,000 -> merchant nets 995,000
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(1000000), ASSET_STX, Cl.stringUtf8("STX order"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);

      const before = stxBalance(merchant1);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx",
        [Cl.uint(1), Cl.uint(1000000)], customer1);
      expect(result).toBeOk(Cl.tuple({ status: Cl.uint(2), "amount-paid": Cl.uint(1000000), remaining: Cl.uint(0) }));

      // Merchant received the net (995,000 uSTX)
      expect(stxBalance(merchant1) - before).toBe(995000n);

      const { result: status } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-status", [Cl.uint(1)], deployer);
      expect(status).toBeSome(Cl.uint(2)); // PAID
    });

    it("rejects paying a STX invoice through the sBTC path", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(1000000), ASSET_STX, Cl.stringUtf8("STX"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(1000000)], customer1);
      expect(result).toBeErr(Cl.uint(3014)); // ERR_WRONG_ASSET
    });

    it("rejects paying an sBTC invoice through the STX path", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), ASSET_SBTC, Cl.stringUtf8("sBTC"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx",
        [Cl.uint(1), Cl.uint(10000)], customer1);
      expect(result).toBeErr(Cl.uint(3014)); // ERR_WRONG_ASSET
    });

    it("supports partial STX payments from multiple payers", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(2000000), ASSET_STX, Cl.stringUtf8("Split"), Cl.none(), Cl.uint(100), Cl.bool(true), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx", [Cl.uint(1), Cl.uint(1000000)], customer1);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx", [Cl.uint(1), Cl.uint(1000000)], customer2);
      expect(result).toBeOk(Cl.tuple({ status: Cl.uint(2), "amount-paid": Cl.uint(2000000), remaining: Cl.uint(0) }));
    });

    it("refunds a STX payment back to the payer", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(1000000), ASSET_STX, Cl.stringUtf8("Refundable"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx", [Cl.uint(1), Cl.uint(1000000)], customer1);

      const before = stxBalance(customer1);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "refund-invoice-stx",
        [Cl.uint(1), Cl.principal(customer1), Cl.uint(995000), Cl.stringUtf8("Customer refund")], merchant1);
      expect(result).toBeOk(Cl.uint(1)); // refund id
      expect(stxBalance(customer1) - before).toBe(995000n);
    });

    it("rejects an invalid asset id at invoice creation", () => {
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(2), Cl.stringUtf8("Bad asset"), Cl.none(), Cl.uint(100), Cl.bool(false), Cl.bool(false)],
        merchant1);
      expect(result).toBeErr(Cl.uint(3013)); // ERR_INVALID_ASSET
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Full Payment Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Pay invoice in full
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Fee Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Pay invoice
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Check fees collected
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-fees-collected: u50");
    });
    
    it("updates invoice status to PAID", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Status Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-invoice-status", [Cl.uint(1)], deployer);
      expect(result).toBeSome(Cl.uint(2)); // STATUS_PAID
    });
    
    it("prevents payment to non-existent invoice", () => {
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(999), Cl.uint(10000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3001)); // ERR_INVOICE_NOT_FOUND
    });
    
    it("prevents self-payment", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Self Pay Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Merchant tries to pay own invoice
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4004)); // ERR_SELF_PAYMENT
    });
    
    it("prevents double payment on fully paid invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Double Pay Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // First payment - success
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Second payment - should fail
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
        customer2
      );
      expect(result).toBeErr(Cl.uint(3005)); // ERR_INVOICE_NOT_PAYABLE
    });
    
    it("tracks total volume", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(25000), Cl.uint(0), Cl.stringUtf8("Volume Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(25000)], customer1);
      
      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-volume: u25000");
    });
    
    it("updates merchant total-received", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Merchant Stats"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
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
        [Cl.uint(50000), Cl.uint(0), Cl.stringUtf8("Partial Test"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // Pay 20,000 of 50,000
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(20000)],
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
        [Cl.uint(50000), Cl.uint(0), Cl.stringUtf8("No Partial"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Try to pay partial amount
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(20000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3009)); // ERR_PARTIAL_NOT_ALLOWED
    });
    
    it("allows multiple partial payments", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(30000), Cl.uint(0), Cl.stringUtf8("Multi Partial"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // First partial payment
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Second partial payment
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer2);
      
      // Final payment
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
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
        [Cl.uint(20000), Cl.uint(0), Cl.stringUtf8("Track Payments"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer2);
      
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("No Overpay"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      // Try to pay more than invoice amount
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(15000)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Refund Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Refund full net amount (10000 - 0.5% fee = 9950); fees are non-refundable
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(9950), Cl.stringUtf8("Customer requested refund")],
        merchant1
      );

      expect(result).toBeOk(Cl.uint(1)); // Refund ID
    });
    
    it("allows partial refund", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(20000), Cl.uint(0), Cl.stringUtf8("Partial Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(20000)], customer1);
      
      // Partial refund (net received = 20000 - 0.5% = 19900; refund 10000 of it)
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(10000), Cl.stringUtf8("Partial refund")],
        merchant1
      );
      expect(result).toBeOk(Cl.uint(1));

      // Check refundable amount remaining (19900 net - 10000 = 9900)
      const { result: refundable } = simnet.callReadOnlyFn(
        CONTRACT_NAME,
        "get-refundable-amount",
        [Cl.uint(1)],
        deployer
      );
      expect(refundable).toBeUint(9900);
    });
    
    it("prevents refund by non-merchant", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Unauth Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Customer tries to refund
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(5000), Cl.stringUtf8("Unauthorized")],
        customer1
      );
      expect(result).toBeErr(Cl.uint(1001)); // ERR_UNAUTHORIZED
    });
    
    it("prevents refund exceeding paid amount", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Over Refund"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      
      // Try to refund more than the net received from this payer
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(15000), Cl.stringUtf8("Too much")],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4002)); // ERR_REFUND_EXCEEDS_PAID
    });
    
    it("prevents refund on unpaid invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Unpaid"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Try to refund unpaid invoice (no payer ledger exists)
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "refund-invoice",
        [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(5000), Cl.stringUtf8("No payment to refund")],
        merchant1
      );
      expect(result).toBeErr(Cl.uint(4003)); // ERR_NO_REFUND_AVAILABLE
    });
    
    it("tracks total refunds in stats", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Refund Stats"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      simnet.callPublicFn(CONTRACT_NAME, "refund-invoice", [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(5000), Cl.stringUtf8("Test")], merchant1);

      const { result } = simnet.callReadOnlyFn(CONTRACT_NAME, "get-platform-stats", [], deployer);
      expect(Cl.prettyPrint(result)).toContain("total-refunds: u5000");
    });
    
    it("updates invoice status to REFUNDED when fully refunded", () => {
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Full Refund Status"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice", [SBTC, Cl.uint(1), Cl.uint(10000)], customer1);
      // Full refund = net received (9950); fees are non-refundable
      simnet.callPublicFn(CONTRACT_NAME, "refund-invoice", [SBTC, Cl.uint(1), Cl.principal(customer1), Cl.uint(9950), Cl.stringUtf8("Full refund")], merchant1);

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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Cancel Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Cancel invoice
      simnet.callPublicFn(CONTRACT_NAME, "cancel-invoice", [Cl.uint(1)], merchant1);
      
      // Try to pay cancelled invoice
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
        customer1
      );
      expect(result).toBeErr(Cl.uint(3005)); // ERR_INVOICE_NOT_PAYABLE
    });
    
    it("prevents payment to inactive merchant invoice", () => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant", 
        [Cl.stringUtf8("Inactive Merchant"), Cl.none(), Cl.none()], merchant1);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Inactive Test"), Cl.none(), Cl.uint(1000), Cl.bool(false), Cl.bool(false)],
        merchant1);
      
      // Deactivate merchant
      simnet.callPublicFn(CONTRACT_NAME, "deactivate-merchant", [], merchant1);
      
      // Try to pay
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(10000)],
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
        [Cl.uint(10000), Cl.uint(0), Cl.stringUtf8("Zero Test"), Cl.none(), Cl.uint(1000), Cl.bool(true), Cl.bool(false)],
        merchant1);
      
      const { result } = simnet.callPublicFn(
        CONTRACT_NAME,
        "pay-invoice",
        [SBTC, Cl.uint(1), Cl.uint(0)],
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

  // ========================================
  // AGENTIC PAYMENTS (vault + mandates)
  // Runs end-to-end on the native STX path (simnet wallets hold STX).
  // Mandate enforcement is asset-agnostic, so this also covers the sBTC path.
  // ========================================
  describe("Agentic Payments", () => {
    const ASSET_STX = Cl.uint(1);
    const ASSET_SBTC = Cl.uint(0);
    const owner = customer1;   // funds the vault, grants the mandate
    const agent = customer2;   // signs payments, spends the owner's vault

    const stxBalance = (who: string): bigint =>
      (simnet.getAssetsMap().get("STX")?.get(who) ?? 0n) as bigint;

    // Create a STX invoice for `merchant1`. Returns its id (1 on a fresh chain).
    const createStxInvoice = (amount: number, allowPartial = false) =>
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(amount), ASSET_STX, Cl.stringUtf8("Agentic order"), Cl.none(),
         Cl.uint(1000), Cl.bool(allowPartial), Cl.bool(false)], merchant1);

    const depositStx = (amount: number, who = owner) =>
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-stx", [Cl.uint(amount)], who);

    // (agent, asset, per-tx-limit, window-blocks, window-cap, duration-blocks, allowed-merchants)
    const grant = (
      perTx: number, windowBlocks: number, windowCap: number, duration: number,
      who = owner, agentP = agent, asset = ASSET_STX, allowed: string[] = [],
    ) => simnet.callPublicFn(CONTRACT_NAME, "grant-mandate",
        [Cl.principal(agentP), asset, Cl.uint(perTx), Cl.uint(windowBlocks),
         Cl.uint(windowCap), Cl.uint(duration), Cl.list(allowed.map((a) => Cl.principal(a)))], who);

    const payAsAgent = (invoiceId: number, amount: number, who = agent, ownerP = owner) =>
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-stx-as-agent",
        [Cl.principal(ownerP), Cl.uint(invoiceId), Cl.uint(amount)], who);

    const vaultBalance = (who = owner, asset = ASSET_STX) =>
      simnet.callReadOnlyFn(CONTRACT_NAME, "get-vault-balance",
        [Cl.principal(who), asset], deployer);

    beforeEach(() => {
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("Agentic Store"), Cl.none(), Cl.none()], merchant1);
    });

    // --- Vault funding ---

    it("credits and debits the owner's vault on deposit/withdraw", () => {
      expect(depositStx(5_000_000).result).toBeOk(Cl.uint(5_000_000));
      expect(vaultBalance().result).toBeUint(5_000_000);

      expect(simnet.callPublicFn(CONTRACT_NAME, "vault-withdraw-stx",
        [Cl.uint(2_000_000)], owner).result).toBeOk(Cl.uint(3_000_000));
      expect(vaultBalance().result).toBeUint(3_000_000);
    });

    it("rejects withdrawing more than the vault holds", () => {
      depositStx(1_000_000);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "vault-withdraw-stx",
        [Cl.uint(2_000_000)], owner);
      expect(result).toBeErr(Cl.uint(5006)); // ERR_INSUFFICIENT_VAULT
    });

    it("returns escrowed funds to the depositing owner on withdraw", () => {
      depositStx(3_000_000);
      const before = stxBalance(owner);
      simnet.callPublicFn(CONTRACT_NAME, "vault-withdraw-stx", [Cl.uint(3_000_000)], owner);
      expect(stxBalance(owner) - before).toBe(3_000_000n);
    });

    // --- Mandate lifecycle ---

    it("rejects a mandate an owner grants to itself", () => {
      const { result } = grant(1_000_000, 100, 1_000_000, 1000, owner, owner);
      expect(result).toBeErr(Cl.uint(5007)); // ERR_AGENT_IS_OWNER
    });

    it("rejects a mandate whose per-tx-limit exceeds its window-cap", () => {
      const { result } = grant(2_000_000, 100, 1_000_000, 1000);
      expect(result).toBeErr(Cl.uint(1005)); // ERR_INVALID_INPUT
    });

    // --- Happy path ---

    it("lets a mandated agent pay an invoice from the owner's vault", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 2_000_000, 1000);

      const merchantBefore = stxBalance(merchant1);
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));

      // Merchant nets amount minus the 0.5% platform fee.
      expect(stxBalance(merchant1) - merchantBefore).toBe(995_000n);
      // Vault debited by the gross amount; window charged.
      expect(vaultBalance().result).toBeUint(4_000_000);
      const { result: remaining } = simnet.callReadOnlyFn(CONTRACT_NAME,
        "get-mandate-remaining", [Cl.principal(owner), Cl.principal(agent)], deployer);
      expect(Cl.prettyPrint(remaining)).toContain("window-spent: u1000000");
      expect(Cl.prettyPrint(remaining)).toContain("spendable-now: u1000000");
    });

    // --- Policy rejections ---

    it("requires a mandate to pay as agent", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      const { result } = payAsAgent(1, 1_000_000); // no grant
      expect(result).toBeErr(Cl.uint(5001)); // ERR_MANDATE_NOT_FOUND
    });

    it("rejects a payment over the per-tx limit", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(500_000, 100, 5_000_000, 1000);
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeErr(Cl.uint(5005)); // ERR_PER_TX_LIMIT
    });

    it("rejects a payment that would exceed the rolling-window cap", () => {
      createStxInvoice(1_000_000);
      const second = createStxInvoice(1_000_000); // id 2
      expect(second.result).toBeOk(Cl.uint(2));
      depositStx(5_000_000);
      grant(1_000_000, 100, 1_500_000, 1000);

      expect(payAsAgent(1, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
      // 1,000,000 + 1,000,000 > 1,500,000 cap, still inside the window.
      expect(payAsAgent(2, 1_000_000).result).toBeErr(Cl.uint(5004)); // ERR_WINDOW_CAP_EXCEEDED
    });

    it("resets the budget once the rolling window elapses", () => {
      createStxInvoice(1_000_000);
      const second = createStxInvoice(1_000_000);
      expect(second.result).toBeOk(Cl.uint(2));
      depositStx(5_000_000);
      grant(1_000_000, 10, 1_500_000, 1000); // window of 10 burn blocks

      expect(payAsAgent(1, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
      // Roll past the window: the spent counter resets, so the next payment fits.
      simnet.mineEmptyBurnBlocks(10);
      expect(payAsAgent(2, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
    });

    it("rejects a payment after the mandate expires", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 10); // expires in 10 burn blocks
      simnet.mineEmptyBurnBlocks(11);
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeErr(Cl.uint(5003)); // ERR_MANDATE_EXPIRED
    });

    it("rejects a payment after the owner revokes the mandate", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000);
      expect(simnet.callPublicFn(CONTRACT_NAME, "revoke-mandate",
        [Cl.principal(agent)], owner).result).toBeOk(Cl.bool(true));
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeErr(Cl.uint(5002)); // ERR_MANDATE_REVOKED
    });

    it("rejects a payment the vault cannot cover", () => {
      createStxInvoice(1_000_000);
      depositStx(500_000); // under-funded vault
      grant(1_000_000, 100, 5_000_000, 1000);
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeErr(Cl.uint(5006)); // ERR_INSUFFICIENT_VAULT
    });

    it("rejects using a STX mandate to drive the sBTC agent path", () => {
      // Mandate is scoped to sBTC, but the STX settlement path is invoked.
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000, owner, agent, ASSET_SBTC);
      const { result } = payAsAgent(1, 1_000_000);
      expect(result).toBeErr(Cl.uint(3013)); // ERR_INVALID_ASSET
    });

    // --- Reuse of the existing refund path (payer-of-record = owner) ---

    it("refunds an agent-driven payment back to the owner, not the agent", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000);
      payAsAgent(1, 1_000_000);

      const ownerBefore = stxBalance(owner);
      const agentBefore = stxBalance(agent);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "refund-invoice-stx",
        [Cl.uint(1), Cl.principal(owner), Cl.uint(995_000), Cl.stringUtf8("Refund")], merchant1);
      expect(result).toBeOk(Cl.uint(1)); // refund id

      // Funds return to the owner (the payer of record), the agent is untouched.
      expect(stxBalance(owner) - ownerBefore).toBe(995_000n);
      expect(stxBalance(agent)).toBe(agentBefore);
    });

    // --- Recipient allowlist (Finding #1: a restricted mandate can't be redirected) ---

    it("lets a restricted mandate pay an allowlisted merchant", () => {
      createStxInvoice(1_000_000); // merchant1's invoice (id 1)
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000, owner, agent, ASSET_STX, [merchant1]);
      expect(payAsAgent(1, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
    });

    it("blocks a malicious agent from paying itself under a restricted mandate", () => {
      // merchant1 is the only allowed payee.
      createStxInvoice(1_000_000); // id 1, payable to merchant1
      // The agent registers as a merchant and bills the owner's vault to itself.
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("Rogue Agent"), Cl.none(), Cl.none()], agent);
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(1_000_000), ASSET_STX, Cl.stringUtf8("self-pay"), Cl.none(),
         Cl.uint(1000), Cl.bool(false), Cl.bool(false)], agent); // id 2, merchant = agent
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000, owner, agent, ASSET_STX, [merchant1]);

      // Paying its own invoice is rejected; paying the allowlisted merchant is fine.
      expect(payAsAgent(2, 1_000_000).result).toBeErr(Cl.uint(5009)); // ERR_RECIPIENT_NOT_ALLOWED
      expect(payAsAgent(1, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
    });

    it("leaves an unrestricted mandate (empty allowlist) able to pay any merchant", () => {
      createStxInvoice(1_000_000);
      depositStx(5_000_000);
      grant(1_000_000, 100, 5_000_000, 1000); // no allowlist
      expect(payAsAgent(1, 1_000_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(1_000_000), remaining: Cl.uint(0),
      }));
    });
  });

  // ========================================
  // AGENTIC PAYMENTS — sBTC PATH (real SIP-010 dispatch)
  // Exercises the as-contract? + with-ft escrow path at runtime against a mock
  // SIP-010 token. The mock matches real sBTC where it matters: the fungible
  // token is named "sbtc-token" (so the with-ft allowance resolves) and its
  // transfer permits sender == contract-caller (so contract-held funds move).
  // The full sBTC protocol can't mint in simnet, so the token is pointed in via
  // the contract's own set-sbtc-token — the path under test is identical.
  // ========================================
  describe("Agentic Payments (sBTC path)", () => {
    const ASSET_SBTC = Cl.uint(0);
    const owner = customer1;
    const agent = customer2;
    const MOCK = "mock-sbtc";

    const MOCK_SRC = `
(impl-trait 'ST1NXBK3K5YYMD6FD41MVNP3JS1GABZ8TRVX023PT.sip-010-trait-ft-standard.sip-010-trait)
(define-fungible-token sbtc-token)
(define-data-var token-name (string-ascii 32) "sBTC")
(define-data-var token-symbol (string-ascii 32) "sBTC")
(define-public (mint (amount uint) (recipient principal))
  (ft-mint? sbtc-token amount recipient))
(define-public (transfer (amount uint) (sender principal) (recipient principal) (memo (optional (buff 34))))
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender)) (err u4))
    (try! (ft-transfer? sbtc-token amount sender recipient))
    (match memo m (print m) 0x)
    (ok true)))
(define-read-only (get-name) (ok (var-get token-name)))
(define-read-only (get-symbol) (ok (var-get token-symbol)))
(define-read-only (get-decimals) (ok u8))
(define-read-only (get-balance (who principal)) (ok (ft-get-balance sbtc-token who)))
(define-read-only (get-total-supply) (ok (ft-get-supply sbtc-token)))
(define-read-only (get-token-uri) (ok none))
`;

    let mockToken: ReturnType<typeof Cl.contractPrincipal>;

    const sbtcBalance = (who: string): bigint =>
      BigInt(
        cvToValue(
          simnet.callReadOnlyFn(MOCK, "get-balance", [Cl.principal(who)], deployer).result,
        ).value,
      );

    const createSbtcInvoice = (amount: number) =>
      simnet.callPublicFn(CONTRACT_NAME, "create-invoice",
        [Cl.uint(amount), ASSET_SBTC, Cl.stringUtf8("sBTC order"), Cl.none(),
         Cl.uint(1000), Cl.bool(false), Cl.bool(false)], merchant1);

    const grant = (perTx: number, windowBlocks: number, windowCap: number, duration: number, allowed: string[] = []) =>
      simnet.callPublicFn(CONTRACT_NAME, "grant-mandate",
        [Cl.principal(agent), ASSET_SBTC, Cl.uint(perTx), Cl.uint(windowBlocks),
         Cl.uint(windowCap), Cl.uint(duration), Cl.list(allowed.map((a) => Cl.principal(a)))], owner);

    const payAsAgent = (invoiceId: number, amount: number) =>
      simnet.callPublicFn(CONTRACT_NAME, "pay-invoice-as-agent",
        [mockToken, Cl.principal(owner), Cl.uint(invoiceId), Cl.uint(amount)], agent);

    const vaultBalance = () =>
      simnet.callReadOnlyFn(CONTRACT_NAME, "get-vault-balance",
        [Cl.principal(owner), ASSET_SBTC], deployer);

    beforeEach(() => {
      // Deploy the mock token, point the contract at it, and seed the owner.
      simnet.deployContract(MOCK, MOCK_SRC, { clarityVersion: 4 }, deployer);
      mockToken = Cl.contractPrincipal(deployer, MOCK);
      simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token", [mockToken], deployer);
      simnet.callPublicFn(MOCK, "mint", [Cl.uint(1_000_000), Cl.principal(owner)], deployer);
      simnet.callPublicFn(CONTRACT_NAME, "register-merchant",
        [Cl.stringUtf8("sBTC Store"), Cl.none(), Cl.none()], merchant1);
    });

    it("escrows sBTC into the vault and back out on withdraw", () => {
      expect(simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc",
        [mockToken, Cl.uint(500_000)], owner).result).toBeOk(Cl.uint(500_000));
      expect(vaultBalance().result).toBeUint(500_000);
      // Owner's wallet was debited into the contract.
      expect(sbtcBalance(owner)).toBe(500_000n);

      expect(simnet.callPublicFn(CONTRACT_NAME, "vault-withdraw-sbtc",
        [mockToken, Cl.uint(200_000)], owner).result).toBeOk(Cl.uint(300_000));
      expect(vaultBalance().result).toBeUint(300_000);
      expect(sbtcBalance(owner)).toBe(700_000n);
    });

    it("lets a mandated agent pay an sBTC invoice from the owner's vault", () => {
      createSbtcInvoice(100_000);
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc", [mockToken, Cl.uint(500_000)], owner);
      grant(100_000, 100, 300_000, 1000);

      const merchantBefore = sbtcBalance(merchant1);
      const { result } = payAsAgent(1, 100_000);
      expect(result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(100_000), remaining: Cl.uint(0),
      }));
      // Merchant nets amount minus the 0.5% fee; vault debited the gross.
      expect(sbtcBalance(merchant1) - merchantBefore).toBe(99_500n);
      expect(vaultBalance().result).toBeUint(400_000);
    });

    it("enforces the rolling-window cap on the sBTC path", () => {
      createSbtcInvoice(100_000);
      const second = createSbtcInvoice(100_000);
      expect(second.result).toBeOk(Cl.uint(2));
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc", [mockToken, Cl.uint(500_000)], owner);
      grant(100_000, 100, 150_000, 1000);

      expect(payAsAgent(1, 100_000).result).toBeOk(Cl.tuple({
        status: Cl.uint(2), "amount-paid": Cl.uint(100_000), remaining: Cl.uint(0),
      }));
      expect(payAsAgent(2, 100_000).result).toBeErr(Cl.uint(5004)); // ERR_WINDOW_CAP_EXCEEDED
    });

    it("rejects an agent payment the sBTC vault cannot cover", () => {
      createSbtcInvoice(100_000);
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc", [mockToken, Cl.uint(50_000)], owner);
      grant(100_000, 100, 300_000, 1000);
      expect(payAsAgent(1, 100_000).result).toBeErr(Cl.uint(5006)); // ERR_INSUFFICIENT_VAULT
    });

    it("refunds an agent-driven sBTC payment back to the owner", () => {
      createSbtcInvoice(100_000);
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc", [mockToken, Cl.uint(500_000)], owner);
      grant(100_000, 100, 300_000, 1000);
      payAsAgent(1, 100_000);

      const ownerBefore = sbtcBalance(owner);
      const agentBefore = sbtcBalance(agent);
      const { result } = simnet.callPublicFn(CONTRACT_NAME, "refund-invoice",
        [mockToken, Cl.uint(1), Cl.principal(owner), Cl.uint(99_500), Cl.stringUtf8("Refund")], merchant1);
      expect(result).toBeOk(Cl.uint(1)); // refund id

      // Refund returns to the owner (payer of record), not the agent.
      expect(sbtcBalance(owner) - ownerBefore).toBe(99_500n);
      expect(sbtcBalance(agent)).toBe(agentBefore);
    });

    it("blocks set-sbtc-token while sBTC is vaulted, allows it once empty (Finding #3)", () => {
      simnet.callPublicFn(CONTRACT_NAME, "vault-deposit-sbtc", [mockToken, Cl.uint(500_000)], owner);
      const otherToken = Cl.contractPrincipal("ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT", "sbtc-token");
      // Repointing the token while funds are escrowed would strand them — rejected.
      expect(simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token", [otherToken], deployer).result)
        .toBeErr(Cl.uint(5010)); // ERR_VAULT_NOT_EMPTY
      // Drain the vault, then the token can be changed again.
      simnet.callPublicFn(CONTRACT_NAME, "vault-withdraw-sbtc", [mockToken, Cl.uint(500_000)], owner);
      expect(simnet.callPublicFn(CONTRACT_NAME, "set-sbtc-token", [otherToken], deployer).result)
        .toBeOk(Cl.bool(true));
    });
  });
});
