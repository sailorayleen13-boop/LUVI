import type { Location } from "@/lib/marketplace/types";
import { DEFAULT_COUNTRY } from "@/lib/i18n/config";

/**
 * Default discovery location shown in the UI until real GPS/location
 * permission exists (explicitly out of scope for this phase). Kept as
 * configurable data — not a string inlined into a component — so wiring up
 * real location later, or supporting a second region, is a data change,
 * not a UI rewrite.
 */
export const DEFAULT_DISCOVERY_LOCATION: Location = {
  country: DEFAULT_COUNTRY,
  region: "San José",
  city: "San José",
};

/**
 * Costa Rica's 7 provinces — the only geography list this codebase needs
 * (Phase 8's /sell form asks for province + free-text city/cantón, not a
 * full canton dataset, since none exists here and fabricating one wasn't
 * worth it for a single dropdown).
 */
export const CR_PROVINCES = [
  "San José",
  "Alajuela",
  "Cartago",
  "Heredia",
  "Guanacaste",
  "Puntarenas",
  "Limón",
] as const;
