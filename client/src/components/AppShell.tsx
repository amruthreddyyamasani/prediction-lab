import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart3, BookOpen, ChevronRight, Compass, FlaskConical, LogIn, LogOut, Menu, Moon, Settings2, Sun, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import AuthDialog from "./AuthDialog";
import ScrollWorld from "./ScrollWorld";

const nav = [
  { href: "/", section: "ask", label: "Ask the future", short: "ASK", icon: FlaskConical },
  { href: "/library", section: "ledger", label: "Forecast ledger", short: "LEDGER", icon: BookOpen },
  { href: "/analytics", section: "calibration", label: "Calibration", short: "CALIBRATION", icon: BarChart3 },
  { href: "/categories", section: "topics", label: "Explore topics", short: "TOPICS", icon: Compass },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [homeSection, setHomeSection] = useState("ask");
  const { theme, toggleTheme } = useTheme();
  const { user, loading, signOut } = useSupabaseAuth();
  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "PL";

  useEffect(() => {
    const openAuth = () => setAuthOpen(true);
    window.addEventListener("prediction-lab:open-auth", openAuth);
    return () => window.removeEventListener("prediction-lab:open-auth", openAuth);
  }, []);

  useEffect(() => {
    if (location !== "/") {
      setHomeSection("ask");
      return;
    }
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-home-section]'));
    if (!sections.length) return;
    const observer = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) setHomeSection((visible.target as HTMLElement).dataset.homeSection || "ask");
    }, { rootMargin: "-18% 0px -55% 0px", threshold: [0.12, 0.35, 0.6] });
    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, [location]);

  useEffect(() => {
    let frame = 0;
    let revealObserver: IntersectionObserver | null = null;
    const reveal = () => {
      const nodes = Array.from(document.querySelectorAll<HTMLElement>(
        '.page-content section, .page-content .page-heading, .page-content .ledger-toolbar, .page-content .ledger-table, .page-content .metric-band, .page-content .analytics-grid, .page-content .topic-grid, .page-content .settings-list, .page-content .detail-header, .page-content .forecast-hero, .page-content .detail-section, .page-content .side-panel, .page-content .archive-panel, .page-content .method-strip'
      ));
      nodes.forEach((node, index) => {
        node.dataset.reveal = index % 5 === 0 ? 'scale' : 'up';
        node.style.transitionDelay = `${Math.min(index * 45, 260)}ms`;
      });
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        nodes.forEach(node => node.classList.add('is-visible'));
        return;
      }
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).classList.add('is-visible');
            revealObserver?.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
      nodes.forEach(node => revealObserver?.observe(node));
    };
    const revealCleanup = window.setTimeout(reveal, 0);
    const updateScene = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      document.documentElement.style.setProperty("--scroll-progress", progress.toFixed(4));
      document.documentElement.style.setProperty("--scroll-depth", `${window.scrollY * -0.035}px`);
    };
    const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(updateScene); };
    updateScene();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.clearTimeout(revealCleanup); revealObserver?.disconnect(); window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (frame) window.cancelAnimationFrame(frame); };
  }, [location]);

  return (
    <div className="app-frame">
      {location === "/" && <ScrollWorld />}
      <div className="scroll-progress" aria-hidden="true"><span /></div>
      <aside className={`side-rail ${mobileOpen ? "is-open" : ""}`}>
        <div className="rail-brand"><div className="brand-mark"><span></span><span></span><span></span></div><div><div className="brand-name">Prediction Lab</div><div className="brand-sub">forecasting instrument</div></div><button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
        <div className="rail-section-label">The lab / 2026</div>
        <nav className="rail-nav" aria-label="Primary navigation">
          {nav.map(item => {
            const Icon = item.icon;
            const active = location === "/" ? homeSection === item.section : (item.href !== "/" && location.startsWith(item.href));
            const target = location === "/" ? `#${item.section}` : item.href;
            return location === "/" ? (
              <a key={item.href} href={target} onClick={() => setMobileOpen(false)} className={`rail-link ${active ? "active" : ""}`} aria-current={active ? "location" : undefined}>
                <Icon size={17} strokeWidth={1.7} /><span>{item.label}</span><small>{item.short}</small>{active && <ChevronRight size={14} className="rail-arrow" />}
              </a>
            ) : (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={`rail-link ${active ? "active" : ""}`} aria-current={active ? "page" : undefined}>
                <Icon size={17} strokeWidth={1.7} /><span>{item.label}</span><small>{item.short}</small>{active && <ChevronRight size={14} className="rail-arrow" />}
              </Link>
            );
          })}
        </nav>
        <div className="rail-note"><Activity size={16} /><div><strong>Forecasts are not facts.</strong><span>Probabilities update as the world changes.</span></div></div>
        <div className="rail-bottom">{location === "/" ? <a href="#settings" className={`rail-link ${homeSection === "settings" ? "active" : ""}`} onClick={() => setMobileOpen(false)} aria-current={homeSection === "settings" ? "location" : undefined}><Settings2 size={17} strokeWidth={1.7} /><span>Settings</span></a> : <Link href="/settings" className={`rail-link ${location === "/settings" ? "active" : ""}`}><Settings2 size={17} strokeWidth={1.7} /><span>Settings</span></Link>}{loading ? <div className="rail-user muted">Checking session…</div> : user ? <button className="rail-user" onClick={() => signOut()}><span className="avatar">{initials}</span><span className="user-copy"><strong>{user.email}</strong><small>Sign out</small></span><LogOut size={15} /></button> : <button className="rail-user" onClick={() => setAuthOpen(true)}><span className="avatar guest">?</span><span className="user-copy"><strong>Guest mode</strong><small>Sign in to save</small></span><LogIn size={15} /></button>}</div>
      </aside>
      <main className="main-canvas"><header className="top-bar"><button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="breadcrumb"><span>Prediction Lab</span><span className="slash">/</span><span>{nav.find(item => location === item.href || (item.href !== "/" && location.startsWith(item.href)))?.label ?? "Forecast"}</span></div><div className="top-actions"><span className="live-dot"></span><span className="live-label">Evidence-aware</span><button className="icon-button" onClick={toggleTheme} aria-label="Toggle theme">{theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button>{!user && <button className="top-signin" onClick={() => setAuthOpen(true)}>Sign in <LogIn size={15} /></button>}</div></header><div className="page-content page-transition" key={location}>{children}</div></main>
      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
