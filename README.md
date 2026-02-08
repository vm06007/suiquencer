# Suiquencer

**Visual DeFi flow builder for the SUI blockchain.** Design multi-step transaction sequences on a canvas, connect your wallet, and execute them in a single atomic transaction.

![Suiquencer](public/favicon.svg)

---

## What is Suiquencer?

Suiquencer is a **node-based flow simulator** for SUI. You drag and drop protocol nodes (Wallet, Transfer, Swap, Lend, Bridge, Stake, Logic, Selector, Custom), connect them in order, and run the whole sequence at once. Ideal for:

- **Multi-step DeFi flows** — e.g. swap SUI → USDC, then deposit into Scallop, in one tx
- **Cross-chain moves** — bridge SUI to Ethereum/Polygon/Arbitrum and into Aave, Lido, Uniswap, etc.
- **Conditional logic** — balance checks and contract checks to branch your flow
- **Custom contracts** — call any SUI Move module with type args and arguments

Flows are **saved automatically** and you can use **multiple tabs** to work on several sequences.

---

## Features

### Canvas & UX

- **React Flow canvas** — pan, zoom, drag nodes; edges follow your layout
- **Edge styles** — default, straight, step, smoothstep (configurable in sidebar)
- **Smart node insertion** — click "+" on edges to insert nodes between existing connections
- **Fullscreen mode** — maximize the canvas
- **Light/dark theme** — toggle in sidebar; respects system preference
- **Tabs** — multiple flows; load from file, export to file
- **Auto-save** — flows persist to localStorage on every change

### Wallet & Balance

- **SUI wallet** — Connect Phantom, Sui Wallet, or other Wallet Standard-compatible wallets
- **Live balance** — SUI and token balances on the Wallet node
- **Effective balance** — running balance along the sequence so you see spend per step, accounting for amounts consumed by upstream operations
- **Gas reserve** — 0.01 SUI automatically reserved when spending native SUI

### Supported Tokens

| Token | Symbol | Decimals |
|-------|--------|----------|
| Sui | SUI | 9 |
| USD Coin | USDC | 6 |
| Tether | USDT | 6 |
| Walrus | WAL | 9 |

### Node Types

| Node | Description |
|------|-------------|
| **Wallet** | Entry point; shows connected address and balance. Two quick-add buttons: "Add Sequence" and "Bridge" |
| **Transfer** | Send SUI or tokens to an address. Supports **SuiNS** names (`name.sui`, `@name`). Validates cumulative amounts against effective balance |
| **Swap** | DEX aggregation via **Cetus Protocol**. Real-time quotes, price impact display, exchange rate. Configurable slippage (0.5%/1%/2%/custom) and deadline. Auto-populates connected transfer nodes with output amounts |
| **Lend** | **Scallop** deposit with real-time APY rates and exchange rate display. Shows receipt tokens (sSUI, sUSDC, sUSDT, sWAL). Navi Protocol support planned |
| **Bridge** | **LI.FI** — bridge to 7+ EVM chains with optional DeFi routing (Aave, Lido, Uniswap V3, Compound) on destination. ENS name resolution for EVM addresses. Fee estimation included |
| **Stake** | Stake SUI and receive liquid staking tokens (e.g. afSUI) to keep DeFi utility while earning rewards |
| **Logic** | **Balance check** (compare any address/SuiNS balance) or **contract check** (call view function and compare return). Downstream nodes skipped if condition is false |
| **Selector** | Picks one of several next nodes for branching flows (e.g. after a Logic condition). Animated edge indicator |
| **Custom** | Call any Move package/module/function. Module and function discovery, type argument support, smart parameter hints with type detection |

### Swap Details

- **Protocol**: Cetus (active), Turbos and Aftermath listed as coming soon
- **Assets**: SUI, USDC, USDT, WAL
- **Settings**: Slippage tolerance (0.5%, 1%, 2%, or custom), transaction deadline (minutes)
- **Quotes**: Real-time price quotes with estimated output and price impact percentage
- **Auto-populate**: Swap output amounts automatically fill connected Transfer nodes

### Lending Details

- **Protocol**: Scallop (active), Navi Protocol (coming soon)
- **Actions**: Deposit (active), Withdraw/Borrow/Repay planned
- **Assets**: SUI, USDC, USDT, WAL
- **APY Display**: Real-time deposit and borrow APY rates shown in asset selector and settings
- **Receipt Tokens**: Shows expected receipt tokens with real-time exchange rates (e.g. deposit SUI → receive sSUI)

### Bridge Details

