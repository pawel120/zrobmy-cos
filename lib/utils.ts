import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Builds a user-facing error string that keeps the real Supabase/Postgres
// message visible instead of swallowing it behind a generic sentence —
// otherwise runtime DB failures (RLS, FK, throttling) are undiagnosable.
export function dbError(prefix: string, error: { message?: string } | null | undefined) {
  return error?.message ? `${prefix}: ${error.message}` : `${prefix}.`;
}
