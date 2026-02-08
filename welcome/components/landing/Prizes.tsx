"use client";

import { Target, Rocket } from "lucide-react";
import { FadeIn } from "@/components/animations/FadeIn";

const problemPoints = [
  "Complex DeFi workflows are hard to compose, debug, and preview on-chain",
  "Users lack a visual way to validate sequencing, balances, and dependencies",
  "Atomic execution is powerful on Sui but difficult to orchestrate across protocols",
];

const commitmentPoints = [
  "Continue expanding protocol coverage (swaps, lending, bridges, Move calls)",
  "Ship Pro Mode features: logic gates, condition branching, unlimited nodes",
  "Improve analytics, flow templates, and team collaboration tools",
];

export function Prizes() {
  return (
    <section id="problem" className="py-20 md:py-24 border-b border-black/5 bg-white">
      <div className="container mx-auto px-4 md:px-6 max-w-6xl">
        <FadeIn className="text-center mb-10 md:mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-100 text-[#384CE3] text-[10px] md:text-xs uppercase tracking-wider mb-4">
            <Target className="h-3.5 w-3.5" />
            Problem + Commitment
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#111]">
            Why we need Suiquencer
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-stone-600 max-w-2xl mx-auto mt-3">
            Suiquencer makes complex DeFi workflows visual, predictable, and atomic on Sui — and we're committed to shipping beyond the hackathon.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-8">
          <FadeIn>
            <div className="border border-stone-200 p-6 md:p-8 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4 text-[#384CE3]" />
                <h3 className="text-lg font-semibold text-[#111]">The problem it solves</h3>
              </div>
              <ul className="space-y-3">
                {problemPoints.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-stone-600">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#384CE3] shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          <FadeIn delay={0.1}>
            <div className="border border-stone-200 p-6 md:p-8 h-full">
              <div className="flex items-center gap-2 mb-4">
                <Rocket className="h-4 w-4 text-emerald-600" />
                <h3 className="text-lg font-semibold text-[#111]">Commitment after the hackathon</h3>
              </div>
              <ul className="space-y-3">
                {commitmentPoints.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-stone-600">
                    <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
