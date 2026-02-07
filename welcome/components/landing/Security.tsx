"use client";

import { Shield, Lock, Server, Eye, Check, Star } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { useEffect, useState } from "react";

function CountUpNumber({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => v.toFixed(value % 1 === 0 ? 0 : 2));
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(count, value, { duration: 1.5, ease: "easeOut" });
      return controls.stop;
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [count, value, delay]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(String(v)));
    return unsubscribe;
  }, [rounded]);

  return <>{displayValue}{suffix}</>;
}

const tiers = [
  {
    name: "Starter",
    type: "Free",
    description: "Core canvas, wallet connect, swaps, and basic flows.",
    badgeColor: "#1a365d",
    bullets: ["Up to 12 nodes", "Cetus / Turbos swaps", "Scallop lend (deposit)", "Flow export JSON"],
    panelTitle: "Starter Mode Includes",
    panelSubtitle: "Everything you need to start building on Sui.",
    panelFeatures: [
      {
        icon: Lock,
        title: "Core Canvas",
        description: "Drag, connect, and run multi-step flows with a simple node editor.",
      },
      {
        icon: Server,
        title: "Wallet + Swaps",
        description: "Connect a Sui wallet and swap through Cetus / Turbos with live quotes.",
      },
      {
        icon: Eye,
        title: "Saved Flows",
        description: "Export flow JSON for reuse, sharing, or backups.",
      },
    ],
    stats: [
      { value: "12", label: "Nodes per flow" },
      { value: "4", label: "Core node types" },
    ],
    badgeList: ["Canvas", "Wallet connect", "Swaps", "Flow export"],
  },
  {
    name: "Pro",
    type: "Full",
    description: "Unlock logic, condition gates, and advanced nodes.",
    badgeColor: "#065f46",
    bullets: ["Logic + condition gates", "Custom Move calls", "Selector branching", "Unlimited nodes"],
    highlight: true,
    panelTitle: "Pro Mode Unlocks",
    panelSubtitle: "Advanced logic, custom Move calls, and unlimited nodes.",
    panelFeatures: [
      {
        icon: Lock,
        title: "Logic & Conditions",
        description: "Balance and contract checks to gate branches and conditional paths.",
      },
      {
        icon: Server,
        title: "Custom Move Calls",
        description: "Call any Move module with type args and smart parameter hints.",
      },
      {
        icon: Eye,
        title: "Unlimited Nodes",
        description: "Build long strategies without the 12-step cap.",
      },
    ],
    stats: [
      { value: "12+", label: "Nodes per flow" },
      { value: "∞", label: "Custom logic paths" },
    ],
    badgeList: ["Logic gates", "Condition checks", "Custom Move", "Branching", "Unlimited nodes", "Personal support"],
  },
  {
    name: "Team",
    type: "Workspace",
    description: "Shared flows and team settings for growing squads.",
    badgeColor: "#7c2d12",
    bullets: ["Shared flow library", "Team presets", "Review-only mode", "Priority support"],
    panelTitle: "Team Plan Benefits",
    panelSubtitle: "Collaborate on flows with shared libraries and controls.",
    panelFeatures: [
      {
        icon: Lock,
        title: "Shared Library",
        description: "A single workspace for reusable flows and templates.",
      },
      {
        icon: Server,
        title: "Team Presets",
        description: "Standardize tokens, slippage, and protocol defaults.",
      },
      {
        icon: Eye,
        title: "Review-Only Mode",
        description: "Let teammates review flows without editing.",
      },
    ],
    stats: [
      { value: "3+", label: "Team members" },
      { value: "∞", label: "Shared flows" },
    ],
    badgeList: ["Shared library", "Presets", "Review-only", "Priority support"],
  },
];

