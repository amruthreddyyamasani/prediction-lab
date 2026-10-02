import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type AccessibilityPreferences = { highContrast: boolean; reducedMotion: boolean };
type AccessibilityContextValue = AccessibilityPreferences & {
  setHighContrast: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
};

const STORAGE_KEY = "prediction-lab:accessibility:v1";
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function initialPreferences(): AccessibilityPreferences {
  const fallback = {
    highContrast: false,
    reducedMotion: typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<AccessibilityPreferences>;
    return {
      highContrast: typeof parsed.highContrast === "boolean" ? parsed.highContrast : fallback.highContrast,
      reducedMotion: typeof parsed.reducedMotion === "boolean" ? parsed.reducedMotion : fallback.reducedMotion,
    };
  } catch {
    return fallback;
  }
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>(initialPreferences);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("user-high-contrast", preferences.highContrast);
    root.classList.toggle("user-reduced-motion", preferences.reducedMotion);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences)); } catch { /* keep the preference in memory */ }
  }, [preferences]);

  const value = useMemo<AccessibilityContextValue>(() => ({
    ...preferences,
    setHighContrast: highContrast => setPreferences(current => ({ ...current, highContrast })),
    setReducedMotion: reducedMotion => setPreferences(current => ({ ...current, reducedMotion })),
  }), [preferences]);

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>;
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return context;
}
