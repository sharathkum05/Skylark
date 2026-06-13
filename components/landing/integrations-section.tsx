"use client";

import { useEffect, useState, useRef } from "react";
import { IntegrationIcon, type IntegrationIconId } from "./integration-icons";

type Integration = {
  name: string;
  category: string;
  icon: IntegrationIconId;
};

const integrations: Integration[] = [
  { name: "Google Calendar", category: "Scheduling", icon: "google-calendar" },
  { name: "Slack", category: "Notifications", icon: "slack" },
  { name: "HubSpot", category: "CRM", icon: "hubspot" },
  { name: "Salesforce", category: "CRM", icon: "salesforce" },
  { name: "Cal.com", category: "Booking", icon: "cal-com" },
  { name: "Restaurants", category: "Reservations", icon: "restaurants" },
  { name: "Clinics", category: "Intake", icon: "clinics" },
  { name: "Salons", category: "Scheduling", icon: "salons" },
  { name: "Real estate", category: "Lead capture", icon: "real-estate" },
  { name: "Retail", category: "Order status", icon: "retail" },
  { name: "Zapier", category: "Automation", icon: "zapier" },
  { name: "Twilio", category: "Telephony", icon: "twilio" },
];

function IntegrationCard({ integration }: { integration: Integration }) {
  return (
    <div className="shrink-0 px-8 py-6 border border-foreground/10 hover:border-foreground/30 hover:bg-foreground/[0.02] transition-all duration-300 group min-w-[200px]">
      <div className="mb-4 group-hover:translate-x-1 transition-transform">
        <IntegrationIcon id={integration.icon} className="h-8 w-8" />
      </div>
      <div className="text-lg font-medium group-hover:translate-x-1 transition-transform">
        {integration.name}
      </div>
      <div className="text-sm text-muted-foreground">{integration.category}</div>
    </div>
  );
}

export function IntegrationsSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setIsVisible(true);
      },
      { threshold: 0.1 }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="integrations" ref={sectionRef} className="relative py-24 lg:py-32 overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        {/* Header */}
        <div
          className={`text-center max-w-3xl mx-auto mb-16 lg:mb-24 transition-all duration-700 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
          }`}
        >
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
            <span className="w-8 h-px bg-foreground/30" />
            Integrations
            <span className="w-8 h-px bg-foreground/30" />
          </span>
          <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-6">
            Connects to your
            <br />
            internal systems.
          </h2>
          <p className="text-xl text-muted-foreground">
            Voice agents that collect information on every call and write it
            straight to your calendar, CRM, and tools — so your team never
            re-enters a thing.
          </p>
        </div>
      </div>

      {/* Full-width marquees outside container */}
      <div className="w-full mb-6">
        <div className="flex gap-6 marquee">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={`${integration.name}-${setIndex}`}
                  integration={integration}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Reverse marquee */}
      <div className="w-full">
        <div className="flex gap-6 marquee-reverse">
          {[...Array(2)].map((_, setIndex) => (
            <div key={setIndex} className="flex gap-6 shrink-0">
              {[...integrations].reverse().map((integration) => (
                <IntegrationCard
                  key={`${integration.name}-reverse-${setIndex}`}
                  integration={integration}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
