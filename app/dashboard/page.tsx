"use client";

import { useEffect, useState } from "react";
import { Clock, Phone, Users, UtensilsCrossed } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <main className="min-h-screen bg-[#f7f5f0] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              Skylark · Owner dashboard
            </p>
            <h1 className="mt-2 font-serif text-4xl tracking-tight">
              {board?.businessName ?? "The Copper Table"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {board?.dateLabel ?? "Loading today's lunch board…"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className={`gap-2 px-3 py-1.5 text-xs ${pulse ? "border-emerald-500 bg-emerald-50" : ""}`}
            >
              <span
                className={`h-2 w-2 rounded-full bg-emerald-500 ${pulse ? "animate-ping" : "animate-pulse"}`}
              />
              Live · updates every 2s
            </Badge>
            {data?.updatedAt ? (
              <span className="text-xs text-muted-foreground">
                Last sync {formatUpdated(data.updatedAt)}
              </span>
            ) : null}
          </div>
        </header>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
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

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-medium">Lunch reservations</h2>
            <p className="text-sm text-muted-foreground">1:00 PM – 4:00 PM service</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {board?.slots.map((slot) => (
              <SlotCard key={slot.slotKey} slot={slot} />
            )) ??
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
              ))}
          </div>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent bookings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {board?.bookings.length ? (
                board.bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-lg border bg-background px-4 py-3"
                  >
                    <div>
                      <p className="font-medium">{booking.guestName}</p>
                      <p className="text-sm text-muted-foreground">
                        Party of {booking.partySize} ·{" "}
                        {board.slots.find((s) => s.booking?.id === booking.id)?.label ??
                          "Lunch"}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatPhone(booking.guestPhone)}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No bookings yet. Call the demo line to book a table.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guest confirmations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data?.confirmations.length ? (
                data.confirmations.map((item) => (
                  <div key={item.id} className="rounded-lg border bg-background px-4 py-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{item.guestName}</p>
                      <span className="text-xs text-muted-foreground">
                        {formatUpdated(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                    <p className="mt-2 text-xs text-muted-foreground/70">
                      Demo confirmation · real SMS when Twilio is verified
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Confirmation messages appear here when guests book by phone.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
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
    <Card className="py-4">
      <CardContent className="flex items-center gap-4 px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/5 text-primary">
          {icon}
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-semibold tracking-tight">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SlotCard({ slot }: { slot: Slot }) {
  const booked = slot.status === "booked" && slot.booking;

  return (
    <Card
      className={`overflow-hidden py-0 transition-colors ${
        booked ? "border-[#c4a574] bg-[#fdf9f2] shadow-sm" : "border-dashed bg-background"
      }`}
    >
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-2xl font-semibold tracking-tight">{slot.label}</p>
          <Badge variant={booked ? "default" : "secondary"}>
            {booked ? "Booked" : "Open"}
          </Badge>
        </div>

        {booked ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium text-lg">{slot.booking!.guestName}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-3.5 w-3.5" />
              Party of {slot.booking!.partySize}
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="h-3.5 w-3.5" />
              {formatPhone(slot.booking!.guestPhone)}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Available for walk-in or phone booking</p>
        )}
      </CardContent>
    </Card>
  );
}
