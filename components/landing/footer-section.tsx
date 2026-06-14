"use client";

import { ArrowUpRight } from "lucide-react";
import { AnimatedWave } from "./animated-wave";

const socialLinks = [
  { name: "GitHub", href: "https://github.com/sharathkum05" },
  { name: "LinkedIn", href: "https://www.linkedin.com/in/sharath0524/" },
];

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">
      {/* Animated wave background */}
      <div className="absolute inset-0 h-64 opacity-20 pointer-events-none overflow-hidden">
        <AnimatedWave />
      </div>
      
      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Main Footer */}
        <div className="py-16 lg:py-24">
          <div className="grid gap-12 lg:gap-8">
            {/* Brand Column */}
            <div>
              <a href="#" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display">Skylark</span>
                <span className="text-xs text-muted-foreground font-mono">TM</span>
              </a>

              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
                Voice agents that handle inbound and outbound calls, collect
                information, and update your internal systems.
              </p>

              {/* Social Links */}
              <div className="flex gap-6">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                  >
                    {link.name}
                    <ArrowUpRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-foreground/10">
          <p className="text-sm text-muted-foreground">
            2026 Skylark. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
