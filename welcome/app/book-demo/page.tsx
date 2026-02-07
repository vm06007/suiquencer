"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Space_Grotesk } from "next/font/google";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FadeIn } from "@/components/animations/FadeIn";
import { 
  ArrowLeft, CheckCircle, Clock, Users, Shield, 
  Zap, Mail, User
} from "lucide-react";
import { motion } from "framer-motion";

const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space" });

export default function BookDemoPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    message: "",
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent("Suiquencer Pro Access Request");
    const body = encodeURIComponent(
      `First name: ${formData.firstName}\n` +
      `Last name: ${formData.lastName}\n` +
      `Email: ${formData.email}\n\n` +
      `What I'm building:\n${formData.message}`
    );
    window.location.href = `mailto:vitalik@bitcoin.com?subject=${subject}&body=${body}`;
    setIsSubmitted(true);
  };

  const isFormValid = formData.firstName && formData.lastName && formData.email && formData.message;

  return (
    <div className={`min-h-screen lg:h-screen flex flex-col lg:flex-row ${spaceGrotesk.variable} selection:bg-[#384CE3] selection:text-white`} style={{ fontFamily: 'var(--font-space)' }}>
      {/* Left Side - Branding (Blue Banner - Fixed) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#384CE3] relative overflow-hidden h-screen">
        {/* Dot pattern background */}
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: `radial-gradient(white 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
        }} />
        
        {/* Decorative elements */}
        <motion.div 
          className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
          animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.12, 0.1] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-[13px]">
            <div className="h-10 w-10 rounded-[8px] bg-[#384de3] flex items-center justify-center">
              <Image
                src="/suiquencer-logo.svg"
                alt="Suiquencer logo"
                width={40}
                height={40}
                className="h-10 w-10"
              />
            </div>
            <span className="font-bold text-2xl text-white tracking-tight">Suiquencer</span>
          </Link>

          {/* Center Content */}
          <div className="max-w-md">
            <motion.h1 
              className="text-4xl font-bold text-white mb-6 leading-tight tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              Unlock Pro mode
            </motion.h1>
            <motion.p 
              className="text-blue-100 text-lg leading-relaxed mb-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              Tell us what you want to build and we’ll help you unlock logic gates, custom Move calls, and unlimited nodes.
            </motion.p>
            
            {/* Benefits */}
            <div className="space-y-4">
              {[
                { icon: Shield, text: "Logic + condition gates" },
                { icon: Zap, text: "Custom Move contract calls" },
                { icon: Users, text: "Team workflows & shared presets" },
                { icon: Clock, text: "Faster iteration on complex flows" },
              ].map((benefit, i) => (
                <motion.div 
                  key={benefit.text}
                  className="flex items-center gap-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                >
                  <div className="w-10 h-10 bg-white/10 flex items-center justify-center">
                    <benefit.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-blue-50">{benefit.text}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Testimonial */}
          <motion.div 
            className="bg-white/10 p-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <p className="text-blue-50 italic mb-4">
              &quot;Pro mode unlocked the advanced logic gates we needed for branching strategies. We shipped our flow in a day.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 flex items-center justify-center text-sm font-bold text-white">
                VM
              </div>
              <div>
                <p className="font-medium text-white">Vitalik Marinchenko</p>
                <p className="text-sm text-blue-200">Developer</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Form (Scrollable) */}
      <div className="w-full lg:w-1/2 bg-white min-h-screen lg:h-screen overflow-y-auto p-4 sm:p-6 md:p-8 pt-6 sm:pt-8 relative">
        {/* Subtle background pattern */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(#384CE3 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />
        
        <div className="w-full max-w-md relative z-10 mx-auto">
          {!isSubmitted ? (
            <>
              {/* Mobile Logo */}
              <div className="lg:hidden mb-6 md:mb-8">
                <Link href="/" className="flex items-center gap-[13px]">
                  <div className="h-8 w-8 rounded-[8px] bg-[#384de3] flex items-center justify-center">
                    <Image
                      src="/suiquencer-logo.svg"
                      alt="Suiquencer logo"
                      width={32}
                      height={32}
                      className="h-8 w-8"
                    />
                  </div>
                  <span className="font-bold text-lg md:text-xl tracking-tight">Suiquencer</span>
                </Link>
              </div>

              {/* Back Link */}
              <FadeIn delay={0.1}>
                <Link 
                  href="/" 
                  className="inline-flex items-center gap-1.5 md:gap-2 text-xs md:text-sm text-stone-500 hover:text-[#384CE3] transition-colors mb-6 md:mb-8 group"
                >
                  <ArrowLeft className="h-3.5 w-3.5 md:h-4 md:w-4 group-hover:-translate-x-1 transition-transform" />
                  Back to home
                </Link>
              </FadeIn>

              {/* Header */}
              <FadeIn delay={0.2}>
                <div className="mb-6 md:mb-8">
                  <motion.div 
                    className="inline-flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 bg-green-50 border border-green-100 text-green-600 text-[10px] md:text-xs mb-3 md:mb-4"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    PRO MODE ACCESS
                  </motion.div>
                  <h2 className="text-2xl md:text-3xl font-semibold text-[#111] mb-1.5 md:mb-2 tracking-tight">Request Pro access</h2>
                  <p className="text-sm md:text-base text-stone-500">
                    Share your flow goals and we’ll follow up with access details.
                  </p>
                </div>
              </FadeIn>

              {/* Form */}
              <form onSubmit={handleSubmit}>
                <FadeIn delay={0.3}>
                  <div className="space-y-3 md:space-y-4">
                    {/* Name Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="firstName" className="text-xs md:text-sm text-stone-700">First name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-stone-400" />
                          <Input
                            id="firstName"
                            placeholder="John"
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                            className="pl-9 md:pl-10 h-10 md:h-11 text-sm rounded-none border-stone-300 bg-white focus-visible:border-[#384CE3] focus-visible:ring-[#384CE3]/20"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <Label htmlFor="lastName" className="text-xs md:text-sm text-stone-700">Last name *</Label>
                        <Input
                          id="lastName"
                          placeholder="Doe"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="h-10 md:h-11 text-sm rounded-none border-stone-300 bg-white focus-visible:border-[#384CE3] focus-visible:ring-[#384CE3]/20"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-1.5 md:space-y-2">
                      <Label htmlFor="email" className="text-xs md:text-sm text-stone-700">Work email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-stone-400" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-9 md:pl-10 h-10 md:h-11 text-sm rounded-none border-stone-300 bg-white focus-visible:border-[#384CE3] focus-visible:ring-[#384CE3]/20"
                          required
                        />
                      </div>
                    </div>

                    {/* Message */}
                    <div className="space-y-1.5 md:space-y-2">
                      <Label className="text-xs md:text-sm text-stone-700">What are you building? *</Label>
                      <textarea
                        placeholder="Describe the flows, logic gates, or custom Move calls you need..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 bg-white text-xs md:text-sm text-[#111] placeholder:text-stone-400 focus:outline-none focus:border-[#384CE3] focus:ring-[3px] focus:ring-[#384CE3]/20 resize-none"
                        required
                      />
                    </div>

                    {/* Submit Button */}
                    <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                      <Button
                        type="submit"
                        disabled={!isFormValid}
                        className="w-full h-10 md:h-11 text-xs md:text-sm rounded-none bg-[#384CE3] hover:bg-[#2a3bc0] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Zap className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                        Request Pro access
                      </Button>
                    </motion.div>

                    {/* Privacy Note */}
                    <p className="text-[10px] md:text-xs text-stone-400 text-center">
                      Submitting opens your email client to send the request to{" "}
                      <span className="text-[#384CE3]">vitalik@bitcoin.com</span>.
                    </p>
                  </div>
                </FadeIn>
              </form>

              {/* Already have account */}
              <p className="text-center text-xs md:text-sm text-stone-500 mt-6 md:mt-8 pb-8">
                Want to try the app now?{" "}
                <Link href="https://my.suiquencer.io" className="text-[#384CE3] hover:underline font-medium">
                  Try It Out
                </Link>
              </p>
            </>
          ) : (
            /* Success State */
            <motion.div
              className="text-center pb-6 md:pb-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 md:w-20 md:h-20 bg-green-50 flex items-center justify-center mx-auto mb-4 md:mb-6">
                <CheckCircle className="h-8 w-8 md:h-10 md:w-10 text-green-600" />
              </div>
              <h2 className="text-2xl md:text-3xl font-semibold text-[#111] mb-3 md:mb-4 tracking-tight">Request received!</h2>
              <p className="text-sm md:text-base text-stone-500 mb-6 md:mb-8 max-w-sm mx-auto">
                Thanks for your interest. We’ll follow up with Pro access details soon.
              </p>
              <div className="space-y-2 md:space-y-3">
                <Link href="/">
                  <Button className="w-full h-10 md:h-11 text-xs md:text-sm rounded-none bg-[#384CE3] hover:bg-[#2a3bc0] text-white">
                    Back to Home
                  </Button>
                </Link>
                <Link href="https://my.suiquencer.io">
                  <Button variant="outline" className="w-full h-10 md:h-11 text-xs md:text-sm rounded-none border-stone-300 text-stone-600 hover:bg-stone-50">
                    Try It Out
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
