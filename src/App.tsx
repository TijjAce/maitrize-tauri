import React from "react";
import { NavLink, Route, Routes, Navigate, useNavigate, useLocation } from "react-router-dom";
import logo from "./assets/logo.png";
import Dashboard from "./pages/Dashboard";
import Sequences from "./pages/Sequences";
import SequenceDetail from "./pages/SequenceDetail";
import Projets from "./pages/Projets";
import Ateliers from "./pages/Ateliers";
import Planning from "./pages/Planning";
import Organisation from "./pages/Organisation";
import Eleves from "./pages/Eleves";
import Referentiels from "./pages/Referentiels";
import Materiel from "./pages/Materiel";
import Ressources from "./pages/Ressources";
import Assistant from "./pages/Assistant";
import Amis from "./pages/Amis";
import Reglages from "./pages/Reglages";
import { NotesPanel } from "./components/NotesPanel";
import { CommandPalette } from "./components/CommandPalette";
import { Onboarding } from "./components/Onboarding";
import { ContextMenuHost } from "./components/ctxmenu";
import { CguGate } from "./components/CGU";
import { bootTheme } from "./theme";
import { raccourci, isMac } from "./api";
import { getVersion } from "@tauri-apps/api/app";
import { Toaster, toast } from "./components/Toaster";
import { UpdateBanner } from "./components/UpdateBanner";
import { releverBoiteAuxLettres, messageRecu } from "./inbox";

const NAV: ({ to: string; ico: string; label: string; end?: boolean } | { sep: true })[] = [
  { to: "/", ico: "🏠", label: "Tableau de bord", end: true },
  { sep: true },
  { to: "/sequences", ico: "📚", label: "Séquences" },
  { to: "/projets", ico: "📁", label: "Projets" },
  { to: "/ateliers", ico: "🧩", label: "Ateliers & Espaces" },
  { to: "/planning", ico: "🗓️", label: "Planning" },
  { to: "/organisation", ico: "🗂️", label: "Organisation" },
  { sep: true },
  { to: "/eleves", ico: "👧", label: "Élèves" },
  { to: "/referentiels", ico: "📖", label: "Référentiels" },
  { to: "/materiel", ico: "🧰", label: "Matériel" },
  { to: "/ressources", ico: "🌐", label: "Ressources" },
  { sep: true },
  { to: "/assistant", ico: "✨", label: "Assistant IA" },
  { to: "/amis", ico: "🤝", label: "Amis" },
  { to: "/reglages", ico: "⚙️", label: "Réglages" },
];

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = React.useState("");
  React.useEffect(() => { bootTheme(); }, []);
  React.useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);

  // Boîte aux lettres : relève automatique au démarrage puis toutes les 2 min.
  // Chaque nouvel élément reçu déclenche une notification (toast).
  React.useEffect(() => {
    let arrete = false;
    const verifier = async () => {
      try {
        const recus = await releverBoiteAuxLettres();
        if (arrete) return;
        for (const r of recus) toast(messageRecu(r));
        if (recus.length > 0) window.dispatchEvent(new Event("maitrize:recu"));
      } catch { /* hors-ligne / non configuré */ }
    };
    verifier();
    const id = window.setInterval(verifier, 120000);
    const onManuel = () => verifier();
    window.addEventListener("maitrize:relever", onManuel);
    return () => { arrete = true; window.clearInterval(id); window.removeEventListener("maitrize:relever", onManuel); };
  }, []);

  // Cmd+Alt ↑/↓ : navigation dans le menu de gauche (item précédent / suivant).
  // (Combinaison à deux touches pour ne pas gêner la saisie avec Option seul.)
  React.useEffect(() => {
    const dests = NAV.filter((n): n is { to: string; ico: string; label: string } => "to" in n).map((n) => n.to);
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey && e.altKey) || e.ctrlKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t?.tagName)) return;
      e.preventDefault();
      // Index courant : meilleure correspondance de préfixe.
      let cur = dests.findIndex((d) => d !== "/" && location.pathname.startsWith(d));
      if (cur === -1) cur = dests.indexOf("/");
      const next = e.key === "ArrowDown"
        ? Math.min(cur + 1, dests.length - 1)
        : Math.max(cur - 1, 0);
      navigate(dests[next]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [location.pathname, navigate]);

  return (
    <CguGate>
    <div className="app">
      <nav className="sidebar" aria-label="Navigation principale">
        <div className="brand"><img src={logo} className="brand-logo" alt="" /><span className="brand-text">Maitrize V2{version && <span className="brand-version">v{version}</span>}</span></div>
        <button className="palette-trigger" aria-label="Rechercher dans l'application"
          aria-keyshortcuts={isMac ? "Meta+K" : "Control+K"}
          onClick={() => window.dispatchEvent(new Event("maitrize:palette"))}>
          <span aria-hidden="true">🔎</span><span>Rechercher…</span><kbd aria-hidden="true">{raccourci("K")}</kbd>
        </button>
        {NAV.map((n, i) =>
          "sep" in n ? (
            <div key={i} className="nav-sep" role="separator" />
          ) : (
            <NavLink key={n.to} to={n.to} end={n.end}
              className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
              <span className="ico" aria-hidden="true">{n.ico}</span>{n.label}
            </NavLink>
          )
        )}
      </nav>

      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/sequences/:id" element={<SequenceDetail />} />
          <Route path="/projets" element={<Projets />} />
          <Route path="/ateliers" element={<Ateliers />} />
          <Route path="/planning" element={<Planning />} />
          <Route path="/organisation" element={<Organisation />} />
          <Route path="/eleves" element={<Eleves />} />
          <Route path="/referentiels" element={<Referentiels />} />
          <Route path="/materiel" element={<Materiel />} />
          <Route path="/ressources" element={<Ressources />} />
          <Route path="/assistant" element={<Assistant />} />
          <Route path="/amis" element={<Amis />} />
          <Route path="/reglages" element={<Reglages />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <Toaster />
      <UpdateBanner />
      <NotesPanel />
      <CommandPalette />
      <Onboarding />
      <ContextMenuHost />
    </div>
    </CguGate>
  );
}

export function Page({ titre, sous, actions, children }: {
  titre: string; sous?: string; actions?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <>
      <div className="topbar">
        <div>
          <h1>{titre}</h1>
          {sous && <div className="sub">{sous}</div>}
        </div>
        <div className="spacer" />
        {actions}
      </div>
      <div className="content">{children}</div>
    </>
  );
}
