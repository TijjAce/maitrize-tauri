// Rendu Markdown minimal et sûr (titres, listes, gras/italique, code, citations,
// liens). Le texte est d'abord échappé (anti-XSS) puis transformé.
function echapper(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string): string {
  return s
    .replace(/`([^`]+)`/g, (_m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*\n]+)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

export function Markdown({ texte }: { texte: string }) {
  const html: string[] = [];
  let liste: "ul" | "ol" | null = null;
  const fermer = () => { if (liste) { html.push(`</${liste}>`); liste = null; } };

  for (const brut of echapper(texte).split("\n")) {
    const ligne = brut.replace(/\s+$/, "");
    let m: RegExpMatchArray | null;
    if ((m = ligne.match(/^###\s+(.*)/))) { fermer(); html.push(`<h4>${inline(m[1])}</h4>`); }
    else if ((m = ligne.match(/^##\s+(.*)/))) { fermer(); html.push(`<h3>${inline(m[1])}</h3>`); }
    else if ((m = ligne.match(/^#\s+(.*)/))) { fermer(); html.push(`<h2>${inline(m[1])}</h2>`); }
    else if ((m = ligne.match(/^\s*[-*]\s+(.*)/))) { if (liste !== "ul") { fermer(); html.push("<ul>"); liste = "ul"; } html.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = ligne.match(/^\s*\d+\.\s+(.*)/))) { if (liste !== "ol") { fermer(); html.push("<ol>"); liste = "ol"; } html.push(`<li>${inline(m[1])}</li>`); }
    else if ((m = ligne.match(/^>\s+(.*)/))) { fermer(); html.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if (ligne.trim() === "") { fermer(); }
    else { fermer(); html.push(`<p>${inline(ligne)}</p>`); }
  }
  fermer();
  return <div className="md" dangerouslySetInnerHTML={{ __html: html.join("") }} />;
}
