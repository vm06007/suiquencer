"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { Layers, Wallet, Zap, Rocket } from "lucide-react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { PlayDemoButton } from "@/components/landing/PlayDemoButton";

function CountUpNumber({ value, suffix = "", delay = 0 }: { value: number; suffix?: string; delay?: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => {
    if (suffix === "M") return latest.toFixed(2);
    if (suffix === "ms") return Math.round(latest);
    if (latest < 1) return latest.toFixed(2);
    return latest.toFixed(0);
  });
  const [displayValue, setDisplayValue] = useState("0");

  useEffect(() => {
    const timeout = setTimeout(() => {
      const controls = animate(count, value, {
        duration: 2,
        ease: "easeOut",
      });
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

function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayText, setDisplayText] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      let i = 0;
      const interval = setInterval(() => {
        if (i < text.length) {
          setDisplayText(text.slice(0, i + 1));
          i++;
        } else {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1000);
        }
      }, 50);
      return () => clearInterval(interval);
    }, delay * 1000);
    return () => clearTimeout(timeout);
  }, [text, delay]);

  return (
    <>
      {displayText}
      {showCursor && <span className="animate-pulse text-[#384CE3]">|</span>}
    </>
  );
}

export function Hero() {
  return (
    <section className="pt-16 pb-16 lg:pt-20 lg:pb-16 border-b border-black/5 relative overflow-hidden bg-white">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-full h-full bg-linear-to-br from-blue-100/40 via-transparent to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-linear-to-tl from-emerald-100/30 via-transparent to-transparent rounded-full blur-3xl"
          animate={{
            x: [0, -80, 0],
            y: [0, -60, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      
      <div className="container mx-auto px-4 md:px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <div className="max-w-2xl">
            <FadeIn delay={0.1}>
              <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-blue-50 border border-blue-100 text-[#384CE3] text-[10px] md:text-xs mb-6 md:mb-8">
                <span className="w-1.5 h-1.5 bg-[#384CE3] rounded-full animate-pulse" />
                VISUAL DEFI FLOW BUILDER FOR SUI
              </div>
            </FadeIn>
            
            <FadeIn delay={0.2}>
              <h1 className="text-4xl md:text-6xl font-semibold tracking-tighter leading-[1.1] mb-6 md:mb-8 text-[#111]">
                Design multi-step DeFi flows on Sui.
                <br className="hidden lg:block" />
                <span className="text-[#384CE3]">
                  <TypewriterText text="Run them atomically." delay={0.5} />
                </span>
              </h1>
            </FadeIn>
            
            <FadeIn delay={0.3}>
              <p className="text-base sm:text-lg md:text-xl text-stone-600 max-w-lg mb-8 md:mb-10 leading-relaxed tracking-tight">
                Drag nodes onto a canvas, connect your wallet, preview balances, and execute swaps,
                lending, bridges, and custom Move calls in a single transaction.
              </p>
            </FadeIn>
            
            <FadeIn delay={0.4}>
              <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-3">
                <Link href="https://my.suiquencer.io" className="w-full sm:w-auto">
                  <Button size="lg" className="group relative bg-[#384CE3] hover:bg-[#2a3bc0] text-white rounded-none px-6 md:px-8 h-10 md:h-12 text-xs md:text-sm font-medium w-full sm:w-auto transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 overflow-hidden gap-2">
                    <span className="relative z-10 flex items-center gap-2">
                      <Rocket className="h-4 w-4" />
                      Try It Out
                    </span>
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-linear-to-r from-transparent via-white/20 to-transparent" />
                  </Button>
                </Link>
                <PlayDemoButton className="rounded-none px-6 md:px-8 h-10 md:h-12 text-xs md:text-sm font-medium border-stone-300 bg-white text-[#111] hover:bg-stone-50 hover:border-stone-400 w-full sm:w-auto transition-all duration-300 hover:shadow-md gap-2" />
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6 mt-4 md:mt-6 text-xs md:text-sm text-stone-500">
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Wallet className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-600" />
                  <span>Wallet-standard compatible</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 text-amber-500" />
                  <span>One transaction per run</span>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Simple Clean Card */}
          <div className="hidden lg:flex justify-center items-center relative">
            {/* Dot Pattern Background */}
            <div className="absolute inset-0 pointer-events-none">
              <div 
                className="absolute -top-8 -bottom-8 inset-x-0 opacity-60"
                style={{
                  backgroundImage: `radial-gradient(circle, #384CE3 1.5px, transparent 1.5px)`,
                  backgroundSize: '16px 16px',
                }}
              />
            </div>

            <FadeIn delay={0.5}>
              <motion.div 
                className="relative bg-white border border-stone-200 shadow-sm w-[400px]"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                whileHover={{ y: -4 }}
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-6 border-b border-stone-100">
                  <div className="h-10 w-10 bg-blue-50 border border-blue-100 flex items-center justify-center">
                    <Layers className="h-5 w-5 text-[#384CE3]" />
                  </div>
                  <span className="text-lg md:text-xl font-semibold text-stone-900">Flow Preview</span>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 md:gap-6 p-4 md:p-6 border-b border-stone-100 items-center">
                  <div>
                    <div className="text-[10px] md:text-xs font-medium text-stone-400 uppercase tracking-wider mb-1 md:mb-2">
                      Nodes
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-stone-900 tracking-tight">
                      3
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs font-medium text-stone-400 uppercase tracking-wider mb-1 md:mb-2">
                      Edges
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-stone-900 tracking-tight">
                      2
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] md:text-xs font-medium text-stone-400 uppercase tracking-wider mb-1 md:mb-2">
                      Transactions
                    </div>
                    <div className="text-2xl md:text-4xl font-bold text-stone-900 tracking-tight">
                      1
                    </div>
                  </div>
                </div>

                {/* Tags */}
                <div className="p-4 md:p-6">
                  <div className="text-[10px] md:text-xs font-medium text-stone-400 uppercase tracking-wider mb-2 md:mb-3">
                    Protocols
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
                    <motion.span 
                      className="px-2 md:px-3 py-1 md:py-1.5 bg-blue-50 text-blue-700 text-xs md:text-sm font-medium border border-blue-100"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 }}
                    >
                      Cetus / Turbos
                    </motion.span>
                    <span className="text-xs md:text-sm font-semibold text-stone-300 px-1">+</span>
                    <motion.span 
                      className="px-2 md:px-3 py-1 md:py-1.5 bg-emerald-50 text-emerald-700 text-xs md:text-sm font-medium border border-emerald-100"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.1 }}
                    >
                      Scallop
                    </motion.span>
                    <motion.span 
                      className="px-2 md:px-3 py-1 md:py-1.5 bg-stone-50 text-stone-700 text-xs md:text-sm font-medium border border-stone-200"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.2 }}
                    >
                      LI.FI + SuiNS
                    </motion.span>
                  </div>
                </div>
              </motion.div>
            </FadeIn>

            {/* Small decorative element */}
            <motion.div 
              className="absolute bottom-4 left-4 h-4 w-4 bg-[#384CE3]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.3 }}
            />
          </div>
        </div>
      </div>

      <div className="absolute right-0 top-0 h-full w-1/3 border-l border-black/5 hidden lg:block pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-full h-px border-t border-black/5 pointer-events-none" />
    </section>
  );
}
