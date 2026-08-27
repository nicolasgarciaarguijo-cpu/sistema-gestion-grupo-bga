// HTML del CIERRE DE EJERCICIO: lo que queda en la carpeta cuando el año se da por terminado.
//
// El ejercicio cerrado sigue en el sistema para leer, pero la carpeta es el archivo definitivo: es lo
// que queda cuando el sistema se recicle, se migre o se vacíe. Lo que "Exportar TODO" ya escribe
// (presupuestos, trabajos, compras, personal, caja chica, remitos, facturación, marcadores) NO se
// repite acá: esto cubre justamente lo que ese export NO tenía:
//
//   - los movimientos del banco del ejercicio
//   - los gastos de Costos
//   - los consumos y resúmenes de tarjeta
//   - los ítems del Calendario anual cargados a mano
//   - la asistencia del personal
//
// Y arriba de todo, el RESUMEN DE CIERRE: la foto con la que arranca el ejercicio siguiente.
import { money } from "../lib/format";
import { totalDeMoneda } from "../domain/cierreEjercicio";
import type { CierreEjercicio } from "../domain/cierreEjercicio";

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const CSS = `
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:960px;margin:0 auto;padding:28px 20px;background:#fff}
h1{font-size:22px;margin:0 0 2px}
h2{font-size:16px;color:#334155;margin:22px 0 8px;border-bottom:2px solid #f1f5f9;padding-bottom:4px}
.sub{color:#475569;margin:0 0 16px;font-size:14px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:13px}
th{text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;color:#475569;font-size:11px;text-transform:uppercase}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
td.num,th.num{text-align:right}
.tot{font-weight:700;color:#0f172a}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:8px 0}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px}
.card .k{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700}
.card .v{font-size:18px;font-weight:700;margin-top:2px}
.neg{color:#dc2626}
.aviso{border:2px solid #0f172a;border-radius:10px;padding:12px 14px;margin:14px 0;font-size:13px}
.b{background:#f8fafc;color:#334155;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700}
.n{background:#0f172a;color:#fff;padding:1px 7px;border-radius:999px;font-size:11px;font-weight:700}
footer{color:#94a3b8;font-size:12px;text-align:center;margin-top:24px}
@media print{body{padding:0}}
`;

