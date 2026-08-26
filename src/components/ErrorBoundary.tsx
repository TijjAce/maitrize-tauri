import React from "react";

// Capture les erreurs de rendu d'une page pour éviter l'écran blanc complet et
// afficher un message exploitable (au lieu de planter toute l'application).
interface State { err: Error | null }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode; resetKey?: string }, State> {
  state: State = { err: null };

  static getDerivedStateFromError(err: Error): State { return { err }; }

  componentDidCatch(err: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", err, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey?: string }) {
    // Repart proprement quand on change de page (la clé change).
    if (prev.resetKey !== this.props.resetKey && this.state.err) this.setState({ err: null });
  }

  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 28, maxWidth: 760 }}>
          <h2 style={{ color: "var(--danger, #d64d4d)" }}>Une erreur est survenue sur cette page</h2>
          <p style={{ color: "var(--text-2)" }}>Vous pouvez changer d'onglet puis revenir. Détail technique :</p>
          <pre style={{ whiteSpace: "pre-wrap", background: "var(--panel-2)", padding: 14, borderRadius: 8, fontSize: 12, overflow: "auto" }}>
            {String(this.state.err?.message || this.state.err)}
            {"\n\n"}
            {this.state.err?.stack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