- **Provider**: LI.FI SDK with full route quoting
- **Source Assets**: SUI, USDC, USDT, WAL
- **Destination Chains**: Ethereum, Polygon, Arbitrum, Optimism, Base, Avalanche, BNB Chain
- **Destination Assets**: ETH, USDC, USDT, WBTC, DAI, MATIC, AVAX, BNB
- **Destination DeFi**: Aave (supply), Lido (stake), Uniswap V3 (liquidity), Compound (supply)
- **ENS Support**: Resolve ENS names for destination EVM addresses
- **Fee Estimation**: Shows estimated bridge fees (~0.1-2%)
- Bridge operations execute **separately** from the atomic Sui transaction block

### Logic & Conditions

- **Balance Check**: Query any Sui address or SuiNS name balance, compare with operators (>, >=, <, <=, =, !=)
- **Contract Check**: Call any Move view function via `devInspectTransactionBlock`, compare return value
- **Conditional Execution**: If condition evaluates to false, all downstream nodes in that branch are skipped
- **Package Helper**: Quick-select from known packages (Scallop, Cetus, Turbos, etc.)

### Custom Contract Calls

- **Package Discovery**: Enter a package ID or select from known packages
- **Module Discovery**: Dynamically fetch available modules from any package
- **Function Enumeration**: Lists entry functions (callable) separately from view functions
- **Type Arguments**: Support for generic Move functions via JSON array input
- **Smart Parameters**: Auto-detects parameter types (u64, u128, u8, bool, address, object references) and shows appropriate input hints
- **Example Presets**: Quick-fill examples like SUI deposit

### Execution

- **Execution order** — computed from the graph (topological sort from Wallet node)
- **Sequence numbering** — automatic 1, 2, 3... labels on each executable node
- **Right sidebar** — lists execution sequence with effective balances and **Run** button
- **Atomic execution** — all Sui operations in one `TransactionBlock`; bridge operations execute separately
- **Success modal** — shows transaction digest, step count, network, and link to SuiVision explorer

### Execution Flow (How it works)

Suiquencer turns your canvas into a deterministic execution plan before anything touches the chain.

1. **Graph build** — the Wallet node is treated as the single entry point; connected nodes form a directed graph.
2. **Topological sort** — the graph is ordered so every node executes only after its dependencies.
3. **Validation & balance safety** — each node validates required fields (amounts, assets, addresses, slippage, etc.).  
   Effective balance is tracked step‑by‑step so downstream nodes can’t overspend what upstream nodes already consumed.
4. **Logic gates & branching** — Logic nodes evaluate balance/contract checks. If a condition fails, that branch is skipped.  
   Selector nodes fan out the next node(s) for true/false branches.
5. **Transaction assembly** — Sui operations (transfer, swap, lend, stake, custom calls) are added to a single `TransactionBlock`.
6. **Bridge separation** — cross‑chain bridge routes (LI.FI) are queued and executed **after** the atomic Sui transaction.
7. **Run + finalize** — you approve once, the atomic block executes, then any queued bridge steps run.  
   The success modal shows digest, step count, and a SuiVision link.

### Name Resolution

- **SuiNS** — resolve `name.sui` / `@name` in Transfer and Logic nodes, with helper dropdown for discovery
- **ENS** — resolve Ethereum names in Bridge destination addresses, with helper dropdown

---

## Complex Transaction Example

Suiquencer can execute multi-step flows in a single atomic transaction. Here is a real on-chain example that combines **Transfer + Stake + Lend + Borrow + Lend**:

