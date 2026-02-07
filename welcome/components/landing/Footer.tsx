"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/animations/FadeIn";

export function Footer() {
  const logoHover = {
    rest: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 5 },
  };

  return (
    <footer className="bg-white pt-24 pb-16 border-t border-stone-200 relative overflow-hidden">
      {/* Noise Texture - CSS-only, no external dependency */}
      <div className="absolute inset-0 opacity-20 mix-blend-soft-light pointer-events-none" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }} />

      <div className="container mx-auto px-4 md:px-6 max-w-7xl relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10 md:gap-12 mb-16">
          {/* Brand Column */}
          <FadeIn className="col-span-2 pr-4 md:pr-8">
            <motion.div
              className="inline-flex mb-4 md:mb-6"
              initial="rest"
              animate="rest"
              whileHover="hover"
              whileTap="rest"
            >
              <Link href="/" className="flex items-center gap-[13px] group">
                <motion.div
                  className="h-8 w-8 md:h-10 md:w-10 rounded-[8px] bg-[#384de3] flex items-center justify-center"
                  variants={logoHover}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src="/suiquencer-logo.svg"
                    alt="Suiquencer logo"
                    width={40}
                    height={40}
                    className="h-8 w-8 md:h-10 md:w-10"
                  />
                </motion.div>
                <span className="font-bold text-xl md:text-2xl tracking-tight text-[#111] group-hover:text-[#384CE3] transition-colors">
                  Suiquencer
                </span>
              </Link>
            </motion.div>
            <p className="text-stone-600 text-sm md:text-base max-w-sm mb-6 md:mb-8 leading-relaxed">
              Visual DeFi flow builder for Sui. Compose swaps, lending, bridges, and custom Move calls into a single atomic run.
            </p>
            <div className="flex gap-3">
              <a href="https://x.com/EthVitally" className="h-10 w-10 bg-stone-50 border border-stone-200 hover:border-[#384CE3] hover:bg-white hover:text-[#384CE3] transition-all duration-300 flex items-center justify-center text-stone-400">
                <span className="sr-only">X (Twitter)</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="http://linkedin.com/in/vitally/" className="h-10 w-10 bg-stone-50 border border-stone-200 hover:border-[#0077b5] hover:bg-white hover:text-[#0077b5] transition-all duration-300 flex items-center justify-center text-stone-400">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="https://github.com/vm06007/suiquencer" className="h-10 w-10 bg-stone-50 border border-stone-200 hover:border-[#333] hover:bg-white hover:text-[#333] transition-all duration-300 flex items-center justify-center text-stone-400">
                <span className="sr-only">GitHub</span>
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </FadeIn>
          
          {/* Product Column */}
          <FadeIn delay={0.1}>
            <h4 className="text-sm md:text-base font-semibold text-[#111] mb-4 md:mb-5 uppercase tracking-wide">Product</h4>
            <ul className="space-y-3">
              {[
                { name: "Features", href: "/#features" },
                { name: "Use Cases", href: "/#solutions" },
                { name: "Planner", href: "/#planner" },
                { name: "Pro Mode", href: "/#execution" },
                { name: "Request Pro Access", href: "/book-demo" },
              ].map((item) => (
                <motion.li key={item.name} whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  <Link href={item.href} className="text-sm text-stone-600 hover:text-[#384CE3] transition-colors">{item.name}</Link>
                </motion.li>
              ))}
            </ul>
          </FadeIn>

          {/* Developers Column */}
          <FadeIn delay={0.2}>
            <h4 className="text-sm md:text-base font-semibold text-[#111] mb-4 md:mb-5 uppercase tracking-wide">Developers</h4>
            <ul className="space-y-3">
              {[
                { name: "Documentation", href: "/docs" },
                { name: "Flow JSON", href: "/docs#flow-json" },
                { name: "Examples", href: "/docs#examples" },
                { name: "Tech Stack", href: "/docs#tech-stack" },
              ].map((item) => (
                <motion.li key={item.name} whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  <Link href={item.href} className="text-sm text-stone-600 hover:text-[#384CE3] transition-colors">{item.name}</Link>
                </motion.li>
              ))}
            </ul>
          </FadeIn>

          {/* Social Column */}
          <FadeIn delay={0.3}>
            <h4 className="text-sm md:text-base font-semibold text-[#111] mb-4 md:mb-5 uppercase tracking-wide">Social</h4>
            <ul className="space-y-3">
              {[
                { name: "Follow", href: "https://x.com/EthVitally" },
                { name: "Email", href: "mailto:vitalik@bitcoin.com" },
                { name: "Connect", href: "http://linkedin.com/in/vitally/" },
              ].map((item) => (
                <motion.li key={item.name} whileHover={{ x: 3 }} transition={{ duration: 0.2 }}>
                  <Link href={item.href} className="text-sm text-stone-600 hover:text-[#384CE3] transition-colors">{item.name}</Link>
                </motion.li>
              ))}
            </ul>
          </FadeIn>
        </div>
        
        {/* Bottom Bar */}
        <FadeIn delay={0.4}>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-stone-200">
            <motion.div 
              className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-100"
              whileHover={{ scale: 1.02 }}
            >
              <motion.div 
                className="h-2 w-2 bg-green-500"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <span className="text-sm text-green-700">Sui mainnet connected</span>
            </motion.div>
          
            <div className="flex flex-wrap justify-center md:justify-end gap-4 sm:gap-8 mt-6 md:mt-0">
              <p className="text-sm text-stone-500 w-full sm:w-auto text-center sm:text-left">© 2026 Suiquencer Inc.</p>
            </div>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
