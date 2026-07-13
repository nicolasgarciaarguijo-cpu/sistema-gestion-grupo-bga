// Ilustraciones (mockups) fieles de cada solapa, como SVG autocontenido, para el manual.
// No son capturas reales: reproducen el layout, los colores de empresa (AZUL=BGA, MARRON=De Raiz,
// GRIS=General) y los titulos reales de cada panel, para que el usuario reconozca cada pantalla.
// Se referencian desde MANUAL_ENTRIES (bloque image con `svg`). Andan igual en la solapa Manual y
// en el HTML exportado (van inline). Un solo "marco" (frame) comun mantiene todo consistente.

const C = {
  page: "#eef2f7",
  text: "#0f172a",
  muted: "#475569",
  faint: "#94a3b8",
  border: "#e2e8f0",
  border2: "#cbd5e1",
  soft: "#f8fafc",
  softer: "#f1f5f9",
  white: "#ffffff",
  bga: "#14213d",
  bgaSoft: "#dbe7f7",
  raiz: "#b7791f",
  raizSoft: "#fef3c7",
  gen: "#475569",
  genSoft: "#e2e8f0",
  green: "#16a34a",
  yellow: "#eab308",
  red: "#dc2626",
  side: "#26303f",
  sideItem: "#38455a",
  sideMuted: "#8595ab",
  accent: "#1d4ed8",
};

const esc = (s: string): string =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

type TxtOpts = {
  size?: number;
  color?: string;
  weight?: number;
  anchor?: "start" | "middle" | "end";
  ls?: number;
};
const txt = (x: number, y: number, s: string, o: TxtOpts = {}): string => {
  const { size = 13, color = C.text, weight = 400, anchor = "start", ls = 0 } = o;
  return `<text x="${x}" y="${y}" font-family="Arial, sans-serif" font-size="${size}" fill="${color}" font-weight="${weight}" text-anchor="${anchor}"${
    ls ? ` letter-spacing="${ls}"` : ""
  }>${esc(s)}</text>`;
};

