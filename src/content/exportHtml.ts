// Genera HTML para exportar a la carpeta de gestion: presupuestos y trabajos aprobados (uno por
// archivo, dentro de la carpeta del cliente) y resumenes mensuales. Pensado para seguimiento.
import type { SavedBudget, RemitoDraft, Payment } from "../domain/types";
import { money } from "../lib/format";
import { getPlanoSemaphore, isPlanoPending, comparePlanoUrgency } from "../domain/planos";

const esc = (s: unknown): string =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// Limpia un texto para usarlo como nombre de carpeta o archivo (saca caracteres invalidos).
export const safeName = (s: string): string =>
  (s || "").replace(/[\\/:*?"<>|]+/g, "-").replace(/\s+/g, " ").trim() || "sin-nombre";

const MONTHS_ES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
export const monthLabelEs = (monthKey: string): string => {
  const [y, m] = (monthKey || "").split("-").map(Number);
  if (!y || !m) return "sin fecha";
  return `${MONTHS_ES[m - 1]} ${y}`;
};

const CSS = `
*{box-sizing:border-box}
body{font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:820px;margin:0 auto;padding:28px 20px;background:#fff}
h1{font-size:22px;margin:0 0 2px}
h2{font-size:16px;color:#334155;margin:20px 0 8px;border-bottom:2px solid #f1f5f9;padding-bottom:4px}
.sub{color:#475569;margin:0 0 16px;font-size:14px}
table{border-collapse:collapse;width:100%;margin:8px 0;font-size:14px}
th{text-align:left;padding:6px 10px;border-bottom:2px solid #e2e8f0;color:#475569;font-size:12px;text-transform:uppercase}
td{padding:6px 10px;border-bottom:1px solid #f1f5f9;color:#334155}
td.num,th.num{text-align:right}
.tot{font-weight:700;color:#0f172a}
.pill{display:inline-block;padding:2px 8px;border-radius:999px;font-size:12px;font-weight:700}
.ok{background:#dcfce7;color:#166534}.no{background:#fee2e2;color:#991b1b}.dr{background:#e2e8f0;color:#475569}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:8px 0}
.card{border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px}
.card .k{font-size:11px;color:#64748b;text-transform:uppercase;font-weight:700}
.card .v{font-size:18px;font-weight:700;margin-top:2px}
footer{color:#94a3b8;font-size:12px;text-align:center;margin-top:24px}
@media print{body{padding:0}}
`;

const page = (title: string, body: string): string =>
  `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(
    title
  )}</title><style>${CSS}</style></head><body>${body}<footer>Generado desde el Sistema de Gestion Grupo BGA</footer></body></html>`;

const statusPill = (status: string): string => {
  if (status === "aprobado") return `<span class="pill ok">Aprobado</span>`;
  if (status === "no_aprobado") return `<span class="pill no">No aprobado</span>`;
  return `<span class="pill dr">Borrador</span>`;
};

// ---- Presupuestos ----

export const budgetFileName = (b: SavedBudget): string =>
  safeName(`Presupuesto ${b.number}${b.project ? " - " + b.project : ""}`) + ".html";

export function buildBudgetHtml(b: SavedBudget): string {
  const t = b.snapshot?.totals as any;
  const body = `
    <h1>Presupuesto N&deg; ${esc(b.number)}</h1>
    <p class="sub">${esc(b.client)} &middot; ${esc(b.project)} &middot; ${esc(b.date || "sin fecha")} &middot; ${statusPill(
    b.status
  )}${b.exportedAt ? " &middot; exportado" : ""}</p>
    <div class="grid">
      <div class="card"><div class="k">Neto</div><div class="v">${money(b.netPrice)}</div></div>
      <div class="card"><div class="k">Descuentos</div><div class="v">${money(b.totalDiscountAmount)}</div></div>
      <div class="card"><div class="k">Precio final</div><div class="v">${money(b.finalPrice)}</div></div>
      <div class="card"><div class="k">Comision</div><div class="v">${money(b.commissionAmount)}</div></div>
    </div>
    ${
      t
        ? `<h2>Composicion del costo</h2>
    <table><tbody>
      <tr><td>Materiales</td><td class="num">${money(t.totalMaterials)}</td></tr>
      <tr><td>Insumos</td><td class="num">${money(t.totalBasicSupplies)}</td></tr>
      <tr><td>Mano de obra</td><td class="num">${money(t.totalLabor)}</td></tr>
      <tr><td>Costos fijos</td><td class="num">${money(t.fixedCostsApplied)}</td></tr>
      <tr class="tot"><td>Costo total</td><td class="num">${money(t.totalCost)}</td></tr>
    </tbody></table>`
        : ""
    }
    <h2>Datos</h2>
    <table><tbody>
      <tr><td>Empresa</td><td>${esc(b.company)}</td></tr>
      <tr><td>Plazo de entrega</td><td>${esc(b.deliveryTerm || "-")}</td></tr>
      <tr><td>Responsable</td><td>${esc(b.projectManager || "-")}</td></tr>
      <tr><td>Revision</td><td>${esc(b.revisionNumber || 1)}</td></tr>
    </tbody></table>`;
  return page(`Presupuesto ${b.number} - ${b.client}`, body);
}

export function buildBudgetsSummaryHtml(budgets: SavedBudget[], monthKey: string): string {
  const rows = budgets
    .map(
      (b) =>
        `<tr><td>${esc(b.number)}</td><td>${esc(b.client)}</td><td>${esc(
          b.project
        )}</td><td>${esc(b.date || "-")}</td><td class="num">${money(
          b.finalPrice
        )}</td><td>${statusPill(b.status)}</td></tr>`
    )
    .join("");
  const total = budgets.reduce((acc, b) => acc + Number(b.finalPrice || 0), 0);
  const approved = budgets.filter((b) => b.status === "aprobado").length;
  const body = `
    <h1>Resumen de presupuestos</h1>
    <p class="sub">${monthLabelEs(monthKey)} &middot; ${budgets.length} presupuesto(s) &middot; ${approved} aprobado(s)</p>
    <table>
      <thead><tr><th>N&deg;</th><th>Cliente</th><th>Proyecto</th><th>Fecha</th><th class="num">Final</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="tot"><td colspan="4">Total</td><td class="num">${money(total)}</td><td></td></tr></tfoot>
    </table>`;
  return page(`Resumen presupuestos ${monthKey}`, body);
}

// ---- Trabajos aprobados ----

export const jobFileName = (job: any): string =>
  safeName(`Trabajo ${job.budgetNumber}${job.project ? " - " + job.project : ""}`) + ".html";

export function buildJobHtml(job: any): string {
  const body = `
    <h1>Trabajo N&deg; ${esc(job.budgetNumber)}</h1>
    <p class="sub">${esc(job.client)} &middot; ${esc(job.project)} &middot; ${esc(
    job.company
  )} &middot; ${esc(job.executionStatus || "-")}</p>
    <div class="grid">
      <div class="card"><div class="k">Neto</div><div class="v">${money(job.soldNetPrice)}</div></div>
      <div class="card"><div class="k">Valor a cobrar</div><div class="v">${money(job.valueToCollect)}</div></div>
      <div class="card"><div class="k">Cobrado</div><div class="v">${money(job.collectedTotal)}</div></div>
      <div class="card"><div class="k">Saldo</div><div class="v">${money(job.remainingToPay)}</div></div>
    </div>
    <h2>Facturacion</h2>
    <table><tbody>
      <tr><td>% facturado</td><td class="num">${Number(job.billedPct || 0).toFixed(2)}%</td></tr>
      <tr><td>Neto facturado</td><td class="num">${money(job.billedNet)}</td></tr>
      <tr><td>IVA (sobre lo facturado)</td><td class="num">${money(job.invoiceVatAmount)}</td></tr>
      <tr><td>Circuito negro</td><td class="num">${money(job.blackNet)}</td></tr>
    </tbody></table>`;
  return page(`Trabajo ${job.budgetNumber} - ${job.client}`, body);
}

// ---- Recibos de pago ----

export const receiptFileName = (job: any, payment: Payment): string =>
  safeName(
    `Recibo ${job.budgetNumber} - ${job.client} - ${payment.paymentDate || "s-f"} - ${Math.round(
      Number(payment.amount || 0)
    )}`
  ) + ".html";

export function buildReceiptHtml(job: any, payment: Payment): string {
  const body = `
    <h1>Recibo de pago</h1>
    <p class="sub">${esc(job.client)} &middot; Trabajo N&deg; ${esc(job.budgetNumber)} &middot; ${esc(
    job.company
  )} &middot; ${esc(payment.paymentDate || "sin fecha")}</p>
    <div class="grid">
      <div class="card"><div class="k">Monto pagado</div><div class="v">${money(payment.amount)}</div></div>
      <div class="card"><div class="k">Forma</div><div class="v">${esc(payment.transactionType || "-")}</div></div>
      <div class="card"><div class="k">Administracion</div><div class="v">${
        payment.administration === "negro" ? "Negro" : "Blanco"
      }</div></div>
    </div>
    <h2>Estado del trabajo</h2>
    <table><tbody>
      <tr><td>Proyecto</td><td>${esc(job.project)}</td></tr>
      <tr><td>Valor a cobrar</td><td class="num">${money(job.valueToCollect)}</td></tr>
      <tr><td>Cobrado (total)</td><td class="num">${money(job.collectedTotal)}</td></tr>
      <tr class="tot"><td>Saldo actual</td><td class="num">${money(job.remainingToPay)}</td></tr>
    </tbody></table>`;
  return page(`Recibo ${job.budgetNumber} - ${job.client}`, body);
}

// ---- Remitos ----

export const remitoFileName = (draft: RemitoDraft): string =>
  safeName(`Remito ${draft.fileName || draft.id}`) + ".html";

export function buildRemitoHtml(draft: RemitoDraft): string {
  const rows = (draft.rows || [])
    .map(
      (r) =>
        `<tr><td>${esc(r.description)}</td><td class="num">${esc(r.quantity)}</td><td>${esc(
          r.unit
        )}</td><td class="num">${money(r.unitPrice)}</td><td class="num">${money(
          Number(r.quantity || 0) * Number(r.unitPrice || 0)
        )}</td></tr>`
    )
    .join("");
  const total = (draft.rows || []).reduce(
    (acc, r) => acc + Number(r.quantity || 0) * Number(r.unitPrice || 0),
    0
  );
  const body = `
    <h1>Remito</h1>
    <p class="sub">${esc(draft.fileName || "sin nombre")} &middot; ${esc(draft.company)}</p>
    <table>
      <thead><tr><th>Descripcion</th><th class="num">Cant.</th><th>Unidad</th><th class="num">P. unit</th><th class="num">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="tot"><td colspan="4">Total</td><td class="num">${money(total)}</td></tr></tfoot>
    </table>
    ${draft.notes ? `<h2>Notas</h2><p>${esc(draft.notes)}</p>` : ""}`;
  return page(`Remito ${draft.fileName || draft.id}`, body);
}

// ---- Resumen general (balance + trabajos) ----

export function buildGeneralSummaryHtml(input: {
  periodLabel: string;
  companyLabel: string;
  balance: any;
  jobsCount: number;
  toCollect: number;
  collected: number;
  pending: number;
}): string {
  const b = input.balance || {};
  const body = `
    <h1>Resumen general</h1>
    <p class="sub">${esc(input.companyLabel)} &middot; ${esc(input.periodLabel)}</p>
    <h2>Facturacion y cobranza</h2>
    <div class="grid">
      <div class="card"><div class="k">Facturado (con IVA)</div><div class="v">${money(b.invoicedTotal)}</div></div>
      <div class="card"><div class="k">Cobrado blanco</div><div class="v">${money(b.collectedWhite)}</div></div>
      <div class="card"><div class="k">Cobrado negro</div><div class="v">${money(b.collectedBlack)}</div></div>
      <div class="card"><div class="k">Adeudado total</div><div class="v">${money(b.owedTotal)}</div></div>
    </div>
    <h2>Trabajos aprobados</h2>
    <div class="grid">
      <div class="card"><div class="k">Trabajos</div><div class="v">${esc(input.jobsCount)}</div></div>
      <div class="card"><div class="k">A cobrar</div><div class="v">${money(input.toCollect)}</div></div>
      <div class="card"><div class="k">Cobrado</div><div class="v">${money(input.collected)}</div></div>
      <div class="card"><div class="k">Saldo</div><div class="v">${money(input.pending)}</div></div>
    </div>`;
  return page(`Resumen general ${input.periodLabel}`, body);
}

// ---- Resumen de compras ----

export function buildComprasSummaryHtml(purchases: any[], periodLabel: string): string {
  const rows = purchases
    .slice()
    .sort((a, b) => (a.invoiceDate || "").localeCompare(b.invoiceDate || ""))
    .map(
      (p) =>
        `<tr><td>${esc(p.invoiceDate || "-")}</td><td>${esc(p.supplier || "-")}</td><td>${esc(
          p.invoiceNumber || "-"
        )}</td><td class="num">${money(p.subtotal)}</td><td class="num">${money(
          p.vat
        )}</td><td class="num">${money(p.total)}</td><td>${
          p.administration === "negro" ? "Negro" : "Blanco"
        }</td></tr>`
    )
    .join("");
  const totalWhite = purchases
    .filter((p) => p.administration !== "negro")
    .reduce((a, p) => a + Number(p.total || 0), 0);
  const totalBlack = purchases
    .filter((p) => p.administration === "negro")
    .reduce((a, p) => a + Number(p.total || 0), 0);
  const body = `
    <h1>Resumen de compras</h1>
    <p class="sub">${esc(periodLabel)} &middot; ${purchases.length} comprobante(s)</p>
    <div class="grid">
      <div class="card"><div class="k">Total blanco</div><div class="v">${money(totalWhite)}</div></div>
      <div class="card"><div class="k">Total negro</div><div class="v">${money(totalBlack)}</div></div>
      <div class="card"><div class="k">Total</div><div class="v">${money(totalWhite + totalBlack)}</div></div>
    </div>
    <table>
      <thead><tr><th>Fecha</th><th>Proveedor</th><th>N&deg;</th><th class="num">Neto</th><th class="num">IVA</th><th class="num">Total</th><th>Adm.</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
  return page("Resumen de compras", body);
}

// ---- Resumen de personal (vencimientos de documentacion / EPP / insumos) ----

const vigenciaEstado = (dueDate: string, hasAttachment: boolean, today: string): string => {
  if (!hasAttachment && !dueDate) return "Falta";
  if (!dueDate) return "Sin vencimiento";
  const d = dueDate.slice(0, 10);
  if (d < today) return "VENCIDO";
  // vence pronto: dentro de ~30 dias (comparacion de texto aproximada por mes/dia no exacta, usa fecha)
  const [ty, tm, td] = today.split("-").map(Number);
  const [vy, vm, vd] = d.split("-").map(Number);
  const days = Math.round(
    (new Date(vy, vm - 1, vd).getTime() - new Date(ty, tm - 1, td).getTime()) / 86400000
  );
  if (days <= 30) return "Vence pronto";
  return "Vigente";
};

export function buildPersonalSummaryHtml(employees: any[], today: string): string {
  const rows: string[] = [];
  for (const emp of employees) {
    (emp.documents || []).forEach((doc: any) => {
      rows.push(
        `<tr><td>${esc(emp.name)}</td><td>Documentacion</td><td>${esc(
          doc.name || "-"
        )}</td><td>${esc(doc.dueDate || "-")}</td><td>${vigenciaEstado(
          doc.dueDate || "",
          !!doc.attachmentName,
          today
        )}</td></tr>`
      );
    });
    (emp.provisionItems || []).forEach((item: any) => {
      rows.push(
        `<tr><td>${esc(emp.name)}</td><td>${esc(item.kind || "-")}</td><td>${esc(
          item.stockCode || item.notes || "-"
        )}</td><td>${esc(item.dueDate || "-")}</td><td>${vigenciaEstado(
          item.dueDate || "",
          !!item.attachmentName,
          today
        )}</td></tr>`
      );
    });
  }
  const body = `
    <h1>Resumen de personal - vencimientos</h1>
    <p class="sub">${employees.length} empleado(s) &middot; al ${esc(today)}</p>
    <table>
      <thead><tr><th>Empleado</th><th>Tipo</th><th>Item</th><th>Vence</th><th>Estado</th></tr></thead>
      <tbody>${rows.join("") || `<tr><td colspan="5">Sin datos.</td></tr>`}</tbody>
    </table>`;
  return page("Resumen personal - vencimientos", body);
}

// Reporte de trabajos con planos de fabricacion pendientes (sin planos o cargados sin confirmar),
// ordenados por urgencia contra la fecha de inicio de fabricacion. Pensado para leerlo desde la
// carpeta o para que un agente lo use como recordatorio.
export function buildPlanosPendientesHtml(jobs: any[], today: string): string {
  const pend = jobs
    .filter((j) => isPlanoPending(j))
    .map((j) => ({ job: j, sem: getPlanoSemaphore(j, today) }))
    .sort((a, b) => comparePlanoUrgency(a.sem, b.sem));
  const rows = pend.map(({ job, sem }) => {
    const dias =
      sem.daysToStart === null
        ? "sin fecha de inicio"
        : sem.daysToStart < 0
        ? `vencido hace ${-sem.daysToStart} d`
        : sem.daysToStart === 0
        ? "hoy"
        : `faltan ${sem.daysToStart} d`;
    const estado = sem.level === "sin" ? "Sin planos" : "Sin confirmar";
    const cls = sem.overdue || sem.level === "sin" ? "no" : "dr";
    return `<tr><td>${esc(job.company)}</td><td>${esc(job.client || "-")}</td><td>${esc(
      job.project || "-"
    )}</td><td><span class="pill ${cls}">${estado}</span></td><td>${esc(
      (job.startDate || "").slice(0, 10) || "-"
    )}</td><td>${dias}</td><td>${sem.fileCount}</td></tr>`;
  });
  const body = `
    <h1>Planos de fabricacion pendientes</h1>
    <p class="sub">${pend.length} trabajo(s) sin planos confirmados &middot; al ${esc(
    today
  )} &middot; urgencia medida contra la fecha de inicio de fabricacion</p>
    <table>
      <thead><tr><th>Empresa</th><th>Cliente</th><th>Proyecto</th><th>Planos</th><th>Inicio fabricacion</th><th>Estado</th><th>Archivos</th></tr></thead>
      <tbody>${rows.join("") || `<tr><td colspan="7">No hay trabajos con planos pendientes. Todo al dia.</td></tr>`}</tbody>
    </table>`;
  return page("Planos de fabricacion pendientes", body);
}

// ---- Caja chica ----

// Nombre de carpeta del fondo: "responsable - descripcion" (mas claro). Si falta alguno, usa el que
// haya; si no hay ninguno, "Fondo N".
export const pettyCashFundFolder = (fund: any): string => {
  const parts = [fund.responsible, fund.description]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean);
  return safeName(parts.length ? parts.join(" - ") : `Fondo ${fund.id}`);
};

const adminLabel = (a?: string): string => (a === "negro" ? "Negro" : "Blanco");

export function buildPettyCashFundHtml(fund: any, expenses: any[]): string {
  const spent = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const saldo = Number(fund.assignedAmount || 0) - spent;
  const rows = expenses
    .slice()
    .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
    .map(
      (e) =>
        `<tr><td>${esc(e.date || "-")}</td><td>${esc(e.category || "-")}</td><td>${esc(
          e.description || "-"
        )}</td><td class="num">${money(e.amount)}</td><td>${adminLabel(e.administration)}</td></tr>`
    )
    .join("");
  const body = `
    <h1>Caja chica: ${esc(fund.description || "Fondo")}</h1>
    <p class="sub">Responsable: ${esc(fund.responsible || "-")} &middot; ${esc(fund.company)}${
    fund.active ? "" : " &middot; cerrado"
  }</p>
    <div class="grid">
      <div class="card"><div class="k">Monto asignado</div><div class="v">${money(fund.assignedAmount)}</div></div>
      <div class="card"><div class="k">Gastado</div><div class="v">${money(spent)}</div></div>
      <div class="card"><div class="k">Saldo</div><div class="v">${money(saldo)}</div></div>
    </div>
    <h2>Gastos cargados</h2>
    <table>
      <thead><tr><th>Fecha</th><th>Categoria</th><th>Descripcion</th><th class="num">Monto</th><th>Adm.</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="5">Sin gastos cargados. Deja los tickets en esta carpeta.</td></tr>`}</tbody>
    </table>`;
  return page(`Caja chica ${fund.description || fund.id}`, body);
}

// Recibo de un pago/gasto de caja chica (constancia de que se pago el servicio/gasto).
export const pettyReceiptFileName = (expense: any): string =>
  safeName(
    `Recibo ${expense.date || "s-f"} - ${expense.supplier || expense.description || "pago"} - ${Math.round(
      Number(expense.amount || 0)
    )}`
  ) + ".html";

export function buildPettyCashReceiptHtml(fund: any, expense: any): string {
  const body = `
    <h1>Recibo de pago</h1>
    <p class="sub">Caja: ${esc(fund.description || "-")} &middot; Responsable: ${esc(
    fund.responsible || "-"
  )} &middot; ${esc(fund.company)} &middot; ${esc(expense.date || "sin fecha")}</p>
    <div class="grid">
      <div class="card"><div class="k">Monto pagado</div><div class="v">${money(expense.amount)}</div></div>
      <div class="card"><div class="k">Administracion</div><div class="v">${
        expense.administration === "negro" ? "Negro" : "Blanco"
      }</div></div>
    </div>
    <table><tbody>
      <tr><td>Concepto</td><td>${esc(expense.category || "-")}</td></tr>
      <tr><td>Detalle</td><td>${esc(expense.description || "-")}</td></tr>
      <tr><td>Beneficiario / proveedor</td><td>${esc(expense.supplier || "-")}</td></tr>
      <tr><td>Comprobante</td><td>${esc(expense.invoiceNumber || "-")}</td></tr>
    </tbody></table>
    <p style="margin-top:20px">Se deja constancia del pago indicado, abonado desde la caja chica.</p>
    <p style="margin-top:32px">Firma: ______________________________</p>`;
  return page(`Recibo ${expense.date || ""} - ${fund.description || ""}`, body);
}

export function buildPettyCashSummaryHtml(
  expenses: any[],
  monthKey: string,
  fundName: (fundId: number | null) => string
): string {
  const rows = expenses
    .map(
      (e) =>
        `<tr><td>${esc(e.date || "-")}</td><td>${esc(fundName(e.fundId))}</td><td>${esc(
          e.category || "-"
        )}</td><td>${esc(e.description || "-")}</td><td class="num">${money(
          e.amount
        )}</td><td>${adminLabel(e.administration)}</td></tr>`
    )
    .join("");
  const total = expenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
  const body = `
    <h1>Resumen de caja chica</h1>
    <p class="sub">${monthLabelEs(monthKey)} &middot; ${expenses.length} gasto(s)</p>
    <table>
      <thead><tr><th>Fecha</th><th>Fondo</th><th>Categoria</th><th>Descripcion</th><th class="num">Monto</th><th>Adm.</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="tot"><td colspan="4">Total</td><td class="num">${money(total)}</td><td></td></tr></tfoot>
    </table>`;
  return page(`Resumen caja chica ${monthKey}`, body);
}

export function buildJobsSummaryHtml(jobs: any[], monthKey: string): string {
  const rows = jobs
    .map(
      (j) =>
        `<tr><td>${esc(j.budgetNumber)}</td><td>${esc(j.client)}</td><td>${esc(
          j.project
        )}</td><td class="num">${money(j.valueToCollect)}</td><td class="num">${money(
          j.collectedTotal
        )}</td><td class="num">${money(j.remainingToPay)}</td><td>${esc(
          j.executionStatus || "-"
        )}</td></tr>`
    )
    .join("");
  const toCollect = jobs.reduce((acc, j) => acc + Number(j.valueToCollect || 0), 0);
  const collected = jobs.reduce((acc, j) => acc + Number(j.collectedTotal || 0), 0);
  const pending = jobs.reduce((acc, j) => acc + Number(j.remainingToPay || 0), 0);
  const body = `
    <h1>Resumen de trabajos aprobados</h1>
    <p class="sub">${monthLabelEs(monthKey)} &middot; ${jobs.length} trabajo(s)</p>
    <table>
      <thead><tr><th>N&deg;</th><th>Cliente</th><th>Proyecto</th><th class="num">A cobrar</th><th class="num">Cobrado</th><th class="num">Saldo</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="tot"><td colspan="3">Total</td><td class="num">${money(
        toCollect
      )}</td><td class="num">${money(collected)}</td><td class="num">${money(pending)}</td><td></td></tr></tfoot>
    </table>`;
  return page(`Resumen trabajos ${monthKey}`, body);
}
