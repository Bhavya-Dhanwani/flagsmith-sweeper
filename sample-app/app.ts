// Messy demo app: some flags are live, some are dead, one is a ghost.
declare const flags: {
  isEnabled(name: string): boolean;
  getValue(name: string): string | number | boolean | null;
};

export function checkout() {
  if (flags.isEnabled("new_checkout")) {
    return "new checkout";
  } else {
    return "old checkout";
  }
}

export function banner() {
  return flags.isEnabled("dark_mode") ? "dark" : "light";
}

export function search() {
  if (flags.isEnabled("fast_search")) {
    return "fast search";
  }
  return "slow search";
}

export function promo() {
  // ghost: this flag was never created in Flagsmith
  if (flags.isEnabled("holiday_promo_2023")) return "promo!";
  return "";
}

export const limit = flags.getValue("max_items");
