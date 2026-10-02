import { Accessibility, BellRing, Database, Eye, LogOut, Moon, ShieldCheck, Sun, UserRound } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export default function Settings() {
  const { user, signOut } = useSupabaseAuth();
  const { theme, toggleTheme } = useTheme();
  const { highContrast, reducedMotion, setHighContrast, setReducedMotion } = useAccessibility();
  return <div className="internal-page settings-page">
    <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-line"></span> Account and display</div><h1>Settings</h1><p>Accessibility and display preferences are available without an account.</p></div></div>
    <div className="settings-list">
      {user && <section className="setting-row"><div className="setting-icon"><UserRound size={18} /></div><div className="setting-copy"><h2>Research identity</h2><p>{user.email}</p></div><span className="setting-value">Supabase Auth</span></section>}
      <section className="setting-row"><div className="setting-icon"><Sun size={18} /></div><div className="setting-copy"><h2>Interface theme</h2><p>Choose the interface theme used across Prediction Lab.</p></div><button className="theme-toggle" onClick={toggleTheme} aria-label="Choose interface theme"><span className={theme === "dark" ? "selected" : ""}><Moon size={14} /> Dark</span><span className={theme === "light" ? "selected" : ""}><Sun size={14} /> Cream</span></button></section>
      <section className="setting-row"><div className="setting-icon"><Eye size={18} /></div><div className="setting-copy"><h2>Higher contrast</h2><p>Strengthen text and border contrast across charts, cards, and controls. Saved on this device.</p></div><button type="button" role="switch" aria-checked={highContrast} className={`preference-switch ${highContrast ? "selected" : ""}`} onClick={() => setHighContrast(!highContrast)}><span />{highContrast ? "On" : "Off"}</button></section>
      <section className="setting-row"><div className="setting-icon"><Accessibility size={18} /></div><div className="setting-copy"><h2>Reduce motion</h2><p>Turn off decorative movement and smooth scrolling. By default, the system reduced-motion preference is respected.</p></div><button type="button" role="switch" aria-checked={reducedMotion} className={`preference-switch ${reducedMotion ? "selected" : ""}`} onClick={() => setReducedMotion(!reducedMotion)}><span />{reducedMotion ? "On" : "Off"}</button></section>
      <section className="setting-row"><div className="setting-icon"><BellRing size={18} /></div><div className="setting-copy"><h2>Resolution reminders</h2><p>Opt in from an individual forecast. Reminders appear in the command center while you use this device; no email, push alert, or background delivery is enabled.</p></div><span className="setting-value">Per forecast</span></section>
      {user ? <><section className="setting-row"><div className="setting-icon"><Database size={18} /></div><div className="setting-copy"><h2>Data model</h2><p>Predictions, forecast versions, evidence, and resolutions live in relational Supabase tables with row-level security. Display preferences remain local to this browser.</p></div><span className="setting-value secure"><ShieldCheck size={14} /> RLS enabled</span></section><section className="setting-row danger-row"><div className="setting-icon"><LogOut size={18} /></div><div className="setting-copy"><h2>End session</h2><p>Sign out of this browser. Your saved record remains in Supabase.</p></div><button className="text-button" onClick={() => signOut()}>Sign out</button></section></> : <section className="setting-row"><div className="setting-icon"><UserRound size={18} /></div><div className="setting-copy"><h2>Save forecasts</h2><p>Sign in to create a private ledger and use account-scoped analytics.</p></div><button className="text-button" onClick={() => window.dispatchEvent(new CustomEvent("prediction-lab:open-auth"))}>Sign in</button></section>}
    </div>
  </div>;
}
