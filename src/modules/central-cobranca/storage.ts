import { mockBillingSnapshot } from "./mock";
import type { BillingSnapshot } from "./types";

const STORAGE_KEY = "central-cobranca:snapshot:v1";

export function loadBillingSnapshot(storage: Storage = localStorage): BillingSnapshot {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockBillingSnapshot));
    return mockBillingSnapshot;
  }

  try {
    return JSON.parse(raw) as BillingSnapshot;
  } catch {
    storage.setItem(STORAGE_KEY, JSON.stringify(mockBillingSnapshot));
    return mockBillingSnapshot;
  }
}

export function saveBillingSnapshot(snapshot: BillingSnapshot, storage: Storage = localStorage) {
  storage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}
