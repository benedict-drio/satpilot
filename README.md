# SatsRail

> Enterprise sBTC Payment Rails for Bitcoin-Native Commerce on Stacks

SatsRail is a production-ready payment infrastructure that enables merchants to accept [sBTC](https://docs.stacks.co/concepts/sbtc) payments on the [Stacks blockchain](https://www.stacks.co/). It provides a full-featured smart contract backend with invoice management, partial payments, refunds, and platform-level fee collection — paired with a polished React frontend dashboard.

Built for the **Stacks Endowment — Validate Program**.

---

## Features

- **Invoice Management** — Create, track, and manage payment invoices with expiry, memos, and reference IDs
- **Partial Payments** — Accept partial sBTC payments and track outstanding balances per invoice
- **Refund Engine** — Issue full or partial refunds directly on-chain, recorded and auditable
- **Platform Fees** — Configurable fee basis points (default 0.5%, max 5%) routed to a fee recipient
- **Merchant Registry** — Self-service merchant registration with admin verification and suspension controls
- **2-Step Ownership Transfer** — Secure admin key handoff via propose/accept pattern
- **Emergency Pause** — Circuit breaker to halt all payments instantly
- **Merchant Dashboard** — React + Vite UI to manage invoices, view stats, and track revenue
- **Payment Widget** — Embeddable sBTC payment widget for checkout flows

---

## Repository Structure

```
sats-terminal/
├── contracts/
│   ├── sats-terminal.clar        # V1 contract
│   └── sats-terminal-v2.clar     # V2 — production contract
├── tests/
│   └── sats-terminal-v2.test.ts  # Clarinet unit tests
├── scripts/
│   ├── deploy-testnet.ts          # Deploy to Stacks testnet
│   ├── test-testnet.ts            # Manual testnet smoke tests
│   ├── test-testnet-v2.ts         # V2 testnet integration tests
│   ├── test-v2-advanced.ts        # Advanced scenario tests
│   ├── test-v2-full.ts            # Full lifecycle tests
│   └── fund-customer.ts           # Fund test wallets
├── deployments/
│   ├── default.simnet-plan.yaml
│   └── default.testnet-plan.yaml
├── docs/
│   └── FRONTEND_PRD.md            # Frontend product requirements
├── frontend/                      # React dashboard application
│   └── src/
│       ├── components/            # UI components
│       ├── pages/                 # Route pages
│       ├── hooks/                 # Custom React hooks
│       ├── contexts/              # Wallet context
│       └── lib/                   # Contract & Stacks utilities
├── Clarinet.toml
└── package.json
```

---

## Smart Contract

**Contract:** `sats-terminal-v2.clar`  
**Clarity Version:** 4  
**Token:** [sBTC](https://docs.stacks.co/concepts/sbtc) (`ST1F7QA2MDF17S807EPA36TSS8AMEFY4KA9TVGWXT.sbtc-token`)

### Key Parameters

| Parameter              | Value                            |
| ---------------------- | -------------------------------- |
| Minimum invoice amount | 1,000 sats                       |
| Maximum invoice amount | 100,000,000,000 sats (1,000 BTC) |
| Default platform fee   | 0.5% (50 bps)                    |
| Maximum platform fee   | 5% (500 bps)                     |
| Maximum invoice expiry | ~1 year (52,560 blocks)          |

### Invoice Lifecycle

```
PENDING (0) → PARTIAL (1) → PAID (2)
           → EXPIRED (3)
           → CANCELLED (4)
           → REFUNDED (5)
```

### Public Functions

| Function             | Description                               |
| -------------------- | ----------------------------------------- |
| `register-merchant`  | Register as a new merchant                |
| `create-invoice`     | Create a new payment invoice              |
| `pay-invoice`        | Pay a pending invoice with sBTC           |
| `cancel-invoice`     | Cancel an unpaid invoice                  |
| `issue-refund`       | Issue a refund on a paid invoice          |
| `transfer-ownership` | Initiate a 2-step ownership transfer      |
| `accept-ownership`   | Complete ownership transfer               |
| `pause-contract`     | Emergency pause (admin only)              |
| `unpause-contract`   | Resume operations (admin only)            |
| `verify-merchant`    | Verify a merchant (admin only)            |
| `suspend-merchant`   | Suspend a merchant (admin only)           |
| `set-platform-fee`   | Update fee in basis points (admin only)   |
| `set-fee-recipient`  | Update fee recipient address (admin only) |

---

## Getting Started

### Prerequisites

- [Clarinet](https://docs.hiro.so/clarinet/getting-started) ≥ 2.x
- [Node.js](https://nodejs.org/) ≥ 18
- [pnpm](https://pnpm.io/) (frontend) or npm (contract tests)

### Clone and Install

```bash
git clone https://github.com/benedict-drio/sats-terminal.git
cd sats-terminal

# Install contract test dependencies
npm install

# Install frontend dependencies
cd frontend && pnpm install
```

---

## Contract Development

### Run Unit Tests

```bash
# From project root
npm test
```

Tests use [vitest-environment-clarinet](https://www.npmjs.com/package/vitest-environment-clarinet) with the Clarinet SDK to simulate the full Stacks blockchain locally.

### Run Tests with Coverage

```bash
npm run test:report
```

### Watch Mode

```bash
npm run test:watch
```

---

## Testnet Deployment

### 1. Set your mnemonic

```bash
export STACKS_MNEMONIC="word1 word2 ... word24"
```

> **Warning:** Never commit a mnemonic with real funds. Use a dedicated testnet wallet.

### 2. Deploy the contract

```bash
npm run deploy:testnet
```

This broadcasts a contract deployment transaction to Stacks Testnet and prints the transaction ID and an explorer link.

### 3. Run testnet integration tests

```bash
npm run test:testnet:v2
```

---

## Frontend Dashboard

The frontend is a React + Vite + TypeScript application using [shadcn/ui](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/).

### Start Development Server

```bash
cd frontend
pnpm dev
```

The dashboard runs at `http://localhost:5173`.

### Build for Production

```bash
cd frontend
pnpm build
```

### Key Pages

| Route        | Description                           |
| ------------ | ------------------------------------- |
| `/`          | Landing page with payment widget demo |
| `/dashboard` | Merchant analytics overview           |
| `/invoices`  | Invoice list and management           |
| `/payments`  | Payment history                       |
| `/refunds`   | Refund management                     |
| `/settings`  | Account and contract settings         |

### Wallet Integration

Connect a Stacks wallet (Leather or Xverse) via the `WalletContext`. The app uses `@stacks/connect` for authentication and `@stacks/transactions` for contract calls.

---

## Tech Stack

### Contract Layer
- **Clarity 4** — Smart contract language for Stacks
- **Clarinet** — Local development and testing
- **sBTC** — Bitcoin-backed asset on Stacks

### Frontend
- **React 18** + **TypeScript**
- **Vite** — Build tooling
- **Tailwind CSS** + **shadcn/ui** — Design system
- **Framer Motion** — Animations
- **@stacks/connect** — Wallet authentication
- **@stacks/transactions** — Contract interaction
- **TanStack Query** — Server state management
- **React Hook Form** + **Zod** — Form validation

---

## Error Codes

| Code    | Description                   |
| ------- | ----------------------------- |
| `u1001` | Unauthorized                  |
| `u1002` | Contract paused               |
| `u1003` | No pending ownership transfer |
| `u1004` | Caller is not pending owner   |
| `u2001` | Merchant not found            |
| `u2002` | Merchant already registered   |
| `u2003` | Merchant inactive             |
| `u2004` | Merchant suspended            |
| `u3001` | Invoice not found             |
| `u3002` | Invoice already paid          |
| `u3003` | Invoice expired               |
| `u3004` | Invoice cancelled             |
| `u3005` | Invoice not payable           |
| `u3006` | Invalid amount                |
| `u3007` | Amount below minimum          |
| `u3008` | Amount above maximum          |
| `u3009` | Partial payment not allowed   |
| `u3010` | Overpayment not allowed       |
| `u4001` | sBTC transfer failed          |
| `u4002` | Refund exceeds amount paid    |
| `u4003` | No refund available           |
| `u4004` | Self-payment not allowed      |

---

## Security Considerations

- **2-step ownership transfer** prevents accidental loss of admin control
- **Emergency pause** allows halting all payments in case of a discovered vulnerability
- **Self-payment guard** prevents invoices from being paid by their own merchant
- **Refund bounds** enforce that total refunds cannot exceed total amount paid
- **Fee cap** enforces a hard limit of 5% on platform fees via on-chain assertion
- **Merchant suspension** allows the platform to revoke access without contract upgrade

---

## Testnet Contract

| Network  | Contract                                                              |
| -------- | --------------------------------------------------------------------- |
| Testnet  | `ST3P2G9ZK7B309EGAM9QAM143YGDNBGGQAW3RPRRQ.sats-terminal-v2`          |
| Explorer | [View on Hiro Explorer](https://explorer.hiro.so/txid/?chain=testnet) |

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Make your changes and add tests
4. Run `npm test` and ensure all tests pass
5. Open a pull request

---

## License

[ISC](LICENSE)

---

> Built with ⚡ on Bitcoin — powered by [Stacks](https://www.stacks.co/)