type RectOpts = { r?: number; fill?: string; stroke?: string; sw?: number };
const rect = (x: number, y: number, w: number, h: number, o: RectOpts = {}): string => {
  const { r = 10, fill = C.white, stroke = "", sw = 1 } = o;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"${
    stroke ? ` stroke="${stroke}" stroke-width="${sw}"` : ""
  }/>`;
};

const dot = (cx: number, cy: number, color: string, r = 7): string =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;

const chip = (x: number, y: number, w: number, s: string, fill: string, color: string): string =>
  rect(x, y, w, 22, { r: 11, fill }) +
  txt(x + w / 2, y + 15, s, { size: 11, weight: 700, color, anchor: "middle" });

// Panel con el "cabezal" real: circulo oscuro con un "–" (colapsar) + titulo.
const panel = (x: number, y: number, w: number, h: number, title: string, inner = ""): string =>
  rect(x, y, w, h, { r: 14, stroke: C.border, sw: 1 }) +
  `<circle cx="${x + 24}" cy="${y + 26}" r="9" fill="#0f172a"/>` +
  rect(x + 20, y + 25, 8, 2, { r: 1, fill: "#ffffff" }) +
  txt(x + 42, y + 31, title, { size: 14, weight: 700 }) +
  inner;

const CX = 272; // x del area de contenido
const CW = 832; // ancho del area de contenido

// ---- Marco: fondo + header + sidebar (con la solapa activa resaltada) ----
const NAV: Array<{ sec?: string; k?: string; s?: string; l?: string }> = [
  { sec: "Sistema" },
  { k: "acceso", s: "AC", l: "Acceso" },
  { sec: "Administracion bruta" },
  { k: "cashflow", s: "CF", l: "Balance y cash flow" },
  { k: "facturacion", s: "FC", l: "Facturacion y cobranzas" },
  { k: "aprobados", s: "TA", l: "Trabajos aprobados" },
  { k: "fabricacion", s: "FB", l: "Fabricacion" },
  { k: "compras", s: "CP", l: "Compras" },
  { k: "cajaChica", s: "CC", l: "Caja chica" },
  { sec: "Administracion neta" },
  { k: "presupuesto", s: "PR", l: "Presupuesto actual" },
  { k: "historial", s: "CRM", l: "CRM" },
  { k: "stock", s: "SA", l: "Stock y costos" },
  { k: "marcadores", s: "MK", l: "Marcadores" },
  { sec: "Informacion de carga" },
  { k: "documentos", s: "DOC", l: "Documentos" },
  { k: "manual", s: "MAN", l: "Manual" },
];

const sidebar = (activeKey: string): string => {
  let y = 150;
  let out = txt(36, y, "MENU DEL SISTEMA", { size: 9, weight: 700, color: C.sideMuted, ls: 1.2 });
  y += 20;
  for (const item of NAV) {
    if (item.sec) {
      out += txt(36, y, item.sec.toUpperCase(), { size: 8.5, weight: 700, color: C.sideMuted, ls: 1 });
      y += 22;
      continue;
    }
    const active = item.k === activeKey;
    if (active) out += rect(28, y - 18, 220, 26, { r: 9, fill: C.white });
    const badgeFill = active ? C.side : C.sideItem;
    out += `<circle cx="48" cy="${y - 5}" r="11" fill="${badgeFill}"/>`;
    out += txt(48, y - 1, item.s || "", { size: 7.5, weight: 700, color: "#ffffff", anchor: "middle" });
    out += txt(66, y - 1, item.l || "", {
      size: 11,
      weight: active ? 700 : 500,
      color: active ? C.text : "#cbd5e1",
    });
    y += 28;
  }
  return out;
};

type FrameOpts = { chipText?: string; chipFill?: string; chipColor?: string };
const frame = (activeKey: string, body: string, o: FrameOpts = {}): string => {
  const { chipText = "General", chipFill = C.genSoft, chipColor = C.gen } = o;
  const bg = rect(0, 0, 1120, 680, { r: 0, fill: C.page });
  const header =
    rect(16, 16, 1088, 84, { r: 16, stroke: C.border }) +
    chip(34, 30, 78, chipText, chipFill, chipColor) +
    txt(34, 76, "Sistema de Gestion Grupo BGA", { size: 24, weight: 700 }) +
    txt(34, 92, "Fechas visibles en formato dia-mes-año", { size: 11, color: C.muted });
  const side = rect(16, 112, 240, 552, { r: 20, fill: C.side }) + sidebar(activeKey);
  return `<svg viewBox="0 0 1120 680" xmlns="http://www.w3.org/2000/svg" role="img" width="100%">${bg}${header}${side}${body}</svg>`;
};

// Fila de "sub-tarjeta" para semaforos (dot + eyebrow + valor)
const semItem = (x: number, y: number, w: number, color: string, eyebrow: string, value: string): string =>
  rect(x, y, w, 62, { r: 10, fill: C.soft, stroke: C.border }) +
  dot(x + 22, y + 31, color, 8) +
  txt(x + 40, y + 26, eyebrow, { size: 9, weight: 700, color: C.faint, ls: 0.5 }) +
  txt(x + 40, y + 45, value, { size: 14, weight: 700, color: C.text });

// Boton (relleno o secundario)
const btn = (x: number, y: number, w: number, label: string, primary = false): string =>
  rect(x, y, w, 30, { r: 8, fill: primary ? C.accent : C.white, stroke: primary ? "" : C.border2 }) +
  txt(x + w / 2, y + 20, label, {
    size: 11,
    weight: 700,
    color: primary ? "#ffffff" : C.text,
    anchor: "middle",
  });

// Fila de tabla generica: array de [texto, x, anchor?]
type Cell = { t: string; x: number; anchor?: "start" | "middle" | "end"; color?: string; weight?: number };
const tableRow = (y: number, cells: Cell[], divider = true, x0 = CX + 20, w = CW - 40): string =>
  (divider ? rect(x0, y + 8, w, 1, { r: 0, fill: C.softer }) : "") +
  cells
    .map((c) => txt(c.x, y, c.t, { size: 11, anchor: c.anchor || "start", color: c.color || C.text, weight: c.weight || 400 }))
    .join("");

// ---------------------------------------------------------------------------
// Pantallas
// ---------------------------------------------------------------------------

// ACCESO (login, sin sesion): header + tarjeta de marca + tarjeta de login.
const figAcceso = (): string => {
  const bg = rect(0, 0, 1120, 680, { r: 0, fill: C.page });
  const header =
    rect(16, 16, 1088, 84, { r: 16, stroke: C.border }) +
    chip(34, 30, 78, "General", C.genSoft, C.gen) +
    txt(34, 76, "Sistema de Gestion Grupo BGA", { size: 24, weight: 700 });
  // tarjeta marca
  const brand =
    rect(300, 190, 240, 300, { r: 18, stroke: C.border }) +
    `<defs><linearGradient id="bgaG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d4ed8"/><stop offset="1" stop-color="#14213d"/></linearGradient></defs>` +
    rect(370, 250, 100, 100, { r: 22, fill: "url(#bgaG)" }) +
    txt(420, 312, "BGA", { size: 26, weight: 700, color: "#ffffff", anchor: "middle" }) +
    txt(420, 392, "Grupo BGA", { size: 22, weight: 700, anchor: "middle" }) +
    txt(420, 420, "Acceso al sistema", { size: 13, weight: 700, color: C.accent, anchor: "middle" });
  // tarjeta login
  const login =
    rect(560, 190, 260, 300, { r: 18, stroke: C.border }) +
    txt(584, 232, "Iniciar sesion con", { size: 17, weight: 700 }) +
    txt(584, 254, "Supabase", { size: 17, weight: 700 }) +
    txt(584, 278, "Usa tu mail y contraseña habilitados.", { size: 9.5, color: C.muted }) +
    rect(584, 292, 212, 30, { r: 8, fill: C.soft, stroke: C.border }) +
    txt(596, 311, "Mail de Supabase", { size: 10, color: C.faint }) +
    rect(584, 330, 212, 30, { r: 8, fill: C.soft, stroke: C.border }) +
    txt(596, 349, "Contraseña de Supabase", { size: 10, color: C.faint }) +
    btn(584, 372, 212, "Ingresar al sistema", true) +
    btn(584, 410, 212, "Olvide mi contraseña");
  return `<svg viewBox="0 0 1120 680" xmlns="http://www.w3.org/2000/svg" role="img" width="100%">${bg}${header}${brand}${login}</svg>`;
};

// FACTURACION
const figFacturacion = (): string => {
  const sem =
    semItem(CX + 20, 166, 250, C.red, "COBROS", "1 vencida") +
    semItem(CX + 291, 166, 250, C.green, "PAGOS", "al dia") +
    semItem(CX + 562, 166, 250, C.red, "FECHAS A FACTURAR", "1 vencida");
  const panelA = panel(CX, 128, CW, 110, "Semaforo: cobros, pagos y fechas", sem);
  // calendario anual (chips de meses)
  const months = ["oct", "nov", "dic", "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep"];
  let mx = CX + 20;
  let cal = txt(CX + 20, 300, "Año fiscal nov 2025 – oct 2026 · cada mes se abre o se minimiza", {
    size: 10,
    color: C.muted,
  });
  const chips = months
    .map((m, i) => {
      const active = m === "jun";
      const s =
        rect(mx, 312, 62, 34, { r: 8, fill: active ? C.genSoft : C.soft, stroke: C.border }) +
        txt(mx + 31, 333, m, { size: 11, weight: active ? 700 : 500, anchor: "middle", color: C.text });
      mx += 66;
      return s;
    })
    .join("");
  const rows =
    tableRow(392, [
      { t: "Fecha", x: CX + 22, weight: 700, color: C.muted },
      { t: "Empresa", x: CX + 130, weight: 700, color: C.muted },
      { t: "Concepto", x: CX + 300, weight: 700, color: C.muted },
      { t: "B/N", x: CX + 600, weight: 700, color: C.muted },
      { t: "Monto", x: CW + CX - 40, anchor: "end", weight: 700, color: C.muted },
    ], false) +
    tableRow(420, [
      { t: "10-06-2026", x: CX + 22 },
      { t: "BGA", x: CX + 130, color: C.bga, weight: 700 },
      { t: "Factura anticipo — Obra Rivadavia", x: CX + 300 },
      { t: "B", x: CX + 600, color: C.green, weight: 700 },
      { t: "$ 1.250.000", x: CW + CX - 40, anchor: "end", weight: 700 },
    ]) +
    tableRow(448, [
      { t: "22-06-2026", x: CX + 22 },
      { t: "De Raiz", x: CX + 130, color: C.raiz, weight: 700 },
      { t: "Cobranza saldo — Deck jardin", x: CX + 300 },
      { t: "N", x: CX + 600, color: C.text, weight: 700 },
      { t: "$ 480.000", x: CW + CX - 40, anchor: "end", weight: 700 },
    ]);
  const panelB = panel(CX, 252, CW, 220, "Calendario anual unificado", cal + chips + rows);
  return frame("facturacion", panelA + panelB);
};

// BALANCE / CASH FLOW
const figCashflow = (): string => {
  const selector =
    rect(CX, 128, CW, 60, { r: 14, stroke: C.border }) +
    txt(CX + 20, 152, "Vista", { size: 9, weight: 700, color: C.faint, ls: 0.5 }) +
    rect(CX + 20, 158, 210, 24, { r: 8, fill: C.soft, stroke: C.border }) +
    txt(CX + 32, 174, "General / todo el grupo", { size: 10, color: C.text }) +
    txt(CX + 250, 152, "Periodo", { size: 9, weight: 700, color: C.faint, ls: 0.5 }) +
    rect(CX + 250, 158, 150, 24, { r: 8, fill: C.soft, stroke: C.border }) +
    txt(CX + 262, 174, "Año fiscal 2026", { size: 10, color: C.text }) +
    chip(CX + 420, 158, 120, "Nov 2025 – Oct 2026", C.genSoft, C.gen);
  const kpi = (x: number, w: number, label: string, value: string, sub: string, color: string): string =>
    rect(x, 244, w, 78, { r: 10, fill: C.soft, stroke: C.border }) +
    txt(x + 16, 268, label, { size: 9, weight: 700, color: C.faint, ls: 0.5 }) +
    txt(x + 16, 294, value, { size: 18, weight: 700, color }) +
    txt(x + 16, 313, sub, { size: 9.5, color: C.muted });
  const balance = panel(
    CX,
    196,
    CW,
    132,
    "Balance · facturacion y cobranza",
    kpi(CX + 20, 250, "FACTURADO", "$ 8.4 M", "emitido en el periodo", C.text) +
      kpi(CX + 291, 250, "COBRADO", "$ 6.1 M", "blanco 4.2 M · negro 1.9 M", C.green) +
      kpi(CX + 562, 250, "ADEUDADO", "$ 2.3 M", "falta cobrar", C.red)
  );
  const income = panel(
    CX,
    340,
    CW,
    140,
    "Estado de resultados del periodo (percibido, operativo)",
    tableRow(392, [
      { t: "Ingresos (cobros del periodo)", x: CX + 22 },
      { t: "$ 6.100.000", x: CW + CX - 40, anchor: "end", weight: 700, color: C.green },
    ], false) +
      tableRow(420, [
        { t: "Egresos (compras, caja chica, nomina, amortizacion)", x: CX + 22 },
        { t: "– $ 4.350.000", x: CW + CX - 40, anchor: "end", weight: 700, color: C.red },
      ]) +
      tableRow(452, [
        { t: "Resultado del periodo", x: CX + 22, weight: 700 },
        { t: "$ 1.750.000", x: CW + CX - 40, anchor: "end", weight: 700 },
      ]),
  );
  return frame("cashflow", selector + balance + income);
};

// TRABAJOS APROBADOS
const figAprobados = (): string => {
  const listRow = (y: number, color: string, comp: string, name: string, saldo: string): string =>
    rect(CX + 20, y - 16, 300, 40, { r: 8, fill: C.soft, stroke: C.border }) +
    rect(CX + 20, y - 16, 5, 40, { r: 2, fill: color }) +
    txt(CX + 36, y - 2, name, { size: 11, weight: 700 }) +
    txt(CX + 36, y + 14, comp + " · saldo " + saldo, { size: 9.5, color: C.muted });
  const list =
    listRow(188, C.bga, "BGA", "Obra Rivadavia", "$ 0.9 M") +
    listRow(238, C.raiz, "De Raiz", "Deck jardin", "$ 0.5 M") +
    listRow(288, C.bga, "BGA", "Mobiliario oficina", "$ 0");
  const listPanel = panel(CX, 128, 340, 200, "Trabajos aprobados por empresa", list);
  // ficha (resumen economico)
  const fx = CX + 356;
  const fw = CW - 356;
  const resumen = (y: number, label: string, value: string, strong = false): string =>
    tableRow(y, [
      { t: label, x: fx + 22 },
      { t: value, x: fx + fw - 22, anchor: "end", weight: strong ? 700 : 400 },
    ], y > 172, fx + 20, fw - 40);
  const ficha = panel(
    fx,
    128,
    fw,
    200,
    "Resumen economico",
    resumen(172, "Neto presupuesto", "$ 3.000.000") +
      resumen(198, "% facturado", "60 %") +
      resumen(224, "IVA (sobre lo facturado)", "$ 378.000") +
      resumen(252, "Valor a cobrar (bruto)", "$ 3.378.000", true) +
      resumen(280, "Anticipo a cobrar", "$ 2.478.000") +
      resumen(306, "Saldo", "$ 900.000", true)
  );
  return frame("aprobados", listPanel + ficha, { chipText: "BGA", chipFill: C.bgaSoft, chipColor: C.bga });
};

// PERSONAL
const figPersonal = (): string => {
  const head = tableRow(172, [
    { t: "Empleado", x: CX + 22, weight: 700, color: C.muted },
    { t: "Categoria", x: CX + 250, weight: 700, color: C.muted },
    { t: "Impacto blanco", x: CX + 470, anchor: "end", weight: 700, color: C.muted },
    { t: "Impacto negro", x: CX + 640, anchor: "end", weight: 700, color: C.muted },
  ], false);
  const empRow = (y: number, name: string, cat: string, blanco: string, negro: string): string =>
    tableRow(y, [
      { t: name, x: CX + 22, weight: 700 },
      { t: cat, x: CX + 250 },
      { t: blanco, x: CX + 470, anchor: "end", color: C.text },
      { t: negro, x: CX + 640, anchor: "end", color: C.raiz },
    ]);
  const emps =
    head +
    empRow(200, "Juan Perez", "Oficial", "$ 720.000", "$ 90.000") +
    empRow(228, "Marta Diaz", "Medio oficial", "$ 610.000", "$ 0") +
    empRow(256, "Luis (temporal)", "Temporal (negro)", "$ 0", "$ 320.000");
  const empPanel = panel(CX, 128, CW, 156, "Empleados", emps);
  const banner =
    rect(CX, 300, CW, 44, { r: 10, fill: C.softer, stroke: C.border }) +
    txt(CX + 18, 327, "Capacidad horaria — nominales 176 h · productivas 152 h (se descuentan feriados y vacaciones)", {
      size: 10.5,
      color: C.muted,
    });
  const liq = panel(
    CX,
    356,
    CW,
    124,
    "Liquidacion del mes · junio 2026",
    tableRow(400, [
      { t: "Horas al 100 % / 50 %", x: CX + 22 },
      { t: "152 h · 8 h", x: CW + CX - 40, anchor: "end", weight: 700 },
    ], false) +
      tableRow(428, [
        { t: "Valor hora (sobre horas productivas)", x: CX + 22 },
        { t: "$ 4.750", x: CW + CX - 40, anchor: "end", weight: 700 },
      ]) +
      tableRow(456, [
        { t: "Costo hora hombre para cotizar (blanco + negro)", x: CX + 22, weight: 700 },
        { t: "$ 6.980", x: CW + CX - 40, anchor: "end", weight: 700, color: C.accent },
      ]),
  );
  return frame("personal", empPanel + banner + liq);
};

// DOCUMENTOS
const figDocumentos = (): string => {
  const carga = panel(
    CX,
    128,
    CW,
    190,
    "Carga por carpeta vinculada",
    btn(CX + 20, 178, 150, "Vincular carpeta", true) +
      btn(CX + 180, 178, 130, "Sincronizar") +
      txt(CX + 20, 214, "Bandeja (ordenado por tipo y mes):", { size: 10, weight: 700, color: C.muted }) +
      tableRow(240, [
        { t: "Compras / 2026-06 / factura-proveedor.pdf", x: CX + 22 },
        { t: "subido", x: CW + CX - 40, anchor: "end", color: C.green, weight: 700 },
      ]) +
      tableRow(268, [
        { t: "Escalas / escala-cct-335.pdf", x: CX + 22 },
        { t: "leido → valores cargados", x: CW + CX - 40, anchor: "end", color: C.green, weight: 700 },
      ]) +
      tableRow(296, [
        { t: "Personal / Juan Perez / EPP / 2026-05-02 Casco.jpg", x: CX + 22 },
        { t: "vigencia +6m", x: CW + CX - 40, anchor: "end", color: C.muted },
      ]),
  );
  const exportar = panel(
    CX,
    334,
    CW,
    146,
    "Exportar a la carpeta",
    txt(CX + 20, 372, "El sistema escribe HTML (Ctrl+P → PDF). Pide permiso de escritura una vez.", {
      size: 10.5,
      color: C.muted,
    }) +
      btn(CX + 20, 388, 130, "Manuales") +
      btn(CX + 160, 388, 150, "Presupuestos") +
      btn(CX + 320, 388, 130, "Resumenes") +
      btn(CX + 460, 388, 140, "Exportar TODO", true) +
      txt(CX + 20, 446, "Manuales/<usuario>/ · Presupuestos/<cliente>/ · Recibos/AAAA-MM/ · Resumenes/<periodo>/", {
        size: 9.5,
        color: C.faint,
      }),
  );
  return frame("documentos", carga + exportar);
};

// COMPRAS
const figCompras = (): string => {
  const sem =
    semItem(CX + 20, 166, 250, C.red, "FALTANTE", "3 materiales") +
    semItem(CX + 291, 166, 250, C.yellow, "PARCIAL", "2 materiales") +
    semItem(CX + 562, 166, 250, C.green, "CUBIERTO", "8 materiales");
  const semPanel = panel(CX, 128, CW, 114, "Semaforo de compras", sem);
  const head = tableRow(298, [
    { t: "Material", x: CX + 22, weight: 700, color: C.muted },
    { t: "Necesario", x: CX + 360, anchor: "end", weight: 700, color: C.muted },
    { t: "En stock", x: CX + 500, anchor: "end", weight: 700, color: C.muted },
    { t: "A comprar", x: CX + 660, anchor: "end", weight: 700, color: C.muted },
    { t: "", x: CW + CX - 40 },
  ], false);
  const cRow = (y: number, mat: string, nec: string, stk: string, buy: string, tone: string): string =>
    tableRow(y, [
      { t: mat, x: CX + 22 },
      { t: nec, x: CX + 360, anchor: "end" },
      { t: stk, x: CX + 500, anchor: "end" },
      { t: buy, x: CX + 660, anchor: "end", weight: 700 },
    ]) + dot(CW + CX - 30, y - 4, tone, 6);
  const table = panel(
    CX,
    248,
    CW,
    204,
    "Resumen de compras pendientes",
    head +
      cRow(326, "MDF 18mm", "40 pl", "12 pl", "28 pl", C.red) +
      cRow(354, "Tornillo 4x40", "2000 u", "1500 u", "500 u", C.yellow) +
      cRow(382, "Bisagra cazoleta", "120 u", "120 u", "0 u", C.green) +
      cRow(410, "Melamina blanca", "25 pl", "0 pl", "25 pl", C.red) +
      cRow(438, "Cola vinilica", "10 kg", "8 kg", "2 kg", C.yellow)
  );
  return frame("compras", semPanel + table);
};

// CRM / HISTORIAL
const figHistorial = (): string => {
  const head = tableRow(172, [
    { t: "Cliente", x: CX + 22, weight: 700, color: C.muted },
    { t: "CUIT", x: CX + 220, weight: 700, color: C.muted },
    { t: "Presupuestos", x: CX + 420, anchor: "end", weight: 700, color: C.muted },
    { t: "Estado", x: CX + 560, weight: 700, color: C.muted },
  ], false);
  const cRow = (y: number, name: string, cuit: string, n: string, estado: string, tone: string): string =>
    tableRow(y, [
      { t: name, x: CX + 22, weight: 700 },
      { t: cuit, x: CX + 220, color: C.muted },
      { t: n, x: CX + 420, anchor: "end" },
      { t: estado, x: CX + 560 },
    ]) + dot(CX + 540, y - 4, tone, 6);
  const list = panel(
    CX,
    128,
    CW,
    200,
    "CRM de clientes",
    head +
      cRow(200, "Estudio Rivadavia", "30-1234-5", "4", "datos completos", C.green) +
      cRow(228, "Familia Gomez", "27-9876-5", "2", "falta contacto", C.yellow) +
      cRow(256, "Consorcio Belgrano", "30-5555-1", "1", "datos completos", C.green) +
      cRow(284, "Casa Diaz", "20-4444-2", "3", "aprobado → trabajo", C.green)
  );
  const ficha = panel(
    CX,
    344,
    CW,
    136,
    "Historial de presupuestos — Estudio Rivadavia",
    tableRow(388, [
      { t: "P-0042 rev. 2 — Obra Rivadavia", x: CX + 22 },
      { t: "aprobado", x: CX + 480 },
      { t: "$ 3.100.000", x: CW + CX - 40, anchor: "end", weight: 700 },
    ], false) +
      tableRow(416, [
        { t: "P-0039 rev. 1 — Reforma local", x: CX + 22 },
        { t: "exportado", x: CX + 480, color: C.muted },
        { t: "$ 890.000", x: CW + CX - 40, anchor: "end", weight: 700 },
      ]) +
      tableRow(444, [
        { t: "P-0031 rev. 3 — Mobiliario", x: CX + 22 },
        { t: "vencido", x: CX + 480, color: C.red },
        { t: "$ 640.000", x: CW + CX - 40, anchor: "end", weight: 700 },
      ]),
  );
  return frame("historial", list + ficha);
};

// FABRICACION
const figFabricacion = (): string => {
  const sem =
    semItem(CX + 20, 166, 380, C.yellow, "OCUPACION DE FABRICA", "72 % comprometida") +
    semItem(CX + 421, 166, 391, C.red, "COMPRAS PENDIENTES", "2 trabajos frenados");
  const semPanel = panel(CX, 128, CW, 114, "Semaforo de fabricacion", sem);
  // gantt
  const gRow = (y: number, name: string, color: string, x1: number, w: number): string =>
    txt(CX + 22, y + 4, name, { size: 11, weight: 700 }) +
    rect(CX + 220, y - 8, 580, 18, { r: 5, fill: C.softer }) +
    rect(CX + 220 + x1, y - 8, w, 18, { r: 5, fill: color });
  const gantt = panel(
    CX,
    248,
    CW,
    204,
    "Calendario de fabricacion y entregas",
    txt(CX + 220, 292, "jun", { size: 9, color: C.faint }) +
      txt(CX + 400, 292, "jul", { size: 9, color: C.faint }) +
      txt(CX + 580, 292, "ago", { size: 9, color: C.faint }) +
      txt(CX + 740, 292, "sep", { size: 9, color: C.faint }) +
      gRow(320, "Obra Rivadavia", C.bga, 20, 220) +
      gRow(356, "Deck jardin", C.raiz, 120, 140) +
      gRow(392, "Mobiliario oficina", C.bga, 300, 180) +
      gRow(428, "Reforma local", C.raiz, 200, 260)
  );
  return frame("fabricacion", semPanel + gantt);
};

export const MANUAL_FIGURES: Record<string, string> = {
  acceso: figAcceso(),
  facturacion: figFacturacion(),
  cashflow: figCashflow(),
  aprobados: figAprobados(),
  personal: figPersonal(),
  documentos: figDocumentos(),
  compras: figCompras(),
  historial: figHistorial(),
  fabricacion: figFabricacion(),
};
