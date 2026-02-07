"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Building2, TrendingUp, Shield, Activity, Check, ArrowRight, Zap } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

// Animated counter component
function AnimatedCounter({ value, suffix = "" }: { value: string; suffix?: string }) {
  const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => {
    if (value.includes('%')) return v.toFixed(2);
    if (value.includes('+')) return Math.floor(v) + '+';
    return Math.floor(v).toString();
  });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const controls = animate(count, numericValue, { duration: 1.5, ease: "easeOut" });
    return controls.stop;
  }, [count, numericValue]);

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) => setDisplayValue(String(v)));
    return unsubscribe;
  }, [rounded]);

  return <>{displayValue}{suffix}</>;
}

const featureCards = [
  {
    id: "canvas",
    label: "Canvas",
    icon: Building2,
    title: "Drag-and-Drop Flow Design",
    description: "Build multi-step DeFi sequences visually with a node-based canvas. Pan, zoom, and connect steps to see your flow at a glance.",
    color: "#384CE3",
    bullets: ["React Flow canvas", "Edge styles & auto-layout", "Multi-tab workspace", "Autosave to localStorage"],
    stats: { value: "7", suffix: "+", label: "Node Types" },
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: TrendingUp,
    title: "Live Balance & Execution Order",
    description: "Connect any Wallet Standard compatible wallet and watch effective balances update as steps execute in sequence.",
    color: "#00D478",
    bullets: ["Sui Wallet + Phantom", "SuiNS name resolution", "Effective balance preview", "Topological execution order"],
    stats: { value: "", suffix: "", label: "Balance Refresh" },
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: Shield,
    title: "Protocol Nodes Out of the Box",
    description: "Swap, lend, and bridge with a single node. Suiquencer wires the protocol SDKs so you can focus on the flow.",
    color: "#FF5733",
    bullets: ["Cetus + Turbos swaps", "Scallop lend/borrow", "LI.FI bridges", "Logic + condition gates"],
    stats: { value: "63", suffix: "+", label: "EVM Chains" },
  },
  {
    id: "execution",
    label: "Execution",
    icon: Activity,
    title: "Atomic, Deterministic Runs",
    description: "Every flow executes as one transaction. If any step fails, the entire sequence reverts.",
    color: "#5856D6",
    bullets: ["Single-transaction runs", "Success modal + explorer link", "Execution sidebar preview", "Custom Move calls"],
    stats: { value: "", suffix: "", label: "Per Run" },
  },
];