const page = (title: string, body: string): string =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
    title
  )}</title><style>${CSS}</style></head><body>${body}<footer>Generado desde el Sistema de Gestion Grupo BGA</footer></body></html>`;

const bn = (a?: string) => (a === "negro" ? `<span class="n">N</span>` : `<span class="b">B</span>`);
const n0 = (v: unknown) => Number(v || 0);

// Nombre de la carpeta del ejercicio: "Ejercicio 2025-11 a 2026-10".
export const cierreFolderName = (c: { startIso: string; endIso: string }): string =>
  `Ejercicio ${c.startIso.slice(0, 7)} a ${c.endIso.slice(0, 7)}`;

// ---- 1) El resumen de cierre: la foto ---------------------------------------------------------

export function buildCierreResumenHtml(c: CierreEjercicio, companyShort: string): string {
  const fila = (loc: "banco" | "efectivo", cur: "ARS" | "USD") => {
    const blanco = totalDeMoneda(c.billeteras, cur, { location: loc, color: "blanco" });
    const negro = totalDeMoneda(c.billeteras, cur, { location: loc, color: "negro" });
    return `<tr><td>${loc === "banco" ? "Banco" : "Efectivo"}</td><td class="num">${money(
      blanco,
      cur
    )}</td><td class="num">${money(negro, cur)}</td><td class="num tot">${money(
      blanco + negro,
      cur
    )}</td></tr>`;
  };
  const tabla = (cur: "ARS" | "USD") => `
    <h2>${cur === "ARS" ? "Pesos" : "Dólares"}</h2>
    <table>
      <thead><tr><th>Dónde</th><th class="num">Blanco</th><th class="num">Negro</th><th class="num">Total</th></tr></thead>
      <tbody>
        ${fila("banco", cur)}
        ${fila("efectivo", cur)}
        <tr><td class="tot">Total ${cur === "ARS" ? "pesos" : "dólares"}</td><td class="num"></td><td class="num"></td><td class="num tot">${money(
          totalDeMoneda(c.billeteras, cur),
          cur
        )}</td></tr>
      </tbody>
    </table>`;

  const body = `
    <h1>Cierre de ejercicio &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(c.startIso)} al ${esc(c.endIso)} &middot; cerrado el ${esc(
    String(c.closedAt).slice(0, 10)
  )} por ${esc(c.closedBy || "-")}</p>

    <div class="aviso">
      <strong>Este es el saldo con el que arranca el ejercicio siguiente.</strong> El año cerrado se
      sigue viendo en el sistema, pero solo para leer. Pesos y dólares no se suman entre sí.
    </div>

    ${tabla("ARS")}
    ${totalDeMoneda(c.billeteras, "USD") !== 0 ? tabla("USD") : ""}

    <h2>Lo que quedó abierto y pasa al ejercicio nuevo</h2>
    <div class="grid">
      <div class="card"><div class="k">A cobrar</div><div class="v">${money(c.aCobrar)}</div></div>
      <div class="card"><div class="k">A pagar</div><div class="v">${money(c.aPagar)}</div></div>
      <div class="card"><div class="k">Cuenta corriente del grupo</div><div class="v ${
        c.cuentaCorrienteGrupo < 0 ? "neg" : ""
      }">${money(c.cuentaCorrienteGrupo)}</div></div>
    </div>

    <h2>Resultado del ejercicio</h2>
    <div class="grid">
      <div class="card"><div class="k">Ingresos</div><div class="v">${money(c.resultado.ingresos)}</div></div>
      <div class="card"><div class="k">Egresos</div><div class="v">${money(c.resultado.egresos)}</div></div>
      <div class="card"><div class="k">Resultado</div><div class="v ${
        c.resultado.resultado < 0 ? "neg" : ""
      }">${money(c.resultado.resultado)}</div></div>
    </div>

    <h2>IVA</h2>
    <div class="grid">
      <div class="card"><div class="k">Débito</div><div class="v">${money(c.iva.debito)}</div></div>
      <div class="card"><div class="k">Crédito</div><div class="v">${money(c.iva.credito)}</div></div>
      <div class="card"><div class="k">Saldo</div><div class="v ${
        c.iva.saldo < 0 ? "neg" : ""
      }">${money(c.iva.saldo)}</div></div>
    </div>

    ${c.notes ? `<h2>Notas</h2><p>${esc(c.notes)}</p>` : ""}`;
  return page(`Cierre ${c.startIso.slice(0, 7)} a ${c.endIso.slice(0, 7)} - ${companyShort}`, body);
}

// ---- 2) Movimientos del banco ------------------------------------------------------------------

export function buildCierreBancoHtml(entries: any[], periodo: string, companyShort: string): string {
  const orden = entries.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const rows = orden
    .map(
      (e) =>
        `<tr><td>${esc(e.date || "-")}</td><td>${esc(e.bank || "-")}</td><td>${esc(
          e.concept || "-"
        )}</td><td>${e.movementType === "credito" ? "Entró" : "Salió"}</td><td class="num">${money(
          n0(e.amount),
          e.currency === "USD" ? "USD" : "ARS"
        )}</td><td class="num">${money(n0(e.balance), e.currency === "USD" ? "USD" : "ARS")}</td><td>${bn(
          e.administration
        )}</td><td>${esc(e.conceptKey || "sin renglón")}</td></tr>`
    )
    .join("");
  const entro = orden.filter((e) => e.movementType === "credito").reduce((a, e) => a + n0(e.amount), 0);
  const salio = orden.filter((e) => e.movementType !== "credito").reduce((a, e) => a + n0(e.amount), 0);
  const body = `
    <h1>Movimientos del banco &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(periodo)} &middot; ${orden.length} movimiento(s)</p>
    <div class="grid">
      <div class="card"><div class="k">Entró</div><div class="v">${money(entro)}</div></div>
      <div class="card"><div class="k">Salió</div><div class="v">${money(salio)}</div></div>
      <div class="card"><div class="k">Neto</div><div class="v ${entro - salio < 0 ? "neg" : ""}">${money(
        entro - salio
      )}</div></div>
    </div>
    <table>
      <thead><tr><th>Fecha</th><th>Banco</th><th>Concepto</th><th>Tipo</th><th class="num">Importe</th><th class="num">Saldo</th><th>B/N</th><th>Renglón</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page(`Banco ${periodo} - ${companyShort}`, body);
}

