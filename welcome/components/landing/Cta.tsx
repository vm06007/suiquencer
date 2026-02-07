"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";
import { ArrowRight, Rocket } from "lucide-react";
import { motion } from "framer-motion";
import { PlayDemoButton } from "@/components/landing/PlayDemoButton";

export function Cta() {
  return (
    <section className="py-32 bg-[#384CE3] text-white text-center relative overflow-hidden">
      {/* Dot Pattern */}
      <div className="absolute inset-0 opacity-[0.07]" style={{
        backgroundImage: `radial-gradient(white 1px, transparent 1px)`,
        backgroundSize: '20px 20px',
      }} />

      <div className="container mx-auto px-4 md:px-6 max-w-3xl relative z-10">
        <FadeIn direction="up">
          <motion.h2 
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 md:mb-6 tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            Ready to build your first flow?
          </motion.h2>
        </FadeIn>
        
        <FadeIn direction="up" delay={0.1}>
          <motion.p 
            className="text-sm sm:text-base md:text-lg lg:text-xl text-blue-100 mb-8 md:mb-10 max-w-xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Open the canvas, connect your wallet, and execute multi-step DeFi flows in minutes.
          </motion.p>
        </FadeIn>
        
        <FadeIn direction="up" delay={0.2}>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link href="https://my.suiquencer.io">
                <Button size="lg" className="h-10 md:h-12 px-6 md:px-8 bg-[#2a3bc0] text-white hover:bg-[#2433a6] border border-white/20 rounded-none text-xs md:text-sm font-semibold tracking-wide shadow-lg hover:shadow-xl transition-all duration-300 gap-2">
                  <Rocket className="h-4 w-4" />
                  Try It Out
                </Button>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <PlayDemoButton className="h-10 md:h-12 px-6 md:px-8 bg-white text-[#384CE3] hover:bg-blue-50 border border-white/30 rounded-none text-xs md:text-sm font-medium transition-all duration-300 gap-2" />
            </motion.div>
          </div>
        </FadeIn>

        <FadeIn direction="up" delay={0.3}>
          <motion.p 
            className="text-[10px] md:text-xs text-blue-200/80 mt-6 md:mt-8 font-medium"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            Open beta. No credit card required.
          </motion.p>
        </FadeIn>
      </div>
    </section>
  );
}
