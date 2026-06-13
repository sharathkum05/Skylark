import {
  Building2,
  Scissors,
  Stethoscope,
  Store,
  UtensilsCrossed,
} from "lucide-react";

type IntegrationIconProps = {
  className?: string;
};

export function GoogleCalendarIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M18 4h1a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1V2h2v2h8V2h2v2Z" />
      <path fill="#fff" d="M6 8h12v10H6V8Z" />
      <path fill="#EA4335" d="M18 4V2h2v2h-2Z" />
      <path fill="#FBBC04" d="M4 4V2h2v2H4Z" />
      <path fill="#34A853" d="M4 20v2h2v-2H4Z" />
      <path fill="#4285F4" d="M18 20v2h2v-2h-2Z" />
      <path fill="#4285F4" d="M8 11h2v2H8v-2Zm3 0h2v2h-2v-2Zm3 0h2v2h-2v-2ZM8 14h2v2H8v-2Zm3 0h2v2h-2v-2Z" />
    </svg>
  );
}

export function SlackIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#E01E5A" d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52Zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313Z" />
      <path fill="#36C5F0" d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834Zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312Z" />
      <path fill="#2EB67D" d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834Zm-1.271 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.162 0a2.528 2.528 0 0 1 2.523 2.522v6.312Z" />
      <path fill="#ECB22E" d="M15.162 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.162 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52Zm0-1.271a2.528 2.528 0 0 1-2.52-2.523 2.527 2.527 0 0 1 2.52-2.52h6.313A2.528 2.528 0 0 1 24 15.162a2.528 2.528 0 0 1-2.522 2.523h-6.316Z" />
    </svg>
  );
}

export function HubSpotIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FF7A59"
        d="M17.1 8.28c.97-.97.97-2.54 0-3.51l-1.9-1.9a2.48 2.48 0 0 0-3.51 0l-1.17 1.17-4.2-4.2a1.2 1.2 0 0 0-1.7 0L2.1 5.75a1.2 1.2 0 0 0 0 1.7l4.2 4.2-1.17 1.17a2.48 2.48 0 0 0 0 3.51l1.9 1.9c.97.97 2.54.97 3.51 0l1.17-1.17 4.2 4.2c.47.47 1.23.47 1.7 0l1.51-1.51a1.2 1.2 0 0 0 0-1.7l-4.2-4.2 1.17-1.17Z"
      />
      <circle cx="15.35" cy="6.52" r="1.85" fill="#FF7A59" />
    </svg>
  );
}

export function SalesforceIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#00A1E0"
        d="M10.2 4.8c.7-2.4 3.2-3.9 5.7-3.2 1.5.4 2.7 1.5 3.3 2.9 2.2-.2 4.2 1.2 4.7 3.4.5 2.1-.4 4.3-2.2 5.3.3 2.2-1.2 4.3-3.4 4.6-1.2.2-2.4-.1-3.3-.8-1.2 1.5-3.4 1.9-5.1.9-1.7-1-2.5-3.1-2-5 2-1 3-3.3 2.5-5.6-.1-.5-.1-1 0-1.5Z"
      />
    </svg>
  );
}

export function CalComIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="4" width="18" height="17" rx="3" fill="#111827" />
      <rect x="3" y="4" width="18" height="5" rx="3" fill="#292929" />
      <rect x="7" y="2.5" width="2" height="3" rx="1" fill="#111827" />
      <rect x="15" y="2.5" width="2" height="3" rx="1" fill="#111827" />
      <circle cx="8" cy="14" r="1.5" fill="#fff" />
      <circle cx="12" cy="14" r="1.5" fill="#fff" />
      <circle cx="16" cy="14" r="1.5" fill="#fff" />
      <circle cx="8" cy="17.5" r="1.5" fill="#fff" />
      <circle cx="12" cy="17.5" r="1.5" fill="#fff" />
    </svg>
  );
}

export function ZapierIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#FF4F00"
        d="m12 2 1.8 4.6L18.4 8l-4.6 1.8L12 14.4 10.2 9.8 5.6 8l4.6-1.4L12 2Zm-7 9 1.2 3.1L9.3 15l-3.1 1.2L5 19.3 3.8 16.2.7 15l3.1-1.2L5 10.7Zm14 0 1.2 3.1 3.1 1.2-3.1 1.2L19 19.3l-1.2-3.1-3.1-1.2 3.1-1.2L19 10.7Z"
      />
    </svg>
  );
}

export function TwilioIcon({ className = "h-8 w-8" }: IntegrationIconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="8" r="4" fill="#F22F46" />
      <circle cx="16" cy="8" r="4" fill="#F22F46" />
      <circle cx="8" cy="16" r="4" fill="#F22F46" />
      <circle cx="16" cy="16" r="4" fill="#F22F46" />
    </svg>
  );
}

export type IntegrationIconId =
  | "google-calendar"
  | "slack"
  | "hubspot"
  | "salesforce"
  | "cal-com"
  | "zapier"
  | "twilio"
  | "restaurants"
  | "clinics"
  | "salons"
  | "real-estate"
  | "retail";

export function IntegrationIcon({
  id,
  className = "h-8 w-8",
}: {
  id: IntegrationIconId;
  className?: string;
}) {
  switch (id) {
    case "google-calendar":
      return <GoogleCalendarIcon className={className} />;
    case "slack":
      return <SlackIcon className={className} />;
    case "hubspot":
      return <HubSpotIcon className={className} />;
    case "salesforce":
      return <SalesforceIcon className={className} />;
    case "cal-com":
      return <CalComIcon className={className} />;
    case "zapier":
      return <ZapierIcon className={className} />;
    case "twilio":
      return <TwilioIcon className={className} />;
    case "restaurants":
      return <UtensilsCrossed className={`${className} text-foreground`} strokeWidth={1.75} />;
    case "clinics":
      return <Stethoscope className={`${className} text-foreground`} strokeWidth={1.75} />;
    case "salons":
      return <Scissors className={`${className} text-foreground`} strokeWidth={1.75} />;
    case "real-estate":
      return <Building2 className={`${className} text-foreground`} strokeWidth={1.75} />;
    case "retail":
      return <Store className={`${className} text-foreground`} strokeWidth={1.75} />;
  }
}
