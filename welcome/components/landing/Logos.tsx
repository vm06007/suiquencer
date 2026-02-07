"use client";

import { FadeIn } from "@/components/animations/FadeIn";
import { motion } from "framer-motion";

const logos = [
  { name: "Sui", href: "https://sui.io", color: "#6f5cff" },
  { name: "Cetus", href: "https://www.cetus.zone", color: "#2f8cff" },
  { name: "Turbos", href: "https://turbos.finance", color: "#ff7a00" },
  { name: "Scallop", href: "https://scallop.io", color: "#00b38a" },
  { name: "LI.FI", href: "https://li.fi", color: "#7c3aed" },
  { name: "SuiNS", href: "https://suins.io", color: "#1f7aff" },
];

function TypewriterLogo({ name, delay, href, color }: { name: string; delay: number; href: string; color: string }) {
  const letters = name.split("");

  return (
    <motion.a
      href={href}
      className="text-lg md:text-xl font-bold cursor-pointer transition-colors duration-0"
      style={{ color: "#9ca3af" }}
      whileHover={{ scale: 1.05, color }}
    >
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.1,
            delay: delay + i * 0.05,
            ease: "easeOut",
          }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.a>
  );
}

export function Logos() {
  return (
    <section className="pt-16 pb-16 border-b border-black/5 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <div className="text-center mb-12">
          <FadeIn>
            <p className="text-xs md:text-sm text-stone-500 uppercase tracking-widest">
              Built on the Sui ecosystem
            </p>
          </FadeIn>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8 lg:gap-12 items-center justify-items-center">
          {logos.map((logo, i) => (
            <TypewriterLogo key={i} name={logo.name} href={logo.href} color={logo.color} delay={0.5 + i * 0.3} />
          ))}
        </div>
      </div>
    </section>
  );
}
