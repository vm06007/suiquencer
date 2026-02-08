"use client";

import { useState } from "react";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import { FadeIn } from "@/components/animations/FadeIn";
import {
  Book,
  Code,
  Layers,
  Layout,
  Shield,
  Zap,
  Copy,
  Check,
  ExternalLink,
  Download,
  ChevronDown,
  Sparkles,
  Boxes,
  Workflow,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

const sidebarItems = [
  { icon: Book, label: "Overview", href: "#overview" },
  { icon: Layout, label: "How It Works", href: "#how-it-works" },
  { icon: Code, label: "Flow JSON", href: "#flow-json" },
  { icon: Layers, label: "Examples", href: "#examples" },
  { icon: Shield, label: "Pro Mode", href: "#pro-mode" },
  { icon: Boxes, label: "Tech Stack", href: "#tech-stack" },
  { icon: Workflow, label: "Components", href: "#components" },
];

const exampleFlows = [
  {
    title: "Swap → Lend",
    description: "Swap SUI to USDC and deposit into Scallop in a single run.",
    open: true,
    json: `{
  "name": "sui-usdc-lend",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "swap", "type": "swap", "provider": "cetus", "from": "SUI", "to": "USDC" },
    { "id": "lend", "type": "lend", "protocol": "scallop", "asset": "USDC" }
  ],
  "edges": [
    { "from": "wallet", "to": "swap" },
    { "from": "swap", "to": "lend" }
  ],
  "atomic": true
}`,
  },
  {
    title: "Bridge → DeFi",
    description: "Bridge to Base using LI.FI and route into a destination protocol.",
    open: false,
    json: `{
  "name": "sui-bridge-base",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "bridge", "type": "bridge", "provider": "lifi", "chain": "base", "asset": "USDC" }
  ],
  "edges": [{ "from": "wallet", "to": "bridge" }],
  "atomic": false
}`,
  },
  {
    title: "Logic Gate → Branch",
    description: "Only swap if balance exceeds threshold, else send a smaller transfer.",
    open: false,
    json: `{
  "name": "balance-gate",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "logic", "type": "logic", "check": "balance", "op": ">", "value": "10" },
    { "id": "selector", "type": "selector" },
    { "id": "swap", "type": "swap", "provider": "turbos", "from": "SUI", "to": "USDC" },
    { "id": "transfer", "type": "transfer", "asset": "SUI", "amount": "1" }
  ],
  "edges": [
    { "from": "wallet", "to": "logic" },
    { "from": "logic", "to": "selector" },
    { "from": "selector", "to": "swap", "branch": "true" },
    { "from": "selector", "to": "transfer", "branch": "false" }
  ],
  "atomic": true
}`,
  },
  {
    title: "Swap → Multi Transfer",
    description: "Swap into USDC and split the output into multiple transfers.",
    open: false,
    json: `{
  "name": "swap-multi-transfer",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "swap", "type": "swap", "provider": "cetus", "from": "SUI", "to": "USDC" },
    { "id": "transfer-a", "type": "transfer", "asset": "USDC", "amount": "50", "to": "0xabc..." },
    { "id": "transfer-b", "type": "transfer", "asset": "USDC", "amount": "25", "to": "0xdef..." }
  ],
  "edges": [
    { "from": "wallet", "to": "swap" },
    { "from": "swap", "to": "transfer-a" },
    { "from": "swap", "to": "transfer-b" }
  ],
  "atomic": true
}`,
  },
  {
    title: "Logic Condition → Multi Transfer",
    description: "Check a balance condition, then fan out to multiple transfers if true.",
    open: false,
    json: `{
  "name": "logic-multi-transfer",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "logic", "type": "logic", "check": "balance", "op": ">=", "value": "5" },
    { "id": "selector", "type": "selector" },
    { "id": "transfer-a", "type": "transfer", "asset": "SUI", "amount": "1", "to": "0x111..." },
    { "id": "transfer-b", "type": "transfer", "asset": "SUI", "amount": "1", "to": "0x222..." }
  ],
  "edges": [
    { "from": "wallet", "to": "logic" },
    { "from": "logic", "to": "selector" },
    { "from": "selector", "to": "transfer-a", "branch": "true" },
    { "from": "selector", "to": "transfer-b", "branch": "true" }
  ],
  "atomic": true
}`,
  },
];

const stack = [
  "React 19 + TypeScript",
  "Vite",
  "@xyflow/react",
  "@mysten/dapp-kit",
  "@mysten/sui",
  "@mysten/suins",
  "@cetusprotocol/aggregator-sdk",
  "@scallop-io/sui-scallop-sdk",
  "@lifi/sdk",
  "TanStack Query",
  "Tailwind CSS",
  "Lucide React",
];

const components = [
  { title: "Canvas", description: "Node-based editor with zoom, pan, and edge styles." },
  { title: "Wallet Node", description: "Shows address, balance, and execution entry point." },
  { title: "Swap Node", description: "Cetus/Turbos routing with live quotes." },
  { title: "Lend Node", description: "Scallop deposit flows with rate previews." },
  { title: "Bridge Node", description: "LI.FI routes cross-chain transfers." },
  { title: "Logic + Selector", description: "Condition gates and branching execution." },
  { title: "Stake Node", description: "Stake SUI and receive afSUI for DeFi use." },
  { title: "Custom Node", description: "Call any Move module with type args." },
];

function CodeBlock({
  code,
  language = "json",
  fileName = "flow.json",
}: {
  code: string;
  language?: string;
  fileName?: string;
}) {
  const [copied, setCopied] = useState(false);
  const downloadHref = `data:application/json;charset=utf-8,${encodeURIComponent(code)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      className="bg-[#111] border border-black/10 overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-[#1a1a1a]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/80" />
            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <span className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-stone-500 ml-2">{language}</span>
        </div>
        <div className="flex items-center gap-1">
          <a
            href={downloadHref}
            download={fileName}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors px-2 py-1 hover:bg-white/5"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </a>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-white transition-colors px-2 py-1 hover:bg-white/5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-400" />
                <span className="text-green-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="p-5 overflow-x-auto">
        <code className="font-mono text-sm text-stone-300 leading-relaxed">{code}</code>
      </pre>
    </motion.div>
  );
}

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div
      className={`min-h-screen bg-white text-[#111] overflow-x-hidden ${spaceGrotesk.variable} ${mono.variable} selection:bg-[#384CE3] selection:text-white`}
      style={{ fontFamily: "var(--font-space)" }}
    >
      <Header />

      <section className="pt-32 pb-20 lg:pt-40 lg:pb-24 border-b border-black/5 bg-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute -top-1/2 -right-1/4 w-1/2 h-full bg-gradient-to-bl from-blue-100/30 via-transparent to-transparent rounded-full blur-3xl"
            animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <FadeIn>
            <motion.div
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 text-[#384CE3] text-xs mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <span className="w-1.5 h-1.5 bg-[#384CE3] rounded-full animate-pulse" />
              DOCUMENTATION
            </motion.div>
          </FadeIn>
          <FadeIn delay={0.1}>
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight leading-[1.1] mb-8 max-w-4xl">
              Build with <span className="text-[#384CE3]">Suiquencer</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.2}>
            <p className="text-base md:text-xl text-stone-600 leading-relaxed max-w-2xl">
              Learn how to design multi-step DeFi flows, export JSON, and run atomic sequences on Sui.
            </p>
          </FadeIn>
        </div>
      </section>

      <div className="border-b border-black/5">
        <div className="container mx-auto px-4 md:px-6">
          <div className="lg:hidden py-4 border-b border-black/5 sticky top-[60px] bg-white z-40">
            <button
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              className="flex items-center justify-between w-full px-4 py-3 bg-stone-50 border border-stone-200 text-sm font-medium text-[#111]"
            >
              <span className="flex items-center gap-2">
                {(() => {
                  const activeItem = sidebarItems.find((item) => item.href.replace("#", "") === activeSection);
                  const Icon = activeItem?.icon || Book;
                  return (
                    <>
                      <Icon className="h-4 w-4 text-[#384CE3]" />
                      {activeItem?.label || "Navigation"}
                    </>
                  );
                })()}
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mobileNavOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {mobileNavOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <nav className="mt-2 bg-white border border-stone-200 divide-y divide-stone-100">
                    {sidebarItems.map((item) => (
                      <a
                        key={item.label}
                        href={item.href}
                        onClick={() => {
                          setActiveSection(item.href.replace("#", ""));
                          setMobileNavOpen(false);
                        }}
                        className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${
                          activeSection === item.href.replace("#", "")
                            ? "text-[#384CE3] bg-blue-50/50 font-medium"
                            : "text-stone-600 hover:text-[#384CE3] hover:bg-blue-50/30"
                        }`}
                      >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                      </a>
                    ))}
                    <a
                      href="#"
                      className="flex items-center gap-2 text-sm text-stone-500 hover:text-[#384CE3] px-4 py-3 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Status
                      <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
                    </a>
                  </nav>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex">
            <aside className="hidden lg:block w-64 shrink-0 border-r border-black/5 pr-8 py-12 sticky top-24 self-start h-[calc(100vh-6rem)]">
              <nav className="space-y-1 h-full overflow-y-auto pr-1">
                {sidebarItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={() => setActiveSection(item.href.replace("#", ""))}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-200 border-l-2 ${
                      activeSection === item.href.replace("#", "")
                        ? "border-[#384CE3] text-[#384CE3] bg-blue-50/50 font-medium"
                        : "border-transparent text-stone-600 hover:text-[#384CE3] hover:bg-blue-50/30 hover:border-blue-200"
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </a>
                ))}
                <div className="pt-6 mt-6 border-t border-black/5">
                  <a href="#" className="flex items-center gap-2 text-sm text-stone-500 hover:text-[#384CE3] px-4 py-2 transition-colors">
                    <ExternalLink className="h-4 w-4" />
                    Status
                    <span className="ml-auto w-2 h-2 bg-green-500 rounded-full" />
                  </a>
                </div>
              </nav>
            </aside>

            <main className="flex-1 py-12 lg:pl-12 min-w-0">
              <section id="overview" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Overview</h2>
                  </div>
                  <p className="text-base md:text-lg text-stone-600 mb-6 md:mb-8 leading-relaxed">
                    Suiquencer is a visual DeFi flow builder for Sui. Drag nodes to create multi-step
                    sequences, export flows to JSON, and execute them atomically from your wallet.
                  </p>
                </FadeIn>
                <div className="grid md:grid-cols-2 gap-6">
                  <motion.div className="border border-stone-200 p-6 bg-white" whileHover={{ y: -2 }}>
                    <h3 className="font-semibold text-[#111] mb-2">What you can build</h3>
                    <ul className="text-sm text-stone-600 space-y-2">
                      <li>Swap → Lend loops</li>
                      <li>Cross-chain bridges with LI.FI</li>
                      <li>Conditional logic flows</li>
                      <li>Custom Move contract calls</li>
                    </ul>
                  </motion.div>
                  <motion.div className="border border-stone-200 p-6 bg-white" whileHover={{ y: -2 }}>
                    <h3 className="font-semibold text-[#111] mb-2">Execution model</h3>
                    <p className="text-sm text-stone-600">
                      Flow order is computed from the graph. Sui operations execute in one transaction
                      and show a success modal with the explorer link.
                    </p>
                  </motion.div>
                </div>
              </section>

              <section id="how-it-works" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Layout className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">How It Works</h2>
                  </div>
                </FadeIn>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    "Add nodes from the toolbar (Wallet, Swap, Lend, Bridge, Logic, Selector, Custom).",
                    "Connect edges to define execution order and branches.",
                    "Run the flow. Approve the transaction in your wallet.",
                  ].map((text) => (
                    <motion.div key={text} className="border border-stone-200 p-6" whileHover={{ y: -2 }}>
                      <p className="text-sm text-stone-600">{text}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section id="flow-json" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Code className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Flow JSON</h2>
                  </div>
                  <p className="text-base md:text-lg text-stone-600 mb-6 md:mb-8 leading-relaxed">
                    Export flows as JSON to version control or share with your team. Use this schema
                    to understand how nodes, edges, and settings are stored.
                  </p>
                </FadeIn>
                <CodeBlock
                  code={`{
  "name": "flow-name",
  "nodes": [
    { "id": "wallet", "type": "wallet" },
    { "id": "swap", "type": "swap", "provider": "cetus", "from": "SUI", "to": "USDC" }
  ],
  "edges": [
    { "from": "wallet", "to": "swap" }
  ],
  "atomic": true,
  "settings": {
    "slippage": "1%",
    "deadlineMinutes": 5
  }
}`}
                />
              </section>

              <section id="examples" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Examples</h2>
                  </div>
                </FadeIn>
                <div className="space-y-4">
                  {exampleFlows.map((flow) => (
                    <details
                      key={flow.title}
                      className="group border border-stone-200 bg-white"
                      open={flow.open}
                    >
                      <summary className="flex items-center justify-between gap-4 p-6 md:p-8 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <div>
                          <h3 className="text-lg font-semibold mb-2">{flow.title}</h3>
                          <p className="text-sm text-stone-600">{flow.description}</p>
                        </div>
                        <ChevronDown className="h-5 w-5 text-stone-500 transition-transform duration-200 group-open:rotate-180" />
                      </summary>
                      <div className="px-6 pb-6 md:px-8 md:pb-8">
                        <div className="border border-dashed border-stone-300 p-6 text-sm text-stone-500 mb-4">
                          Screenshot placeholder (drop your image here)
                        </div>
                        <CodeBlock
                          code={flow.json}
                          fileName={`${flow.title.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "")}.json`}
                        />
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              <section id="pro-mode" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Pro Mode</h2>
                  </div>
                  <p className="text-base md:text-lg text-stone-600 mb-6 md:mb-8 leading-relaxed">
                    Unlock logic gates, custom Move calls, and unlimited nodes. Pro mode is designed
                    for advanced strategies and longer flows.
                  </p>
                </FadeIn>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    "Logic + condition gates",
                    "Custom Move module calls",
                    "Unlimited nodes per flow",
                  ].map((item) => (
                    <motion.div key={item} className="border border-stone-200 p-6" whileHover={{ y: -2 }}>
                      <p className="text-sm text-stone-600">{item}</p>
                    </motion.div>
                  ))}
                </div>
              </section>

              <section id="tech-stack" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Zap className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Tech Stack</h2>
                  </div>
                </FadeIn>
                <div className="grid md:grid-cols-2 gap-4">
                  {stack.map((item) => (
                    <div key={item} className="border border-stone-200 px-4 py-3 text-sm text-stone-600">
                      {item}
                    </div>
                  ))}
                </div>
              </section>

              <section id="components" className="mb-20 scroll-mt-32">
                <FadeIn>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Boxes className="h-5 w-5 text-[#384CE3]" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Components</h2>
                  </div>
                </FadeIn>
                <div className="grid md:grid-cols-2 gap-6">
                  {components.map((item) => (
                    <motion.div key={item.title} className="border border-stone-200 p-6" whileHover={{ y: -2 }}>
                      <h3 className="font-semibold text-[#111] mb-2">{item.title}</h3>
                      <p className="text-sm text-stone-600">{item.description}</p>
                    </motion.div>
                  ))}
                </div>
              </section>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
