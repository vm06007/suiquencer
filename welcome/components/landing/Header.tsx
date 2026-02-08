"use client";

import { useState, useEffect, MouseEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PlayDemoButton } from "@/components/landing/PlayDemoButton";
import { Menu, X, Rocket, BookOpen } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const logoHover = {
    rest: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 5 },
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);


  const handleNavClick = (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (!href.startsWith("/#")) return;
    if (pathname !== "/") return;
    event.preventDefault();
    const id = href.replace("/#", "");
    const target = document.getElementById(id);
    if (!target) return;
    const header = document.querySelector("header");
    const offset = header ? header.getBoundingClientRect().height + 12 : 80;
    const top = window.scrollY + target.getBoundingClientRect().top - offset;
    window.history.replaceState(null, "", href);
    window.scrollTo({ top, behavior: "smooth" });
  };

  const menuItems = [
    { label: "Features", href: "/#features" },
    { label: "Cases", href: "/#solutions" },
    { label: "Planner", href: "/#planner" },
    { label: "Modes", href: "/#execution" },
    { label: "Problem", href: "/#problem" },
    { label: "FAQ", href: "/#faq" },
  ];

  return (
    <>
      {/* Header - Always visible */}
      <header className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b border-black/10 min-h-16 md:min-h-0 flex items-center ${isScrolled ? "bg-white/80 backdrop-blur-lg py-2 md:py-3 shadow-sm" : "bg-white py-3 md:py-5"}`}>
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <div className="flex items-center gap-12">
            <motion.div
              className="inline-flex"
              initial="rest"
              animate="rest"
              whileHover="hover"
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
                <span className="font-bold text-xl md:text-2xl tracking-tight text-[#111] group-hover:text-[#384CE3] transition-colors">Suiquencer</span>
              </Link>
            </motion.div>

            <nav className="hidden lg:flex items-center gap-8">
              {menuItems.map((item) => (
                <Link key={item.label} href={item.href} className="group relative cursor-pointer py-2" onClick={handleNavClick(item.href)}>
                  <span className="text-sm font-medium text-stone-600 group-hover:text-[#111] transition-colors relative z-10">
                    {item.label}
                  </span>
                  <span className="absolute bottom-0 left-0 w-0 h-px bg-[#384CE3] transition-all duration-300 group-hover:w-full" />
                </Link>
              ))}
              <Link href="/docs" className="group relative cursor-pointer py-2 mt-1">
                <span className="text-sm font-bold text-[#384de3] transition-colors relative z-10 inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4 relative top-[1px]" />
                  Documentation
                </span>
                <span className="absolute bottom-0 left-0 w-0 h-px bg-[#384CE3] transition-all duration-300 group-hover:w-full" />
              </Link>
            </nav>
          </div>

          <div className="hidden lg:flex items-center gap-3 md:gap-4">
            <PlayDemoButton className="rounded-none px-4 md:px-6 h-9 md:h-10 text-xs md:text-sm font-medium border-stone-300 bg-white text-[#111] hover:bg-stone-50 hover:border-stone-400 transition-all duration-300 gap-2" />
            <Link href="https://my.suiquencer.io">
              <Button className="bg-[#384CE3] hover:bg-[#2a3bc0] text-white rounded-none px-4 md:px-6 h-9 md:h-10 text-xs md:text-sm font-medium transition-all duration-300 shadow-sm hover:shadow-md gap-1.5">
                <Rocket className="h-3.5 w-3.5" />
                Try It Out
              </Button>
            </Link>
          </div>

          <button 
            className="lg:hidden p-2 -mr-2 text-[#111] hover:text-[#384CE3] transition-colors relative z-[110]" 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Content - Below header */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[90] lg:hidden bg-white pt-[72px]"
          >
            {/* Menu Content */}
            <div className="flex flex-col h-full px-6 pt-8 overflow-y-auto">
              <nav className="flex flex-col gap-6">
                {menuItems.map((item, idx) => (
                  <motion.div 
                    key={item.label}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 + idx * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                    className="border-b border-black/5 pb-4"
                  >
                    <Link 
                      href={item.href} 
                      className="flex items-center justify-between group"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="text-xl sm:text-2xl font-medium text-[#111] group-hover:text-[#384CE3] transition-colors">{item.label}</span>
                    </Link>
                  </motion.div>
                ))}
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 + menuItems.length * 0.05, type: "spring", stiffness: 300, damping: 30 }}
                  className="border-b border-black/5 pb-4"
                >
                  <Link 
                    href="/docs" 
                    className="flex items-center justify-between group"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="text-xl sm:text-2xl font-bold text-[#384de3] transition-colors inline-flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Documentation
                    </span>
                  </Link>
                </motion.div>
              </nav>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
                className="mt-auto mb-10 flex flex-col gap-3 sm:gap-4"
              >
                <PlayDemoButton
                  className="w-full h-10 sm:h-12 border border-stone-300 text-[#111] text-sm sm:text-base font-medium hover:bg-stone-50 transition-colors rounded-none gap-2"
                  onBeforeOpen={() => setMobileMenuOpen(false)}
                />
                <Link href="https://my.suiquencer.io" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-10 sm:h-12 bg-[#384CE3] hover:bg-[#2a3bc0] text-white rounded-none text-sm sm:text-base font-medium shadow-lg gap-1.5">
                    <Rocket className="h-4 w-4" />
                    Try It Out
                  </Button>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
