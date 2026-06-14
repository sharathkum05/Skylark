"use client";

import { useEffect, useState } from "react";

type DemoConfirmation = {
  id: string;
  to: string;
  body: string;
  guestName: string;
  partySize: number;
  startIso: string;
  createdAt: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DemoConfirmationsPage() {
  const [items, setItems] = useState<DemoConfirmation[]>([]);

  useEffect(() => {
    let active = true;

    async function load() {
      const res = await fetch("/api/demo-confirmations");
      if (!res.ok || !active) return;
      const data = (await res.json()) as { confirmations: DemoConfirmation[] };
      setItems(data.confirmations);
    }

    load();
    const timer = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#0f0f0f] text-[#f5f5f0]">
      <div className="mx-auto max-w-xl px-6 py-12">
        <p className="text-xs uppercase tracking-[0.2em] text-[#888]">Skylark demo</p>
        <h1 className="mt-2 font-serif text-3xl">Confirmation texts</h1>
        <p className="mt-3 text-sm leading-relaxed text-[#aaa]">
          Live view of SMS confirmations sent after each booking. Open this page during your
          demo call — when a guest books, the message appears here instantly.
        </p>

        <div className="mt-8 space-y-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#333] px-5 py-10 text-center text-sm text-[#666]">
              No confirmations yet. Call the demo line and book a table.
            </div>
          ) : (
            items.map((item) => (
              <article
                key={item.id}
                className="rounded-lg border border-[#2a2a2a] bg-[#161616] p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="rounded-full bg-[#2a2a2a] px-2.5 py-1 text-xs text-[#ccc]">
                    To {item.to}
                  </span>
                  <time className="text-xs text-[#666]">{formatTime(item.createdAt)}</time>
                </div>
                <p className="text-[15px] leading-relaxed text-[#e8e8e3]">{item.body}</p>
                <p className="mt-3 text-xs text-[#555]">
                  Demo mode · real SMS pending Twilio carrier registration
                </p>
              </article>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
