"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Phone } from "lucide-react";
import { AnimatedSphere } from "./animated-sphere";

const words = ["answers", "books", "syncs", "runs 24/7"];

// Keep the rotating line from jumping as word length changes.
const longestWordChars = Math.max(...words.map((w) => w.length));

// Real Vapi number people can call to try Skylark live. Set after provisioning:
//   NEXT_PUBLIC_SKYLARK_DEMO_NUMBER="+1 (856) 348-5830"
const DEMO_NUMBER = process.env.NEXT_PUBLIC_SKYLARK_DEMO_NUMBER || "+1 (000) 000-0000";
const DEMO_TEL = DEMO_NUMBER.replace(/[^\d+]/g, "");

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [words.length]);

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">
      {/* Animated sphere background */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[800px] lg:h-[800px] opacity-40 pointer-events-none">
        <AnimatedSphere />
      </div>
      
      {/* Subtle grid lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{
              top: `${12.5 * (i + 1)}%`,
              left: 0,
              right: 0,
            }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{
              left: `${8.33 * (i + 1)}%`,
              top: 0,
              bottom: 0,
            }}
          />
        ))}
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 py-32 lg:py-40">
        {/* Eyebrow */}
        <div 
          className={`mb-8 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            Inbound &amp; outbound voice agents
          </span>
        </div>
        
        {/* Main headline */}
        <div className="mb-12">
          <h1 
            className={`text-[clamp(3rem,12vw,10rem)] font-display leading-[0.9] tracking-tight transition-all duration-1000 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block">Voice agents</span>
            <span className="block">
              that{" "}
              <span
                className="inline-block align-bottom text-left"
                style={{ minWidth: `${longestWordChars}ch` }}
              >
                <span
                  key={words[wordIndex]}
                  className="inline-block animate-word-in"
                >
                  {words[wordIndex]}
                </span>
              </span>
            </span>
          </h1>
        </div>
        
        {/* Description */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <p 
            className={`text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl transition-all duration-700 delay-200 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Skylark deploys voice agents that handle inbound and outbound calls,
            collect caller information, and write directly to your calendar and
            CRM — no double-booking, no manual entry. Runs 24/7.
          </p>
          
          {/* CTAs */}
          <div
            className={`flex flex-col items-start gap-6 transition-all duration-700 delay-300 ${
              isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button
              size="lg"
              className="bg-foreground hover:bg-foreground/90 text-background px-8 h-14 text-base rounded-full group"
            >
              Watch demo
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>

            {/* Call to try Skylark's AI agent live */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <span className="text-sm text-muted-foreground">
                Call the inbound agent live:
              </span>
              <a
                href={`tel:${DEMO_TEL}`}
                className="inline-flex items-center gap-2 px-4 h-10 rounded-full border border-foreground/20 hover:bg-foreground/5 transition-colors font-mono text-sm"
              >
                <Phone className="w-4 h-4" />
                {DEMO_NUMBER}
              </a>
            </div>
          </div>
        </div>
        
      </div>

    </section>
  );
}
