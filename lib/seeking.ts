// Structured "czego szuka projekt" options — one source of truth for the
// create/edit forms, project cards, and the feed filter chips.
export const SEEKING_OPTIONS = [
  { value: "ekipy", label: "Szukają ekipy" },
  { value: "pierwszy_klient", label: "Szukają pierwszego klienta" },
  { value: "placacy_klienci", label: "Szukają płacących klientów" },
  { value: "finansowanie", label: "Szukają finansowania" },
  { value: "feedback", label: "Szukają feedbacku" },
] as const;

export type SeekingValue = (typeof SEEKING_OPTIONS)[number]["value"];

export const SEEKING_LABELS: Record<string, string> = Object.fromEntries(
  SEEKING_OPTIONS.map((o) => [o.value, o.label])
);