- [SuiScan Transaction](https://suiscan.xyz/tx/8PtxUAMXTb6GjWr4iWXxE6eBuT5MxRSRXFMQN6pVBHH3)

---

## Screenshot

*(Add a screenshot of the app here — e.g. canvas with Wallet, Swap, Lend, and Bridge nodes connected.)*

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) (or Node 18+)
- A SUI wallet (e.g. [Phantom](https://phantom.app/), [Sui Wallet](https://sui.io/wallet))

### Install & Run

```bash
# Clone and enter the repo
cd suiquencer

# Install dependencies
bun install

# Start dev server
bun run dev
```

Open the URL shown (e.g. `http://localhost:5173`). Connect your wallet and start adding nodes.

### Optional: LI.FI (Bridge)

For **Bridge** node and cross-chain routing:

1. Copy the env template and add your key:
   ```bash
   cp .env.example .env
   ```
2. In `.env`, set your [LI.FI](https://li.fi/) API key:
   ```env
   VITE_LIFI_API_KEY=your_lifi_api_key_here
   ```
3. Restart the dev server.

### Network Configuration

| Network | RPC Endpoint |
|---------|-------------|
| Mainnet (default) | `https://sui-rpc.publicnode.com` |
| Testnet | PublicNode testnet |
| Devnet | Mysten official fullnode |

---

## Usage

1. **Connect wallet** — Use the Wallet node or global connect; your balance appears on the Wallet node.
2. **Add nodes** — Use **+ Add Node** (or the node menu) to add Transfer, Swap, Lend, Bridge, Logic, Selector, or Custom. New nodes auto-connect from the last selected node.
3. **Connect flow** — Drag from a node's handle to another, or rely on "add node" to keep a chain. Wallet should be the single entry point.
4. **Configure** — Click a node to configure it in the right panel (amounts, tokens, recipient, protocol, etc.).
5. **Check sequence** — Open the right sidebar to see the execution order and effective balances.
6. **Run** — Click **Run** to execute the sequence in one transaction. Approve in your wallet and check the success modal for the explorer link.

**Tips:**

- Use **Load** (sidebar) to import a flow from a JSON file; **Export** to save the current flow to a file.
- **Logic + Selector** — Add a Logic node (e.g. "balance of SUI > 10"), connect it to a Selector, then connect the Selector's outputs to different branches.
- SuiNS: in Transfer, you can enter `name.sui` or `@name` and use "Find SuiNS names" if needed.
- Swap outputs auto-populate connected Transfer nodes with split amounts.
- Use the **Custom** node to interact with any Move smart contract — modules and functions are discovered automatically.

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **@xyflow/react** — canvas and node graph editor
- **@mysten/dapp-kit** + **@mysten/sui** — SUI wallet and client
- **@mysten/suins** — SuiNS resolution
- **@cetusprotocol/aggregator-sdk** — DEX swap aggregation (Cetus)
- **@scallop-io/sui-scallop-sdk** — Scallop lending with exchange rates
- **@lifi/sdk** — cross-chain bridge and routing
- **viem** — ENS resolution for EVM addresses in bridge flows
- **TanStack Query** — server state and caching
- **Tailwind CSS** + **Lucide React** — styling and icons

---

## Sponsor Tech Highlights (with code links)

### Sui

Suiquencer builds directly on **Sui** by compiling user flows into **Programmable Transaction Blocks (PTBs)** and executing them atomically via `@mysten/dapp-kit` / `@mysten/sui`, with **SuiNS** name resolution for human‑readable addresses.

- Execution pipeline (atomic transaction assembly):  
  https://github.com/vm06007/suiquencer/blob/main/src/hooks/useExecuteSequence.ts#L238
- Transfers + token handling on Sui:  
  https://github.com/vm06007/suiquencer/blob/main/src/hooks/useExecuteSequence.ts#L276
- SuiNS resolution during execution:  
  https://github.com/vm06007/suiquencer/blob/main/src/hooks/useExecuteSequence.ts#L63

### LI.FI

The application uses **LI.FI** to power the Bridge node and cross‑chain routing (Sui ↔ EVM). It fetches live routes/fees and executes the bridge step with status tracking.

- LI.FI SDK config + Sui provider:  
  https://github.com/vm06007/suiquencer/blob/main/src/config/lifi.ts#L1
- Route fetching in the Bridge node:  
  https://github.com/vm06007/suiquencer/blob/main/src/components/nodes/BridgeNode.tsx#L431
- Bridge execution + retries/status:  
  https://github.com/vm06007/suiquencer/blob/main/src/hooks/execution/bridge.ts#L49

### ENS

Suiquencer resolves **ENS** names in the Bridge node and also stores shared flows in ENS text records for easy retrieval.

- ENS resolution in Bridge node:  
  https://github.com/vm06007/suiquencer/blob/main/src/components/nodes/BridgeNode.tsx#L203
- ENS read/write helpers (text record `suiquencer.flow`):  
  https://github.com/vm06007/suiquencer/blob/main/src/lib/ens.ts#L5

---

## Scripts

| Command | Description |
|--------|-------------|
| `bun run dev` | Start Vite dev server |
| `bun run build` | TypeScript check + production build |
| `bun run preview` | Serve production build locally |
| `bun run lint` | Run ESLint |

---

## Roadmap

**Shipped**

- SUI wallet connection and balance
- Transfer with SuiNS name resolution
- Swap via Cetus with real-time quotes and price impact
- Lend via Scallop with APY rates and exchange rates
- Bridge via LI.FI to 7+ EVM chains with destination DeFi
- Logic and Selector nodes for conditional branching
- Custom Move contract calls with module/function discovery
- WAL (Walrus) token support
- Atomic execution of flows
- Effective balance tracking and validation
- Save/load flows and multi-tab workspace
- Real-time Scallop exchange rates and receipt token display

**Up Next**

- Turbos and Aftermath swap protocols
- Transaction preview / simulation before execution
- Navi repay action support
- AI-assisted flow generation, validation, and optimization

---

## License

Private / unlicensed — see repo.