// ---- 3) Gastos de Costos -----------------------------------------------------------------------

export function buildCierreCostosHtml(entries: any[], periodo: string, companyShort: string): string {
  const orden = entries.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const rows = orden
    .map(
      (e) =>
        `<tr><td>${esc(e.date || "-")}</td><td>${esc(e.supplier || "-")}</td><td>${esc(
          e.description || "-"
        )}</td><td>${esc(e.group || "sin grupo")}</td><td>${esc(
          e.paymentMethod || "-"
        )}</td><td class="num">${money(n0(e.amount))}</td><td>${bn(e.administration)}</td></tr>`
    )
    .join("");
  const porGrupo = new Map<string, number>();
  orden.forEach((e) => porGrupo.set(e.group || "sin grupo", (porGrupo.get(e.group || "sin grupo") || 0) + n0(e.amount)));
  const resumen = Array.from(porGrupo.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([g, v]) => `<tr><td>${esc(g)}</td><td class="num">${money(v)}</td></tr>`)
    .join("");
  const body = `
    <h1>Gastos y pagos a proveedores &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(periodo)} &middot; ${orden.length} gasto(s) &middot; total ${money(
    orden.reduce((a, e) => a + n0(e.amount), 0)
  )}</p>
    <h2>Por grupo</h2>
    <table><thead><tr><th>Grupo</th><th class="num">Total</th></tr></thead><tbody>${resumen}</tbody></table>
    <h2>Detalle</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Proveedor</th><th>Detalle</th><th>Grupo</th><th>Cómo se pagó</th><th class="num">Importe</th><th>B/N</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page(`Costos ${periodo} - ${companyShort}`, body);
}

// ---- 4) Tarjetas -------------------------------------------------------------------------------

export function buildCierreTarjetasHtml(
  consumptions: any[],
  cards: any[],
  periodo: string,
  companyShort: string
): string {
  const nombreTarjeta = (id: unknown) => cards.find((c) => c.id === id)?.name || "-";
  const orden = consumptions.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const rows = orden
    .map(
      (c) =>
        `<tr><td>${esc(c.date || "-")}</td><td>${esc(nombreTarjeta(c.cardId))}</td><td>${esc(
          c.description || "-"
        )}</td><td>${esc(c.group || "sin grupo")}</td><td class="num">${money(
          n0(c.amount),
          c.currency === "USD" ? "USD" : "ARS"
        )}</td></tr>`
    )
    .join("");
  const body = `
    <h1>Consumos de tarjeta &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(periodo)} &middot; ${orden.length} consumo(s)</p>
    <table>
      <thead><tr><th>Fecha</th><th>Tarjeta</th><th>Detalle</th><th>Grupo</th><th class="num">Importe</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page(`Tarjetas ${periodo} - ${companyShort}`, body);
}

// ---- 5) Calendario anual (lo cargado a mano) ---------------------------------------------------

