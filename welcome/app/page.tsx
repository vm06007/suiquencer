"use client";

import { Space_Grotesk } from "next/font/google";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { Logos } from "@/components/landing/Logos";
import { Solutions } from "@/components/landing/Solutions";
import { PricingCalculator } from "@/components/landing/PricingCalculator";
import { Security } from "@/components/landing/Security";
import { Faq } from "@/components/landing/Faq";
import { Cta } from "@/components/landing/Cta";
import { Footer } from "@/components/landing/Footer";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export default function Home() {
  return (
    <div className={`min-h-screen bg-cream-50 text-[#111] pt-20 ${spaceGrotesk.variable} selection:bg-[#384CE3] selection:text-white`} style={{ fontFamily: 'var(--font-space)' }}>
      <Header />
      <Hero />
      <Logos />
      <Features />
      <Solutions />
      <PricingCalculator />
      <Security />
      <Faq />
      <Cta />
      <Footer />
    </div>
  );
}