export function Security() {
  const [activeTier, setActiveTier] = useState(1);
  const selectedTier = tiers[activeTier];
  return (
    <section id="execution" className="py-32 bg-white border-t border-black/5 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        
        {/* Header */}
        <FadeIn className="mb-10 md:mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-green-50 border border-green-100 text-green-700 text-[10px] md:text-xs mb-4 md:mb-6">
            <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" />
            TIERS & PRO MODE
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 md:mb-6 text-[#111]">
            Pick the <span className="text-[#384CE3]">right tier</span>
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto">
            Pro mode unlocks logic gates, custom Move calls, and unlimited nodes. We call it <span className="underline">Suiquencer+</span>
          </p>
        </FadeIn>

        {/* Certification Badges - Realistic Style */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {tiers.map((tier, index) => (
            <FadeIn key={tier.name} delay={0.1 * index}>
              <motion.div 
                className={`bg-white border p-6 h-full hover:shadow-md transition-all duration-300 group ${
                  tier.highlight ? "border-emerald-300 shadow-lg shadow-emerald-200/30" : "border-stone-200"
                }`}
                onClick={() => setActiveTier(index)}
                role="button"
                tabIndex={0}
                aria-pressed={activeTier === index}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveTier(index);
                  }
                }}
                whileHover={{ y: -3, boxShadow: "0 8px 20px -5px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Badge Visual */}
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="shrink-0 w-16 h-20 flex flex-col items-center justify-center text-white relative"
                    style={{ backgroundColor: tier.badgeColor }}
                  >
                    {/* Badge ribbon shape */}
                    <div 
                      className="absolute -bottom-2 left-0 right-0 h-4"
                      style={{
                        background: `linear-gradient(135deg, ${tier.badgeColor} 50%, transparent 50%), linear-gradient(-135deg, ${tier.badgeColor} 50%, transparent 50%)`,
                        backgroundSize: '50% 100%',
                        backgroundPosition: 'left, right',
                        backgroundRepeat: 'no-repeat',
                      }}
                    />
                    {tier.highlight ? <Star className="w-6 h-6 mb-1" /> : <Shield className="w-6 h-6 mb-1" />}
                    <span className="text-[10px] font-bold tracking-wider">{tier.name}</span>
                  </div>
                  <div>
                    <div className="text-base md:text-lg font-bold text-[#111]">{tier.name}</div>
                    <div className="text-sm font-medium text-[#384CE3]">{tier.type}</div>
                  </div>
                </div>
                <p className="text-stone-600 text-sm mb-4">{tier.description}</p>
                <ul className="space-y-2">
                  {tier.bullets.map((bullet) => (
                    <li key={bullet} className="text-xs text-stone-500 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-stone-300" />
                      {bullet}
                    </li>
                  ))}
                </ul>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Security Features Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Features List */}
          <FadeIn delay={0.2}>
            <div className="relative overflow-hidden bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 p-8 h-full group">
              <div className="absolute inset-0 opacity-20 mix-blend-soft-light pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />
              
              <div className="relative z-10">
                <h3 className="text-xl md:text-2xl font-bold text-[#111] mb-2">{selectedTier.panelTitle}</h3>
                <p className="text-sm text-stone-500 mb-6 md:mb-8">{selectedTier.panelSubtitle}</p>
                <div className="space-y-8">
                  {selectedTier.panelFeatures.map((feature, index) => (
                    <motion.div 
                      key={feature.title} 
                      className="flex gap-4"
                      initial={{ opacity: 0, x: -30 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.15 }}
                      whileHover={{ x: 5 }}
                    >
                      <motion.div 
                        className="shrink-0 w-12 h-12 bg-stone-50 border border-stone-200 flex items-center justify-center"
                        whileHover={{ scale: 1.1, rotate: 5 }}
                      >
                        <feature.icon className="w-5 h-5 text-[#384CE3]" />
                      </motion.div>
                      <div>
                        <h4 className="font-semibold text-[#111] mb-1">{feature.title}</h4>
                        <p className="text-stone-600 text-sm leading-relaxed">{feature.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Right: Trust Stats */}
          <FadeIn delay={0.3}>
            <div className="group relative overflow-hidden bg-stone-900 border border-stone-800 text-white p-8 h-full shadow-sm hover:shadow-md transition-all duration-300">
              {/* Background Pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[16px_16px] opacity-20" />
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-8">
                    <motion.div
                      className="w-2 h-2 bg-green-500"
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    />
                    <span className="text-xs text-stone-400 uppercase tracking-wider">Security Status: Active</span>
                  </div>

                  <div className="mb-8">
                    <div className="text-3xl md:text-5xl font-bold tracking-tight mb-2 text-white">
                      {selectedTier.name.toUpperCase()}
                    </div>
                    <div className="text-stone-400 text-xs md:text-sm">{selectedTier.type}</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 pt-6 border-t border-stone-800">
                    {selectedTier.stats.map((stat) => (
                      <div key={stat.label}>
                        <div className="text-xl md:text-2xl font-bold text-green-400 mb-1">{stat.value}</div>
                        <div className="text-stone-400 text-xs">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 mt-auto">
                  <div className="text-xs text-stone-500 uppercase tracking-wider mb-4">
                    Included in {selectedTier.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedTier.badgeList.map((badge, index) => (
                      <motion.span 
                        key={badge}
                        className="px-3 py-1.5 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-xs font-medium flex items-center gap-1.5"
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -2 }}
                      >
                        <Check className="w-3 h-3 text-green-500" />
                        {badge}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>

      </div>
    </section>
  );
}