export function buildCierreCalendarioHtml(items: any[], periodo: string, companyShort: string): string {
  const orden = items.slice().sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  const rows = orden
    .map(
      (i) =>
        `<tr><td>${esc(i.date || "-")}</td><td>${esc(i.title || i.jobCode || "-")}</td><td>${esc(
          i.conceptKey || "sin renglón"
        )}</td><td>${esc(i.type || "-")}</td><td class="num">${money(n0(i.amount))}</td><td>${bn(
          i.administration
        )}</td></tr>`
    )
    .join("");
  const body = `
    <h1>Calendario anual &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(periodo)} &middot; ${orden.length} movimiento(s) cargado(s) a mano</p>
    <table>
      <thead><tr><th>Fecha</th><th>Detalle</th><th>Renglón</th><th>Tipo</th><th class="num">Importe</th><th>B/N</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page(`Calendario ${periodo} - ${companyShort}`, body);
}

// ---- 6) Asistencia -----------------------------------------------------------------------------

export function buildCierreAsistenciaHtml(
  employees: any[],
  startIso: string,
  endIso: string,
  companyShort: string
): string {
  const bloques = employees
    .map((emp) => {
      const dias = (emp.attendance || [])
        .filter((a: any) => {
          const d = String(a.date || "").slice(0, 10);
          return d >= startIso && d <= endIso;
        })
        .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
      if (!dias.length) return "";
      const rows = dias
        .map(
          (a: any) =>
            `<tr><td>${esc(a.date)}</td><td>${esc(a.status || "-")}</td><td>${esc(
              a.checkIn || "-"
            )}</td><td>${esc(a.checkOut || "-")}</td><td class="num">${n0(a.normalHours)}</td><td class="num">${n0(
              a.extra50Hours
            )}</td><td class="num">${n0(a.extra100Hours)}</td><td>${esc(a.notes || "")}</td></tr>`
        )
        .join("");
      return `
        <h2>${esc(emp.name || "Empleado")} &middot; legajo ${esc(emp.legajo || "-")}</h2>
        <table>
          <thead><tr><th>Fecha</th><th>Estado</th><th>Entrada</th><th>Salida</th><th class="num">Normales</th><th class="num">50%</th><th class="num">100%</th><th>Nota</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`;
    })
    .filter(Boolean)
    .join("");
  const body = `
    <h1>Asistencia del ejercicio &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(startIso)} al ${esc(endIso)}</p>
    ${bloques || "<p>No hay fichadas cargadas en el ejercicio.</p>"}`;
  return page(`Asistencia ${startIso.slice(0, 7)} a ${endIso.slice(0, 7)} - ${companyShort}`, body);
}

// ---- 7) El índice de la carpeta del ejercicio --------------------------------------------------

export function buildCierreIndiceHtml(
  c: CierreEjercicio,
  companyShort: string,
  archivos: Array<{ nombre: string; que: string }>,
  purga: Array<{ nombre: string; archivar: number; quedan: number }>
): string {
  const lista = archivos
    .map((a) => `<tr><td><a href="${esc(a.nombre)}">${esc(a.nombre)}</a></td><td>${esc(a.que)}</td></tr>`)
    .join("");
  const filas = purga
    .map(
      (p) =>
        `<tr><td>${esc(p.nombre)}</td><td class="num">${p.archivar}</td><td class="num">${p.quedan}</td></tr>`
    )
    .join("");
  const body = `
    <h1>Ejercicio cerrado &middot; ${esc(companyShort)}</h1>
    <p class="sub">${esc(c.startIso)} al ${esc(c.endIso)} &middot; cerrado el ${esc(
    String(c.closedAt).slice(0, 10)
  )}</p>
    <div class="aviso">
      <strong>Acá está todo el ejercicio.</strong> En el sistema el año quedó cerrado: se puede mirar
      entero, pero solo el superadmin puede editarlo. Las imágenes del ejercicio se sacaron del sistema
      (ahí estaba el peso) y quedaron acá, incrustadas en estos archivos.
      <br><br>
      <strong>cierre.json</strong> es el respaldo completo y crudo del ejercicio: no es para leer, es
      para poder restaurarlo si alguna vez hiciera falta. No lo borres.
    </div>
    <h2>Archivos</h2>
    <table><thead><tr><th>Archivo</th><th>Qué tiene</th></tr></thead><tbody>${lista}</tbody></table>
    <h2>Qué hay del ejercicio y qué seguía abierto al cierre</h2>
    <table>
      <thead><tr><th>Bloque</th><th class="num">Del ejercicio</th><th class="num">Sigue abierto</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
  return page(`Ejercicio cerrado ${companyShort}`, body);
}
