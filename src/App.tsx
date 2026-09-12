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
import Jeux from "./pages/Jeux";
import Adapter from "./pages/Adapter";
import Ressources from "./pages/Ressources";
import Assistant from "./pages/Assistant";
import Amis from "./pages/Amis";
import Reglages from "./pages/Reglages";
import { PageVisibleContext } from "./components/ui";
import { demarrerSyncAuto } from "./syncAuto";
import { ErrorBoundary } from "./components/ErrorBoundary";
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
import { installerGlisserDeposer } from "./dragdrop";

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
  { to: "/jeux", ico: "🎲", label: "Fabriquer" },
  { to: "/adapter", ico: "📄", label: "Adapter une fiche" },
  { to: "/ressources", ico: "🌐", label: "Ressources" },
  { sep: true },
  { to: "/assistant", ico: "✨", label: "Assistant IA" },
  { to: "/amis", ico: "🤝", label: "Amis" },
  { to: "/reglages", ico: "⚙️", label: "Réglages" },
];

// Pages de premier niveau gardées « vivantes » : une fois visitées, elles
// restent montées (cachées en display:none) pour qu'on retrouve son travail en
// l'état (onglet, sélection, défilement, brouillons) en changeant d'onglet.
// Le Planning en est volontairement exclu (il se réinitialise à chaque visite).
const KEEP_ALIVE: { path: string; element: React.ReactNode }[] = [
  { path: "/", element: <Dashboard /> },
  { path: "/sequences", element: <Sequences /> },
  { path: "/projets", element: <Projets /> },
  { path: "/ateliers", element: <Ateliers /> },
  { path: "/organisation", element: <Organisation /> },
  { path: "/eleves", element: <Eleves /> },
  { path: "/referentiels", element: <Referentiels /> },
  { path: "/materiel", element: <Materiel /> },
  { path: "/jeux", element: <Jeux /> },
  { path: "/adapter", element: <Adapter /> },
  { path: "/ressources", element: <Ressources /> },
  { path: "/assistant", element: <Assistant /> },
  { path: "/amis", element: <Amis /> },
  { path: "/reglages", element: <Reglages /> },
];
const KEEP_PATHS = new Set(KEEP_ALIVE.map((p) => p.path));

function KeepAliveHost({ pathname }: { pathname: string }) {
  const estGardee = KEEP_PATHS.has(pathname);
  // Montage paresseux : une page n'est créée qu'après sa première visite.
  const [visitees, setVisitees] = React.useState<Set<string>>(() => new Set(estGardee ? [pathname] : []));
  React.useEffect(() => {
    if (estGardee && !visitees.has(pathname)) setVisitees((v) => new Set(v).add(pathname));
  }, [pathname, estGardee, visitees]);

  return (
    <>
      {KEEP_ALIVE.map((p) =>
        visitees.has(p.path) ? (
          <div key={p.path} className="page-scroll" style={{ display: pathname === p.path ? "flex" : "none" }}>
            <PageVisibleContext.Provider value={pathname === p.path}>
              <ErrorBoundary resetKey={pathname}>{p.element}</ErrorBoundary>
            </PageVisibleContext.Provider>
          </div>
        ) : null
      )}
      {/* Routes non gardées : Planning (remonté à chaque fois), fiche séquence,
          et repli. Rendu uniquement hors des pages gardées pour ne pas
          déclencher le repli pendant qu'une page gardée est affichée. */}
      {!estGardee && (
        <div className="page-scroll">
          <ErrorBoundary resetKey={pathname}>
            <Routes>
              <Route path="/planning" element={<Planning />} />
              <Route path="/sequences/:id" element={<SequenceDetail />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </ErrorBoundary>
        </div>
      )}
    </>
  );
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [version, setVersion] = React.useState("");
  React.useEffect(() => { bootTheme(); }, []);
  React.useEffect(() => { getVersion().then(setVersion).catch(() => {}); }, []);
  React.useEffect(() => { installerGlisserDeposer(); }, []);
  // Synchronisation de fond : rien à cliquer, les écrans se relisent d'eux-mêmes
  // quand des données arrivent de l'autre machine.
  React.useEffect(() => demarrerSyncAuto(), []);

  // Liseré lumineux : met l'animation en pause quand la fenêtre perd le focus
  // (économie de batterie). L'attribut est lu par le CSS [data-winfocus].
  React.useEffect(() => {
    const root = document.documentElement;
    const focus = () => root.setAttribute("data-winfocus", "1");
    const blur = () => root.setAttribute("data-winfocus", "0");
    if (document.hasFocus()) focus(); else blur();
    window.addEventListener("focus", focus);
    window.addEventListener("blur", blur);
    return () => { window.removeEventListener("focus", focus); window.removeEventListener("blur", blur); };
  }, []);

  // Empêche le navigateur d'OUVRIR un fichier lâché n'importe où dans la fenêtre
  // (le comportement par défaut). Les vraies zones de dépôt gèrent le drop via
  // leurs propres handlers React ; ici on neutralise juste l'ouverture.
  React.useEffect(() => {
    const stop = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", stop);
    window.addEventListener("drop", stop);
    return () => { window.removeEventListener("dragover", stop); window.removeEventListener("drop", stop); };
  }, []);

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
      <div className="neon-frame" aria-hidden="true" />
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
        <KeepAliveHost pathname={location.pathname} />
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
        {actions && <div className="topbar-actions">{actions}</div>}
      </div>
      <div className="content">{children}</div>
    </>
  );
}
