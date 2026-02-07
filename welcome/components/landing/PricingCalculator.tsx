"use client";

import { useState } from "react";
import Link from "next/link";
import { FadeIn } from "@/components/animations/FadeIn";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Zap, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { PlayDemoButton } from "@/components/landing/PlayDemoButton";

function getFlowSummary(steps: number) {
  const complexity = steps <= 3 ? "Quick Flow" : steps <= 7 ? "Multi-Step Flow" : "Complex Flow";
  const estimatedGas = (steps * 0.04 + 0.12).toFixed(2);
  const estimatedTime = (steps * 0.6).toFixed(1);
  const routes = steps <= 3 ? "Single chain" : steps <= 7 ? "Multi-protocol" : "Cross-chain";

  return {
    complexity,
    estimatedGas,
    estimatedTime,
    routes,
  };
}

export function PricingCalculator() {
  const [steps, setSteps] = useState(2);
  const summary = getFlowSummary(steps);

  const features = [
    `${steps} nodes in sequence`,
    `${summary.routes} routing`,
    "Atomic execution",
    "Reusable flow JSON",
  ];

  return (
    <section id="planner" className="py-24 bg-white border-b border-black/5 overflow-hidden">
      <div className="container mx-auto px-4 md:px-6 max-w-7xl">
        <FadeIn className="mb-10 md:mb-16 text-center">
          <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] md:text-xs mb-4 md:mb-6">
            <Zap className="w-3 h-3 md:w-3.5 md:h-3.5" />
            FLOW PLANNER
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 md:mb-6 text-[#111]">
            Plan your <span className="text-[#384CE3]">sequence</span>.
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-stone-600 max-w-2xl mx-auto">
            Estimate complexity, execution time, and routing depth before you run your atomic transaction.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-6">
          <FadeIn delay={0.1}>
            <div className="bg-white border border-stone-200 p-8 h-full shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-0 group-hover:h-1 transition-all duration-300 bg-[#384CE3] z-20" />
              <div className="absolute inset-0 opacity-20 mix-blend-soft-light pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <Zap className="w-4 h-4 text-[#384CE3]" />
                  <span className="text-xs text-[#384CE3] uppercase tracking-wider">
                    Flow Planner
                  </span>
                </div>

                <h3 className="text-xl md:text-2xl font-bold text-[#111] mb-2">
                  Size your flow
                </h3>
                <p className="text-stone-600 text-xs md:text-sm mb-6 md:mb-8">
                  Drag the slider to model the number of nodes in your sequence.
                </p>

                <div className="mb-8">
                  <div className="flex justify-between items-center mb-4">
                    <label className="text-sm font-medium text-stone-600">
                      Steps in flow
                    </label>
                    <span className="text-2xl md:text-3xl font-bold text-[#111] tabular-nums tracking-tight">
                      {steps}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="12"
                    step="1"
                    value={steps}
                    onChange={(e) => setSteps(Number(e.target.value))}
                    className="w-full h-2 bg-stone-200 appearance-none cursor-pointer accent-[#384CE3]"
                  />
                  <div className="flex justify-between text-xs text-stone-400 mt-2">
                    <span>1</span>
                    <span>4</span>
                    <span>7</span>
                    <span>10</span>
                    <span>12</span>
                  </div>
                </div>

                <div className="space-y-3">
                  {features.map((feature, index) => (
                    <motion.div 
                      key={feature} 
                      className="flex items-center gap-3 text-sm text-stone-600"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                    >
                      <motion.div 
                        className="w-5 h-5 bg-green-50 border border-green-100 flex items-center justify-center"
                        whileHover={{ scale: 1.2, rotate: 10 }}
                      >
                        <Check className="w-3 h-3 text-green-600" />
                      </motion.div>
                      {feature}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <motion.div 
              className="bg-stone-900 border border-stone-800 p-8 h-full relative overflow-hidden group"
              key={summary.complexity}
            >
              <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[16px_16px] opacity-20" />

              <div className="relative z-10 h-full flex flex-col">
                <div className="flex items-center gap-2 mb-8">
                  <motion.div
                    className="w-2 h-2 bg-emerald-500"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                  />
                  <span className="text-xs text-stone-400 uppercase tracking-wider">
                    Flow Summary
                  </span>
                </div>

                <div className="mb-6">
                  <motion.div 
                    className="text-3xl md:text-4xl font-bold text-white mb-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={summary.complexity}
                  >
                    {summary.complexity}
                  </motion.div>
                  <div className="text-stone-400 text-xs md:text-sm">
                    {summary.routes} routing
                  </div>
                </div>

                <div className="mb-8 grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {summary.estimatedGas} SUI
                    </div>
                    <div className="text-stone-500 text-xs md:text-sm mt-1">Est. gas saved</div>
                  </div>
                  <div>
                    <div className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                      {summary.estimatedTime}s
                    </div>
                    <div className="text-stone-500 text-xs md:text-sm mt-1">Est. time saved</div>
                  </div>
                </div>

                <div className="mt-auto space-y-3">
                  <Link href="https://my.suiquencer.io">
                    <Button className="w-full bg-[#384CE3] hover:bg-[#2a3bc0] text-white rounded-none h-12 gap-2">
                      <Rocket className="h-4 w-4" />
                      Try It Out
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <ArrowRight className="h-4 w-4" />
                      </motion.div>
                    </Button>
                  </Link>
                  <PlayDemoButton className="w-full rounded-none h-12 border-stone-300 bg-white text-[#111] hover:bg-stone-50 hover:border-stone-400 transition-all duration-300 gap-2" />
                </div>
              </div>
            </motion.div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
