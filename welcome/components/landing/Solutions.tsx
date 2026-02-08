"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Terminal, Shield, ArrowRight, Layers, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/animations/FadeIn";

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export function Solutions() {
  return (
    <section id="solutions" className="py-24 bg-white border-b border-black/5 scroll-mt-20">
      <div className="container mx-auto px-4 md:px-6">
        <FadeIn className="mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] md:text-xs mb-4 md:mb-6">
            <Layers className="w-3 h-3 md:w-3.5 md:h-3.5" />
            USE CASES
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold tracking-tight mb-4 md:mb-6 text-[#111]">
            Built for every <span className="text-[#384CE3]">strategy</span>.
          </h2>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-stone-600 max-w-2xl">
            From quick swaps to cross-chain strategies, Suiquencer adapts to how you trade and build.
          </p>
        </FadeIn>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Card 1: For Fintechs (Light/Code Theme) */}
          <motion.div 
            className="h-full"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
          >
            <div className="group relative h-full bg-white border border-stone-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col min-h-[600px]">
              {/* Background Pattern */}
              <div className="absolute inset-0 opacity-20 mix-blend-soft-light" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E\")" }}></div>
              <div className="absolute inset-0 bg-[radial-gradient(#384CE3_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.03]"></div>
              
              <div className="p-8 md:p-12 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 bg-blue-50 border border-blue-100 flex items-center justify-center text-[#384CE3]">
                    <Terminal className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-[#384CE3] font-medium tracking-wider uppercase">For Builders</span>
                </div>
                
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-stone-900 mb-3 md:mb-4">Prototype flows in seconds.</h3>
                <p className="text-sm md:text-base text-stone-600 mb-6 md:mb-8 leading-relaxed">
                  Drag nodes, connect edges, and save reusable flow JSON for testing or sharing with your team.
                </p>

                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {["Drag-and-drop nodes", "Save/load flow JSON", "Instant balance previews"].map((item, index) => (
                    <motion.li 
                      key={item} 
                      className="flex items-center gap-2 md:gap-3 text-stone-700 font-medium text-xs md:text-sm"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                    >
                      <motion.div
                        whileHover={{ scale: 1.2, rotate: 10 }}
                        className="w-5 h-5 md:w-6 md:h-6 bg-blue-50 flex items-center justify-center"
                      >
                        <Check className="h-3 w-3 md:h-4 md:w-4 text-[#384CE3]" />
                      </motion.div>
                      {item}
                    </motion.li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link href="/docs">
                    <Button variant="outline" className="rounded-none h-10 md:h-12 px-4 md:px-6 text-xs md:text-sm border-stone-200 hover:bg-stone-50 hover:text-[#384CE3] group-hover:border-[#384CE3]/30 transition-all gap-2">
                      Read the docs 
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </motion.div>
                    </Button>
                  </Link>
                </motion.div>
              </div>

              {/* Visual Mockup: Code Block */}
              <div className="mt-auto relative z-10 bg-stone-900 border-t border-stone-100/10">
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-white/20 to-transparent"></div>
                <div className="text-[9px] xs:text-[10px] sm:text-xs md:text-sm text-blue-100/80 overflow-x-auto">
                  <div className="flex gap-1.5 mb-2 sm:mb-4 px-3 sm:px-4 pt-3 sm:pt-4">
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <div className="p-3 sm:p-4 md:p-6 pt-1 sm:pt-2 space-y-0.5 sm:space-y-1 min-w-0">
                    <div className="text-stone-500 truncate">{"// Flow definition"}</div>
                    <div className="break-all sm:break-normal"><span className="text-purple-400">const</span> <span className="text-blue-300">flow</span> = {"{"}</div>
                    <div className="pl-2 sm:pl-4 break-all"><span className="text-blue-300">nodes</span>: [<span className="text-green-300">&quot;Wallet&quot;</span>, <span className="text-green-300">&quot;Swap(Cetus)&quot;</span>, <span className="text-green-300">&quot;Lend(Scallop)&quot;</span>],</div>
                    <div className="pl-2 sm:pl-4 break-all"><span className="text-blue-300">atomic</span>: <span className="text-orange-300">true</span>,</div>
                    <div className="pl-2 sm:pl-4 break-all"><span className="text-blue-300">saveAs</span>: <span className="text-green-300">&quot;yield-loop.json&quot;</span></div>
                    <div>{"};"}</div>
                    <div className="h-2 sm:h-4"></div>
                    <div className="text-stone-500">{"// Execute"}</div>
                    <div><span className="text-purple-400">await</span> <span className="text-blue-300">suiquencer</span>.<span className="text-blue-300">run</span>(flow)</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Card 2: For Banks (Dark/Table Theme) */}
          <motion.div 
            className="h-full"
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: 0.1 }}
          >
            <div className="group relative h-full bg-[#111] text-white border border-stone-800 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col min-h-[600px]">
               {/* Background Pattern */}
               <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] bg-size-[16px_16px] opacity-[0.05]"></div>
               
               <div className="p-8 md:p-12 relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 bg-stone-800 border border-stone-700 flex items-center justify-center text-white">
                    <Shield className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-stone-400 font-medium tracking-wider uppercase">For Power Users</span>
                </div>
                
                <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 md:mb-4">Run advanced strategies safely.</h3>
                <p className="text-sm md:text-base text-stone-400 mb-6 md:mb-8 leading-relaxed">
                  Chain logic, branching, and custom Move calls with atomic execution and a clear run order.
                </p>

                <ul className="space-y-2 md:space-y-3 mb-6 md:mb-8">
                  {["Balance checks + Selector nodes", "Custom Move module calls", "Execution sidebar preview"].map((item, index) => (
                    <motion.li 
                      key={item} 
                      className="flex items-center gap-2 md:gap-3 text-stone-300 font-medium text-xs md:text-sm"
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: 5 }}
                    >
                      <motion.div 
                        className="h-1.5 w-1.5 rounded-full bg-white"
                        whileHover={{ scale: 2 }}
                      />
                      {item}
                    </motion.li>
                  ))}
                </ul>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Link href="https://my.suiquencer.io">
                    <Button className="rounded-none h-10 md:h-12 px-4 md:px-6 text-xs md:text-sm bg-white text-black hover:bg-stone-200 transition-all gap-2">
                      <Rocket className="h-4 w-4" />
                      Try It Out 
                      <motion.div animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                        <ArrowRight className="h-3.5 w-3.5 md:h-4 md:w-4" />
                      </motion.div>
                    </Button>
                  </Link>
                </motion.div>
              </div>

              {/* Visual Mockup: Compliance Table */}
              <div className="mt-auto relative z-10 px-3 sm:px-6 md:px-8 pb-6 md:pb-10">
                <div className="bg-stone-900/80 backdrop-blur-sm border border-stone-800 overflow-hidden shadow-2xl">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 gap-2 sm:gap-4 p-2.5 sm:p-4 border-b border-white/5 bg-white/5 text-[10px] sm:text-xs text-stone-400 uppercase tracking-wider">
                    <div className="col-span-5">Node</div>
                    <div className="col-span-3">Type</div>
                    <div className="col-span-4 text-right">Status</div>
                  </div>
                  
                  {/* Table Rows */}
                  <div className="divide-y divide-white/5">
                     {/* Row 1 */}
                     <div className="grid grid-cols-12 gap-2 sm:gap-4 p-2.5 sm:p-4 items-center hover:bg-white/5 transition-colors">
                        <div className="col-span-5 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-white truncate">Wallet</div>
                          <div className="text-[8px] sm:text-[10px] text-stone-500">Balance OK</div>
                        </div>
                        <div className="col-span-3">
                           <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 text-[8px] sm:text-[10px] font-medium">ENTRY</div>
                        </div>
                        <div className="col-span-4 text-right">
                          <div className="text-[10px] sm:text-xs text-stone-300">Ready</div>
                        </div>
                     </div>
                     
                     {/* Row 2 */}
                     <div className="grid grid-cols-12 gap-2 sm:gap-4 p-2.5 sm:p-4 items-center bg-white/2 hover:bg-white/5 transition-colors">
                        <div className="col-span-5 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-white truncate">Swap</div>
                          <div className="text-[8px] sm:text-[10px] text-stone-500">Cetus / Turbos</div>
                        </div>
                        <div className="col-span-3">
                           <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-300 text-[8px] sm:text-[10px] font-medium">ROUTE</div>
                        </div>
                        <div className="col-span-4 text-right">
                          <div className="text-[10px] sm:text-xs text-stone-300">Quoted</div>
                        </div>
                     </div>

                     {/* Row 3 */}
                     <div className="grid grid-cols-12 gap-2 sm:gap-4 p-2.5 sm:p-4 items-center hover:bg-white/5 transition-colors opacity-60">
                        <div className="col-span-5 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-white truncate">Lend</div>
                          <div className="text-[8px] sm:text-[10px] text-stone-500">Scallop</div>
                        </div>
                        <div className="col-span-3">
                           <div className="inline-flex items-center px-1.5 sm:px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[8px] sm:text-[10px] font-medium">STEP</div>
                        </div>
                        <div className="col-span-4 text-right">
                          <div className="text-[10px] sm:text-xs text-stone-300">Queued</div>
                        </div>
                     </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
