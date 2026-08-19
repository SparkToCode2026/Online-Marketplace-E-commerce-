// Shared inline form-validation UI. Keeps every form's "required" feedback
// identical to the product form in Admin.tsx: an accent ring on the offending
// field plus a short red message beneath it, shown when the user hits Save and
// cleared as they fix the field.
//
// Forms keep their own state (no form library). A save handler builds an
// `Errors` map in a `validate()` function, calls setErrors, and bails when the
// map isn't empty — see any *.tsx save()/create() handler. This module only
// renders that result, so the look stays consistent everywhere.
import type { ReactElement } from "react";

// field name -> message. Only fields with a problem appear.
export type Errors<K extends string = string> = Partial<Record<K, string>>;

// True when a validate() result has no messages, i.e. the form may submit.
export function isClean<K extends string>(errors: Errors<K>): boolean {
  return Object.keys(errors).length === 0;
}

// Border/ring classes for one field, turned accent-red when it has an error.
// Append to a base className that already sets `border` and `focus:ring-2`.
export function fieldRing(hasError: boolean): string {
  return hasError
    ? "border-accent-500 ring-2 ring-accent-100"
    : "border-ink/15 focus:border-accent-500 focus:ring-accent-100";
}

// The message shown under a field; renders nothing when the field is valid.
export function FieldError({ msg }: { msg?: string }): ReactElement | null {
  return msg ? <p className="mt-1 pl-1 text-xs text-accent-700">{msg}</p> : null;
}
