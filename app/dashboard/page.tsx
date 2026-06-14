"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Clock, Phone, Users, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";

type Booking = {
  id: string;
  guestName: string;
  guestPhone: string;
  partySize: number;
  startIso: string;
  createdAt: string;
};

type Slot = {
  time: string;
  label: string;
  slotKey: string;
  status: "available" | "booked";
  booking: Booking | null;
};

type Board = {
  businessName: string;
  date: string;
  dateLabel: string;
  slots: Slot[];
  stats: { total: number; booked: number; available: number; guests: number };
  bookings: Booking[];
};

type Confirmation = {
  id: string;
  to: string;
  body: string;
  guestName: string;
  createdAt: string;
};

type DashboardData = {
  board: Board;
  confirmations: Confirmation[];
  updatedAt: string;
};

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatUpdated(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    let active = true;
    let prevBooked = -1;

    async function load() {
      const res = await fetch("/api/dashboard");
      if (!res.ok || !active) return;
      const json = (await res.json()) as DashboardData;
      if (prevBooked >= 0 && json.board.stats.booked > prevBooked) {
        setPulse(true);
        setTimeout(() => setPulse(false), 1200);
      }
      prevBooked = json.board.stats.booked;
      setData(json);
    }

    load();
    const timer = setInterval(load, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const board = data?.board;

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-background text-foreground noise-overlay">
      {/* Subtle grid — matches landing hero */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-30">
        {[...Array(8)].map((_, i) => (
          <div
            key={`h-${i}`}
            className="absolute h-px bg-foreground/10"
            style={{ top: `${12.5 * (i + 1)}%`, left: 0, right: 0 }}
          />
        ))}
        {[...Array(12)].map((_, i) => (
          <div
            key={`v-${i}`}
            className="absolute w-px bg-foreground/10"
            style={{ left: `${8.33 * (i + 1)}%`, top: 0, bottom: 0 }}
          />
        ))}
      </div>

      <div className="relative z-10">
        {/* Header bar — matches landing nav typography */}
        <header className="border-b border-foreground/10 bg-background/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-12">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-display text-xl tracking-tight">Skylark</span>
              <span className="mt-0.5 font-mono text-[10px] text-muted-foreground">TM</span>
            </Link>
            <span className="font-mono text-xs text-muted-foreground">Owner dashboard</span>
          </div>
        </header>

        <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-12 lg:py-24">
          <header className="mb-12 flex flex-col gap-6 lg:mb-16 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <span className="mb-6 inline-flex items-center gap-3 font-mono text-sm text-muted-foreground">
                <span className="h-px w-8 bg-foreground/30" />
                Live reservations
              </span>
              <h1 className="font-display text-4xl tracking-tight lg:text-6xl">
                {board?.businessName ?? "The Copper Table"}
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                {board?.dateLabel ?? "Loading today's lunch board…"}
              </p>
            </div>

            <div className="flex flex-col items-start gap-2 sm:items-end">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs transition-colors ${
                  pulse
                    ? "border-foreground/30 bg-foreground/10"
                    : "border-foreground/15 bg-background"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full bg-foreground ${pulse ? "animate-ping" : "animate-pulse"}`}
                />
                Live · updates every 2s
              </div>
              {data?.updatedAt ? (
                <span className="font-mono text-xs text-muted-foreground">
                  Last sync {formatUpdated(data.updatedAt)}
                </span>
              ) : null}
            </div>
          </header>

          <div className="mb-12 grid gap-4 sm:grid-cols-3 lg:mb-16">
            <StatCard
              icon={<UtensilsCrossed className="h-4 w-4" />}
              label="Tables booked"
              value={`${board?.stats.booked ?? 0} / ${board?.stats.total ?? 6}`}
            />
            <StatCard
              icon={<Users className="h-4 w-4" />}
              label="Guests expected"
              value={String(board?.stats.guests ?? 0)}
            />
            <StatCard
              icon={<Clock className="h-4 w-4" />}
              label="Open slots"
              value={String(board?.stats.available ?? 6)}
            />
          </div>

          <section className="mb-12 lg:mb-16">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="font-display text-3xl tracking-tight lg:text-4xl">
                Lunch reservations
              </h2>
              <p className="font-mono text-sm text-muted-foreground">1:00 PM – 4:00 PM service</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {board?.slots.map((slot) => (
                <SlotCard key={slot.slotKey} slot={slot} />
              )) ??
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 animate-pulse rounded-sm border border-foreground/10 bg-muted/40" />
                ))}
            </div>
          </section>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            <Panel title="Recent bookings">
              {board?.bookings.length ? (
                <div className="divide-y divide-foreground/10">
                  {board.bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="flex items-center justify-between gap-4 py-4 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{booking.guestName}</p>
                        <p className="text-sm text-muted-foreground">
                          Party of {booking.partySize} ·{" "}
                          {board.slots.find((s) => s.booking?.id === booking.id)?.label ?? "Lunch"}
                        </p>
                      </div>
                      <p className="font-mono text-sm text-muted-foreground">
                        {formatPhone(booking.guestPhone)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No bookings yet. Call the demo line to book a table.
                </p>
              )}
            </Panel>

            <Panel title="Guest confirmations">
              {data?.confirmations.length ? (
                <div className="space-y-6">
                  {data.confirmations.map((item) => (
                    <div key={item.id} className="border-b border-foreground/10 pb-6 last:border-0 last:pb-0">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="font-medium">{item.guestName}</p>
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatUpdated(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                      <p className="mt-2 font-mono text-xs text-muted-foreground/70">
                        Demo confirmation · real SMS when Twilio is verified
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  Confirmation messages appear here when guests book by phone.
                </p>
              )}
            </Panel>
          </div>
        </div>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-foreground/10 pt-8 lg:pt-10">
      <h3 className="mb-6 font-display text-2xl tracking-tight lg:text-3xl">{title}</h3>
      {children}
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-4 border border-foreground/10 bg-card px-6 py-5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-foreground/10 text-foreground">
        {icon}
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-3xl tracking-tight">{value}</p>
      </div>
    </div>
  );
}

function SlotCard({ slot }: { slot: Slot }) {
  const booked = slot.status === "booked" && slot.booking;

  return (
    <div
      className={`border p-5 transition-colors ${
        booked
          ? "border-foreground/25 bg-foreground/[0.03]"
          : "border-dashed border-foreground/15 bg-background"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-3xl tracking-tight">{slot.label}</p>
        <Badge
          variant={booked ? "default" : "outline"}
          className={
            booked
              ? "rounded-full bg-foreground px-3 text-background"
              : "rounded-full border-foreground/20 font-mono text-xs"
          }
        >
          {booked ? "Booked" : "Open"}
        </Badge>
      </div>

      {booked ? (
        <div className="space-y-2 text-sm">
          <p className="text-lg font-medium">{slot.booking!.guestName}</p>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            Party of {slot.booking!.partySize}
          </div>
          <div className="flex items-center gap-2 font-mono text-muted-foreground">
            <Phone className="h-3.5 w-3.5" />
            {formatPhone(slot.booking!.guestPhone)}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Available for walk-in or phone booking</p>
      )}
    </div>
  );
}
