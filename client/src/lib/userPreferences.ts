import type { Evidence } from "@shared/types";

export type ReminderDays = 1 | 3 | 7 | 14;
export type ReminderMap = Record<string, ReminderDays>;

export type SavedLibraryView = {
  id: string;
  name: string;
  status: string;
  categoryId: string;
  fromDate: string;
  throughDate: string;
  search: string;
  mode: "list" | "network";
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Preferences are a convenience; storage denial/quota must not block forecasts.
  }
}

const keyFor = (userId: string, feature: string) => `prediction-lab:${feature}:${encodeURIComponent(userId)}`;

export function loadReminders(userId: string): ReminderMap {
  const stored = readJson<Record<string, unknown>>(keyFor(userId, "reminders"), {});
  const result: ReminderMap = {};
  Object.entries(stored).forEach(([id, value]) => {
    if (value === 1 || value === 3 || value === 7 || value === 14) result[id] = value;
  });
  return result;
}

export function saveReminders(userId: string, reminders: ReminderMap) {
  writeJson(keyFor(userId, "reminders"), reminders);
}

export function loadSavedLibraryViews(userId: string): SavedLibraryView[] {
  const stored = readJson<unknown>(keyFor(userId, "library-views"), []);
  if (!Array.isArray(stored)) return [];
  return stored.filter((value): value is SavedLibraryView => {
    if (!value || typeof value !== "object") return false;
    const view = value as Partial<SavedLibraryView>;
    return typeof view.id === "string" && typeof view.name === "string" && typeof view.status === "string" &&
      typeof view.categoryId === "string" && typeof view.fromDate === "string" && typeof view.throughDate === "string" &&
      typeof view.search === "string" && (view.mode === "list" || view.mode === "network");
  }).slice(0, 20);
}

export function saveSavedLibraryViews(userId: string, views: SavedLibraryView[]) {
  writeJson(keyFor(userId, "library-views"), views.slice(0, 20));
}

export function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function daysUntil(date: string, today = new Date()): number | null {
  const target = Date.parse(`${date}T00:00:00Z`);
  const nowDate = Date.parse(`${localDateString(today)}T00:00:00Z`);
  if (!Number.isFinite(target) || Number.isNaN(new Date(target).getTime()) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  if (new Date(target).toISOString().slice(0, 10) !== date) return null;
  return Math.ceil((target - nowDate) / 86_400_000);
}

export function uniqueEvidenceHosts(evidence: Pick<Evidence, "source_url">[]): string[] {
  const hosts = evidence.map(item => {
    try { return new URL(item.source_url).hostname.toLowerCase().replace(/^www\./, ""); }
    catch { return ""; }
  }).filter(Boolean);
  return Array.from(new Set(hosts)).sort();
}
