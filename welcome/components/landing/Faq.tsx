"use client";

import { useState } from "react";
import { FadeIn } from "@/components/animations/FadeIn";
import { HelpCircle, Plus, Minus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      question: "Which wallets are supported?",
      answer: "Any Wallet Standard compatible wallet works, including Sui Wallet and Phantom. Connect once and your balance appears on the Wallet node."
    },
    {
      question: "Is Suiquencer non-custodial?",
      answer: "Yes. You approve and sign every run directly in your wallet. Suiquencer never holds funds."
    },
    {
      question: "Can I build cross-chain flows?",
      answer: "Yes. The Bridge node uses LI.FI to route across 63+ EVM chains and optionally into destination protocols."
    },
    {
      question: "How are swaps routed?",
      answer: "Swaps are aggregated through Cetus and Turbos with live quotes so you get the best available route at execution time."
    },
    {
      question: "Can I call custom Move contracts?",
      answer: "Absolutely. The Custom node lets you call any Move package/module/function with type and value arguments."
    },
    {
      question: "Where are my flows stored?",
      answer: "Flows are saved locally in your browser by default and can be exported or imported as JSON files."
    }
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-white border-b border-black/5">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        {/* Header - Centered */}
        <FadeIn className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-amber-50 border border-amber-100 text-amber-700 text-[10px] md:text-xs mb-4 md:mb-6">
            <HelpCircle className="w-3 h-3 md:w-3.5 md:h-3.5" />
            HAVE QUESTIONS?
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-3 md:mb-4 text-[#111]">
            Frequently asked questions
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-stone-600 max-w-2xl mx-auto">
            Everything you need to know to start building flows on Sui.
          </p>
        </FadeIn>
        
        {/* Two-Column Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {faqs.map((faq, i) => (
            <FadeIn key={i} delay={i * 0.05}>
              <motion.div
                className={`border bg-white p-6 cursor-pointer transition-all duration-300 ${
                  openIndex === i 
                    ? "border-[#384CE3] shadow-lg shadow-blue-500/10" 
                    : "border-stone-200 hover:border-[#384CE3]/50 hover:shadow-md"
                }`}
                onClick={() => toggleFaq(i)}
                whileHover={{ y: -2 }}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="text-xs font-mono text-[#384CE3] bg-blue-50 px-2 py-1 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="text-sm md:text-base font-medium text-[#111] leading-snug">
                      {faq.question}
                    </h3>
                  </div>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    {openIndex === i ? (
                      <Minus className="h-5 w-5 text-[#384CE3]" />
                    ) : (
                      <Plus className="h-5 w-5 text-stone-400" />
                    )}
                  </motion.div>
                </div>

                {/* Answer */}
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="text-stone-600 leading-relaxed text-sm mt-4 pl-10">
                        {faq.answer}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </FadeIn>
          ))}
        </div>

        {/* Contact Link */}
        <FadeIn delay={0.3}>
          <div className="text-center mt-12">
            <p className="text-stone-500 text-sm mb-4">
              Can&apos;t find what you&apos;re looking for?
            </p>
            <a 
              href="/docs" 
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#384CE3] text-white text-sm font-medium hover:bg-[#2a3bc0] transition-colors"
            >
              Read the docs
            </a>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
