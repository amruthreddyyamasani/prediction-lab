import { useState } from "react";
import { X, ArrowRight, Mail, LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AuthDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open) return null;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const result = mode === "sign-in" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { data: { full_name: email.split("@")[0] } } });
    setBusy(false);
    if (result.error) setMessage(result.error.message);
    else if (mode === "sign-up" && !result.data.session) setMessage("Check your inbox to confirm your email, then return to the lab.");
    else onOpenChange(false);
  }

  return <div className="modal-backdrop" onMouseDown={() => onOpenChange(false)}><section className="auth-modal" onMouseDown={event => event.stopPropagation()}><button className="modal-close" onClick={() => onOpenChange(false)} aria-label="Close"><X size={18} /></button><div className="eyebrow">Private research record</div><h2>{mode === "sign-in" ? "Return to your lab" : "Open a lab notebook"}</h2><p className="modal-intro">Save forecasts, revisit your reasoning, and learn how your probabilities perform over time.</p><div className="auth-tabs"><button className={mode === "sign-in" ? "selected" : ""} onClick={() => setMode("sign-in")}>Sign in</button><button className={mode === "sign-up" ? "selected" : ""} onClick={() => setMode("sign-up")}>Create account</button></div><form onSubmit={submit} className="auth-form"><label><span><Mail size={14} /> Email</span><input type="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="you@example.com" /></label><label><span><LockKeyhole size={14} /> Password</span><input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={6} placeholder="At least 6 characters" /></label>{message && <div className="form-message">{message}</div>}<button className="primary-button full" disabled={busy}>{busy ? "Working…" : mode === "sign-in" ? "Enter the lab" : "Create account"}<ArrowRight size={16} /></button></form><p className="auth-footnote">Supabase Auth keeps your research record private. Prediction Lab never sells or publishes your forecasts.</p></section></div>;
}