export function Features() {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeFeature = featureCards[activeIndex];

  return (
    <section id="features" className="py-16 md:py-24 bg-white scroll-mt-20 overflow-hidden">
      <div className="container mx-auto px-5 sm:px-6 md:px-8 max-w-7xl">
        
        {/* Section Header */}
        <FadeIn className="mb-10 md:mb-16 text-center">
          <motion.div 
            className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-blue-50 border border-blue-100 text-[#384CE3] text-[10px] md:text-xs mb-4 md:mb-6"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              animate={{ rotate: [0, 15, -15, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            >
              <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" />
            </motion.div>
            FLOW-BUILDING TOOLKIT
          </motion.div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 md:mb-6 text-[#111]">
            Everything you need to <span className="text-[#384CE3]">build</span>.
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto">
            Compose complex sequences from protocol nodes, preview outcomes, and execute atomically.
          </p>
        </FadeIn>

        {/* Split Screen Layout */}
        <div className="grid lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-16">
          
          {/* Left - Sticky Navigation (Hidden on mobile) */}
          <div className="hidden lg:block lg:col-span-4">
            <div className="lg:sticky lg:top-32">
              <div className="space-y-2">
                {featureCards.map((feature, index) => {
                  const Icon = feature.icon;
                  const isActive = activeIndex === index;

                  return (
                    <motion.button
                      key={feature.id}
                      onClick={() => setActiveIndex(index)}
                      animate={{ x: isActive ? 8 : 0 }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left p-4 transition-all duration-300 group ${
                        isActive 
                          ? 'bg-stone-50' 
                          : 'hover:bg-stone-50/50'
                      }`}
                      style={{ 
                        borderLeft: isActive ? `2px solid ${feature.color}` : '2px solid transparent',
                      }}
                    >
                      <div className="flex items-center gap-4">
                        <motion.div 
                          className={`w-10 h-10 flex items-center justify-center transition-all duration-300 ${
                            isActive ? '' : 'bg-stone-100'
                          }`}
                          style={{ 
                            backgroundColor: isActive ? `${feature.color}15` : undefined,
                          }}
                          animate={isActive ? { 
                            scale: [1, 1.1, 1],
                            rotate: [0, 5, -5, 0]
                          } : {}}
                          transition={{ duration: 0.5 }}
                        >
                          <Icon 
                            className="w-5 h-5 transition-colors" 
                            style={{ color: isActive ? feature.color : '#737373' }}
                          />
                        </motion.div>
                        <div>
                          <motion.span 
                            className={`text-xs font-medium uppercase tracking-wider transition-colors ${
                              isActive ? '' : 'text-stone-400'
                            }`}
                            style={{ color: isActive ? feature.color : undefined }}
                            animate={isActive ? { opacity: [0.5, 1] } : {}}
                          >
                            {feature.label}
                          </motion.span>
                          <h3 className={`font-semibold transition-colors ${
                            isActive ? 'text-[#111]' : 'text-stone-500'
                          }`}>
                            {feature.title}
                          </h3>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Progress Indicator */}
              <div className="mt-8 hidden lg:block">
                <div className="flex gap-2">
                  {featureCards.map((feature, index) => (
                    <motion.div 
                      key={feature.id}
                      className="h-1 flex-1 overflow-hidden bg-stone-200"
                    >
                      <motion.div
                        className="h-full"
                        initial={{ width: "0%" }}
                        animate={{ width: index <= activeIndex ? "100%" : "0%" }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ backgroundColor: feature.color }}
                      />
                    </motion.div>
                  ))}
                </div>
                <motion.p 
                  className="text-xs text-stone-400 mt-2"
                  key={activeIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {activeIndex + 1} of {featureCards.length} features
                </motion.p>
              </div>
            </div>
          </div>

          {/* Right - Tabbed Content (Full width on mobile) */}
          <div className="col-span-12 lg:col-span-8 min-w-0">
            <motion.div
              key={activeFeature.id}
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="relative"
            >
              <motion.div 
                className="border p-4 sm:p-6 md:p-8 lg:p-10 relative overflow-hidden group bg-white"
                style={{ borderColor: `${activeFeature.color}30` }}
                whileHover={{ 
                  y: -5,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)"
                }}
                transition={{ duration: 0.3 }}
              >
                <motion.div 
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: activeFeature.color }}
                  initial={{ scaleX: 0, transformOrigin: "left" }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />

                <motion.div 
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: `radial-gradient(${activeFeature.color} 1px, transparent 1px)`,
                    backgroundSize: '20px 20px',
                  }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.03 }}
                  transition={{ duration: 0.6 }}
                />

                <div className="relative z-10">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4 sm:mb-6">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <motion.div 
                        className="w-10 h-10 sm:w-14 sm:h-14 flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${activeFeature.color}15` }}
                        whileHover={{ 
                          scale: 1.1,
                          rotate: 5,
                        }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        <activeFeature.icon className="w-5 h-5 sm:w-7 sm:h-7" style={{ color: activeFeature.color }} />
                      </motion.div>
                      <div>
                        <motion.span 
                          className="text-xs font-medium uppercase tracking-wider"
                          style={{ color: activeFeature.color }}
                        >
                          {activeFeature.label}
                        </motion.span>
                        <motion.h3 className="text-xl md:text-2xl font-bold text-[#111]">
                          {activeFeature.title}
                        </motion.h3>
                      </div>
                    </div>

                    {activeFeature.stats.value ? (
                      <motion.div 
                        className="hidden sm:block text-right px-4 py-2"
                        style={{ backgroundColor: `${activeFeature.color}10` }}
                      >
                        <motion.div 
                          className="text-xl md:text-2xl font-bold"
                          style={{ color: activeFeature.color }}
                        >
                          <AnimatedCounter value={activeFeature.stats.value} suffix={activeFeature.stats.suffix} />
                        </motion.div>
                        <div className="text-xs text-stone-500">
                          {activeFeature.stats.label}
                        </div>
                      </motion.div>
                    ) : null}
                  </div>

                  <motion.p className="text-stone-600 text-base md:text-lg leading-relaxed mb-6 md:mb-8">
                    {activeFeature.description}
                  </motion.p>

                  <div className="grid sm:grid-cols-2 gap-3 sm:gap-4 mb-6 sm:mb-8">
                    {activeFeature.bullets.map((bullet, bulletIndex) => (
                      <motion.div 
                        key={bullet} 
                        className="flex items-center gap-2 sm:gap-3 text-sm sm:text-base text-stone-700"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: bulletIndex * 0.05, duration: 0.3 }}
                        whileHover={{ x: 5 }}
                      >
                        <motion.div 
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${activeFeature.color}15` }}
                          whileHover={{ scale: 1.2, rotate: 10 }}
                        >
                          <Check className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: activeFeature.color }} />
                        </motion.div>
                        {bullet}
                      </motion.div>
                    ))}
                  </div>

                  <Link href="https://my.suiquencer.io" className="inline-flex items-center gap-2 text-sm font-semibold group" style={{ color: activeFeature.color }}>
                    Try It Out
                    <motion.div
                      animate={{ x: [0, 5, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.div>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}
