# CIOS.IAI.ONE – Constitutional Intelligence Operating System

**Hệ điều hành Trí tuệ Tuân thủ Hiến pháp** – AI Agent Flow Control Layer của IAI.ONE.

## Vision

Mọi Agent swarm đều **bắt buộc tuân thủ Charter cá nhân on-chain** (từ i ai.one).

## Tech Stack

- Frontend: Next.js 15 + React 19 (CF Pages)
- State: Zustand + Tanstack Query
- Auth: Privy + WalletConnect
- Backend: CF Worker (`api.cios.iai.one`)
- On-chain: Base + IAI token (Charter NFT)
- Physical: Peaq SDK + WebLLM (on-device)

## Quick Start (DEV)

1. `pnpm install`
2. `cp .env.example .env`
3. `pnpm dev`

## Structure

```text
/app
  /dashboard     ← Main shell
  /charter       ← Constitutional panel
  /agents        ← Swarm manager
/components
  /charter-enforcement
/public
  /tokens.css    ← Design tokens global
```

## Contributing

Tuân thủ Charter IAI.ONE. Mọi PR phải pass Charter Enforcement check.

Phiên bản hiện tại: v1.1.0 → Target v2.0.0 “Constitutional Launch”
