// Genera el manual de un usuario como un HTML autocontenido (para exportar a la carpeta de gestion).
// Usa el mismo contenido que la solapa Manual (MANUAL_ENTRIES), filtrado por las solapas del usuario.
import { MANUAL_ENTRIES, type ManualBlock, type ManualEntry } from "./manual";

const esc = (s: string): string =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const blockHtml = (b: ManualBlock): string => {
  switch (b.type) {
    case "p":
      return `<p>${esc(b.text)}</p>`;
    case "steps":
      return `<ol>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "bullets":
      return `<ul>${b.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "warn":
      return `<div class="box warn">⚠️ ${esc(b.text)}</div>`;
    case "tip":
      return `<div class="box tip">💡 ${esc(b.text)}</div>`;
    case "image":
      return `<div class="imgph">🖼️ Captura pendiente: ${esc(b.caption)}</div>`;
    case "table":
      return `<table><thead><tr>${b.headers
        .map((h) => `<th>${esc(h)}</th>`)
        .join("")}</tr></thead><tbody>${b.rows
        .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`;
  }
};

const entryHtml = (e: ManualEntry): string =>
  `<section><h2>${e.emoji} ${esc(e.title)}</h2><p class="intro">${esc(e.intro)}</p>${e.sections
    .map(
      (s) => `<h3>${esc(s.heading)}</h3>${s.blocks.map(blockHtml).join("")}`
    )
    .join("")}</section>`;

const CSS = `
:root{color-scheme:light}
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.55;max-width:820px;margin:0 auto;padding:32px 20px;background:#fff}
h1{font-size:26px;margin:0 0 4px}
.user{color:#475569;margin:0 0 24px}
section{border:1px solid #e2e8f0;border-radius:12px;padding:18px 20px;margin:0 0 18px}
h2{font-size:20px;margin:0 0 6px}
h3{font-size:15px;color:#334155;border-bottom:2px solid #f1f5f9;padding-bottom:4px;margin:18px 0 8px}
.intro{font-weight:500;color:#0f172a;margin:0 0 8px}
p{margin:6px 0;color:#334155}
ol,ul{margin:6px 0 6px 20px;color:#334155}
li{margin-bottom:4px}
.box{border-radius:10px;padding:10px 12px;margin:8px 0;font-size:14px}
.warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e}
.tip{background:#eff6ff;border:1px solid #bfdbfe;color:#1e3a8a}
.imgph{border:2px dashed #cbd5e1;border-radius:10px;padding:18px;text-align:center;color:#94a3b8;background:#f8fafc;margin:8px 0;font-size:13px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}
th{text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;color:#475569}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
footer{color:#94a3b8;font-size:12px;text-align:center;margin-top:28px}
@media print{body{padding:0}section{break-inside:avoid}}
`;

// Devuelve el HTML del manual para un usuario, con solo las solapas de `tabKeys`.
export function buildManualHtml(userName: string, tabKeys: string[]): string {
  const set = new Set(tabKeys);
  const entries = MANUAL_ENTRIES.filter((e) => set.has(e.tabKey) && e.tabKey !== "manual");
  const body = entries.map(entryHtml).join("");
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Manual - ${esc(userName)}</title><style>${CSS}</style></head>
<body>
<h1>Manual de operacion</h1>
<p class="user">Usuario: <strong>${esc(userName)}</strong> &middot; Sistema de Gestion Grupo BGA</p>
${body}
<footer>Manual generado desde el sistema. Se actualiza cuando cambian tus solapas.</footer>
</body></html>`;
}
