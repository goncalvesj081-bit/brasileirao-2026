/** HTML já seguro (escapado ou montado por `html`). */
export class Html {
  constructor(readonly s: string) {}
  toString() {
    return this.s;
  }
}

const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const esc = (s: unknown) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

function valor(v: unknown): string {
  if (v instanceof Html) return v.s;
  if (Array.isArray(v)) return v.map(valor).join("");
  if (v == null || v === false) return "";
  return esc(v);
}

/** Template que escapa tudo que é interpolado, exceto `Html` (e arrays de `Html`). */
export function html(partes: TemplateStringsArray, ...vals: unknown[]): Html {
  let s = partes[0];
  for (let i = 0; i < vals.length; i++) s += valor(vals[i]) + partes[i + 1];
  return new Html(s);
}

/** Marca uma string como HTML confiável (só para conteúdo gerado aqui, como SVG). */
export const cru = (s: string) => new Html(s);
