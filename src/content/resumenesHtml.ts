// RESUMENES DE LAS SOLAPAS NUEVAS PARA LA CARPETA (Nicolas, 02/11/2026: "se realizaron solapas nuevas. Estas nuevas solapas
// tienen su forma de guardarse? Estamos haciendo el cierre y cada cosa debe tener su lugar para guardar"). Seguros, inversiones,
// deudas, movimientos internos, cuentas, pagos programados, inventario, fabricacion y clientes: una planilla HTML por empresa y
// periodo (el mes en "Exportar TODO", el ejercicio entero en el cierre). Mismo molde visual que el resto (exportHtml.ts).
import { money } from "../lib/format";
import { escHtml as esc, paginaHtml as page } from "./exportHtml";

export type Columna<T> = { titulo: string; valor: (x: T) => unknown; num?: boolean; dinero?: boolean };
export type Seccion<T = any> = { titulo: string; filas: T[]; columnas: Columna<T>[]; vacio?: string; total?: { titulo: string; valor: number } };

const fecha = (iso?: string) => (iso ? `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}/${String(iso).slice(0, 4)}` : "—");
const celda = <T,>(c: Columna<T>, x: T) => {
  const v = c.valor(x);
  const txt = c.dinero ? money(Number(v || 0)) : v == null || v === "" ? "—" : String(v);
  return `<td${c.num || c.dinero ? ' class="num"' : ""}>${esc(txt)}</td>`;
};

export function buildPlanillaHtml(input: { titulo: string; subtitulo: string; tarjetas?: Array<{ k: string; v: string }>; secciones: Seccion[] }): string {
  const tarjetas = input.tarjetas?.length
    ? `<div class="grid">${input.tarjetas.map((t) => `<div class="card"><div class="k">${esc(t.k)}</div><div class="v">${esc(t.v)}</div></div>`).join("")}</div>`
    : "";
  const secciones = input.secciones
    .map((s) => {
      const cab = s.columnas.map((c) => `<th${c.num || c.dinero ? ' class="num"' : ""}>${esc(c.titulo)}</th>`).join("");
      const filas = s.filas.length
        ? s.filas.map((x) => `<tr>${s.columnas.map((c) => celda(c, x)).join("")}</tr>`).join("")
        : `<tr><td colspan="${s.columnas.length}">${esc(s.vacio || "Nada en el período.")}</td></tr>`;
      const total = s.total ? `<tr class="tot"><td colspan="${s.columnas.length - 1}">${esc(s.total.titulo)}</td><td class="num">${esc(money(s.total.valor))}</td></tr>` : "";
      return `<div class="blk"><h2>${esc(s.titulo)} (${s.filas.length})</h2><table><thead><tr>${cab}</tr></thead><tbody>${filas}${total}</tbody></table></div>`;
    })
    .join("");
  return page(input.titulo, `<h1>${esc(input.titulo)}</h1><p class="sub">${esc(input.subtitulo)}</p>${tarjetas}${secciones}`);
}

// Un periodo [desde, hasta] (yyyy-mm-dd, incluidos) y la etiqueta que se muestra.
export type Periodo = { desde: string; hasta: string; etiqueta: string };
const enPeriodo = (iso: string | undefined, p: Periodo) => !!iso && iso.slice(0, 10) >= p.desde && iso.slice(0, 10) <= p.hasta;
const sub = (empresa: string, p: Periodo) => `${empresa} · ${p.etiqueta}`;

export function resumenSeguros(seguros: any[], empresa: string, p: Periodo): string {
  const activos = seguros.filter((s) => s.estado !== "baja");
  return buildPlanillaHtml({
    titulo: "Seguros",
    subtitulo: sub(empresa, p),
    tarjetas: [{ k: "Costo mensual (activos)", v: money(activos.reduce((a, s) => a + Number(s.costoMensual || 0), 0)) }],
    secciones: [
      {
        titulo: "Pólizas",
        filas: seguros,
        columnas: [
          { titulo: "Tipo", valor: (s) => s.tipo },
          { titulo: "Detalle", valor: (s) => s.descripcion },
          { titulo: "Aseguradora", valor: (s) => s.aseguradora },
          { titulo: "Póliza", valor: (s) => s.numeroPoliza },
          { titulo: "Desde", valor: (s) => fecha(s.vigenciaDesde) },
          { titulo: "Hasta", valor: (s) => fecha(s.vigenciaHasta) },
          { titulo: "Estado", valor: (s) => (s.estado === "baja" ? "Baja" : "Activo") },
          { titulo: "Mensual", valor: (s) => s.costoMensual, dinero: true },
        ],
      },
    ],
  });
}

export function resumenInversiones(inversiones: any[], empresa: string, p: Periodo): string {
  return buildPlanillaHtml({
    titulo: "Inversiones",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Inversiones",
        filas: inversiones,
        columnas: [
          { titulo: "Tipo", valor: (i) => i.tipo },
          { titulo: "Detalle", valor: (i) => i.descripcion },
          { titulo: "Moneda", valor: (i) => i.moneda },
          { titulo: "Inicio", valor: (i) => fecha(i.fechaInicio) },
          { titulo: "Fin", valor: (i) => fecha(i.fechaFin) },
          { titulo: "Estado", valor: (i) => (i.estado === "cerrada" ? "Cerrada" : "Activa") },
          { titulo: "Invertido", valor: (i) => i.montoInvertido, dinero: true },
          { titulo: "Valor actual", valor: (i) => i.valorActual, dinero: true },
        ],
      },
    ],
  });
}

export function resumenDeudas(deudas: any[], empresa: string, p: Periodo): string {
  const cuotas = deudas.flatMap((d) => (d.cuotas || []).filter((c: any) => enPeriodo(c.fecha, p)).map((c: any) => ({ ...c, deuda: d.acreedor || d.concept })));
  return buildPlanillaHtml({
    titulo: "Desendeudamiento",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Deudas",
        filas: deudas,
        columnas: [
          { titulo: "Acreedor / concepto", valor: (d) => d.acreedor || d.concept },
          { titulo: "Tipo", valor: (d) => d.tipo },
          { titulo: "Inicio", valor: (d) => fecha(d.fechaInicio) },
          { titulo: "Cuotas que faltan", valor: (d) => d.remainingInstallments, num: true },
          { titulo: "Próximo vencimiento", valor: (d) => fecha(d.nextDueDate) },
          { titulo: "Estado", valor: (d) => (d.active === false ? "Cancelada" : "Activa") },
          { titulo: "Capital", valor: (d) => d.capital, dinero: true },
        ],
      },
      {
        titulo: "Cuotas del período",
        filas: cuotas,
        columnas: [
          { titulo: "Deuda", valor: (c) => c.deuda },
          { titulo: "Cuota", valor: (c) => c.numero, num: true },
          { titulo: "Vence", valor: (c) => fecha(c.fecha) },
          { titulo: "Estado", valor: (c) => (c.pagoCostEntryId ? "Pagada" : c.estado || "Pendiente") },
          { titulo: "Monto", valor: (c) => c.monto, dinero: true },
        ],
        total: { titulo: "Total", valor: cuotas.reduce((a: number, c: any) => a + Number(c.monto || 0), 0) },
      },
    ],
  });
}

export function resumenMovimientosInternos(
  d: { pases: any[]; efectivo: any[]; capital: any[]; gente: any[]; retiros: any[] },
  empresa: string,
  p: Periodo
): string {
  const del = <T extends { date?: string; fecha?: string }>(l: T[]) => l.filter((x) => enPeriodo(x.date || x.fecha, p));
  const bn = (x: any) => (x.color || x.administration) === "negro" ? "Negro" : "Blanco";
  return buildPlanillaHtml({
    titulo: "Movimientos internos",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Pases entre cuentas",
        filas: del(d.pases),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.date) },
          { titulo: "Sentido", valor: (x) => String(x.direction || "").replace(/_/g, " ") },
          { titulo: "Cuenta", valor: (x) => x.bank },
          { titulo: "Detalle", valor: (x) => x.description },
          { titulo: "B/N", valor: bn },
          { titulo: "Monto", valor: (x) => x.amount, dinero: true },
        ],
      },
      {
        titulo: "Efectivo",
        filas: del(d.efectivo),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.date) },
          { titulo: "Entra / sale", valor: (x) => (x.kind === "egreso" ? "Sale" : "Entra") },
          { titulo: "Detalle", valor: (x) => x.description },
          { titulo: "B/N", valor: bn },
          { titulo: "Monto", valor: (x) => x.amount, dinero: true },
        ],
      },
      {
        titulo: "Aportes y préstamos",
        filas: del(d.capital),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.date) },
          { titulo: "De quién", valor: (x) => x.origin },
          { titulo: "Tipo", valor: (x) => (x.kind === "prestamo" ? "Préstamo" : "Aporte") },
          { titulo: "Sentido", valor: (x) => (x.direction === "devuelto" ? "Se devolvió" : "Entró") },
          { titulo: "B/N", valor: bn },
          { titulo: "Monto", valor: (x) => x.amount, dinero: true },
        ],
      },
      {
        titulo: "Cuenta con la gente",
        filas: del(d.gente),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.date) },
          { titulo: "Persona", valor: (x) => x.person },
          { titulo: "Debe / haber", valor: (x) => x.kind },
          { titulo: "Detalle", valor: (x) => x.description },
          { titulo: "B/N", valor: bn },
          { titulo: "Monto", valor: (x) => x.amount, dinero: true },
        ],
      },
      {
        titulo: "Retiros de socios",
        filas: del(d.retiros),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.fecha) },
          { titulo: "Socio", valor: (x) => x.socio },
          { titulo: "Motivo", valor: (x) => x.motivo },
          { titulo: "B/N", valor: bn },
          { titulo: "Monto", valor: (x) => x.monto, dinero: true },
        ],
      },
    ],
  });
}

export function resumenCuentas(saldos: any[], empresa: string, p: Periodo): string {
  return buildPlanillaHtml({
    titulo: "Cuentas y saldos",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Cuentas",
        filas: saldos,
        columnas: [
          { titulo: "Cuenta", valor: (c) => c.nombre },
          { titulo: "Tipo", valor: (c) => c.tipo },
          { titulo: "Moneda", valor: (c) => c.moneda },
          { titulo: "Apertura", valor: (c) => fecha(c.fechaApertura) },
          { titulo: "Saldo de apertura", valor: (c) => c.saldoApertura, dinero: true },
          { titulo: "Movimientos", valor: (c) => c.movimientos, num: true },
          { titulo: "Saldo", valor: (c) => c.saldo, dinero: true },
        ],
      },
    ],
  });
}

export function resumenPagosProgramados(items: any[], empresa: string, p: Periodo): string {
  const del = items.filter((x) => enPeriodo(x.fechaConfirmada || x.fechaLimite, p));
  return buildPlanillaHtml({
    titulo: "Pagos programados",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Pagos",
        filas: del.sort((a, b) => String(a.fechaConfirmada || a.fechaLimite).localeCompare(String(b.fechaConfirmada || b.fechaLimite))),
        columnas: [
          { titulo: "Fecha", valor: (x) => fecha(x.fechaConfirmada || x.fechaLimite) },
          { titulo: "Qué", valor: (x) => x.titulo },
          { titulo: "Detalle", valor: (x) => x.detalle },
          { titulo: "Moneda", valor: (x) => x.currency },
          { titulo: "Monto", valor: (x) => x.monto, dinero: true },
        ],
      },
    ],
  });
}

export function resumenInventario(items: any[], empresa: string, p: Periodo): string {
  const generales = items.filter((it) => (it.kind || "general") === "general" && it.active !== false);
  const valor = generales.reduce((a, it) => a + Number(it.quantity || 0) * Number(it.unitPrice || 0), 0);
  return buildPlanillaHtml({
    titulo: "Inventario de stock",
    subtitulo: sub(empresa, p),
    tarjetas: [{ k: "Valor del inventario", v: money(valor) }],
    secciones: [
      {
        titulo: "Artículos",
        filas: generales.sort((a, b) => String(a.group).localeCompare(String(b.group)) || String(a.code).localeCompare(String(b.code))),
        columnas: [
          { titulo: "Código", valor: (it) => it.code },
          { titulo: "Descripción", valor: (it) => it.description },
          { titulo: "Grupo", valor: (it) => it.group },
          { titulo: "Ubicación", valor: (it) => it.location },
          { titulo: "Cantidad", valor: (it) => `${Number(it.quantity || 0)} ${it.unit || ""}`, num: true },
          { titulo: "Precio", valor: (it) => it.unitPrice, dinero: true },
          { titulo: "Valor", valor: (it) => Number(it.quantity || 0) * Number(it.unitPrice || 0), dinero: true },
        ],
        total: { titulo: "Total", valor },
      },
    ],
  });
}

export function resumenFabricacion(d: { dias: any[]; retrabajos: any[]; nombreTrabajo: (id: number) => string }, empresa: string, p: Periodo): string {
  const tareas = d.dias.filter((a) => enPeriodo(a.fecha, p)).flatMap((a) => (a.tareas || []).map((t: any) => ({ ...t, fecha: a.fecha, empleado: a.empleado, lugar: a.lugar })));
  const retrabajos = d.retrabajos.filter((r) => enPeriodo(r.fecha, p));
  return buildPlanillaHtml({
    titulo: "Fabricación",
    subtitulo: sub(empresa, p),
    secciones: [
      {
        titulo: "Organización diaria",
        filas: tareas.sort((a, b) => String(a.fecha + a.empleado + a.desde).localeCompare(String(b.fecha + b.empleado + b.desde))),
        columnas: [
          { titulo: "Día", valor: (t) => fecha(t.fecha) },
          { titulo: "Persona", valor: (t) => t.empleado },
          { titulo: "Horario", valor: (t) => `${t.desde || ""}–${t.hasta || ""}` },
          { titulo: "Tarea", valor: (t) => t.descripcion },
          { titulo: "Trabajo", valor: (t) => (t.jobId ? d.nombreTrabajo(t.jobId) : "") },
          { titulo: "Hecha", valor: (t) => (t.hecha ? "Sí" : "No") },
        ],
      },
      {
        titulo: "Retrabajos",
        filas: retrabajos,
        columnas: [
          { titulo: "Fecha", valor: (r) => fecha(r.fecha) },
          { titulo: "Trabajo", valor: (r) => d.nombreTrabajo(r.jobId) },
          { titulo: "Qué", valor: (r) => r.descripcion || r.motivo },
          { titulo: "%", valor: (r) => r.porcentaje, num: true },
          { titulo: "Horas", valor: (r) => r.horasTarea, num: true },
          { titulo: "Materiales", valor: (r) => r.materiales, dinero: true },
        ],
      },
    ],
  });
}

// Los catalogos de Fabricacion (no tienen fecha: van sin ejercicio ni mes, como el legajo).
export function resumenCatalogosFabricacion(d: { tareas: any[]; tiposMueble: any[]; categorias: any[]; rutinas: any[]; maquinas: any[] }, hoy: string): string {
  return buildPlanillaHtml({
    titulo: "Fabricación · catálogos",
    subtitulo: `Al ${fecha(hoy)}`,
    secciones: [
      { titulo: "Tareas", filas: d.tareas, columnas: [{ titulo: "Tarea", valor: (g) => g.nombre }, { titulo: "Descripción", valor: (g) => g.descripcion }, { titulo: "Insumos", valor: (g) => (g.insumos || []).map((i: any) => `${i.nombre} ${i.cantidad} ${i.unidad || ""}`).join(", ") }] },
      { titulo: "Tipos de mueble o trabajo", filas: d.tiposMueble, columnas: [{ titulo: "Tipo", valor: (t) => t.nombre }, { titulo: "Tareas", valor: (t) => (t.receta || []).length, num: true }, { titulo: "Materiales", valor: (t) => (t.materiales || []).length, num: true }, { titulo: "Personas", valor: (t) => t.personas, num: true }] },
      { titulo: "Categorías internas", filas: d.categorias, columnas: [{ titulo: "Categoría", valor: (c) => c.nombre }, { titulo: "Escalón", valor: (c) => (c.extra ? "extra" : c.nivel) }, { titulo: "Rumbo", valor: (c) => c.area }, { titulo: "Gremio", valor: (c) => c.categoriaGremio }, { titulo: "Tareas", valor: (c) => (c.tareaIds || []).length, num: true }] },
      { titulo: "Rutinas de mantenimiento, orden y limpieza", filas: d.rutinas, columnas: [{ titulo: "Rutina", valor: (r) => r.nombre }, { titulo: "Frecuencia", valor: (r) => r.frecuencia }, { titulo: "Horas", valor: (r) => r.horas, num: true }, { titulo: "Personas", valor: (r) => r.personas || 1, num: true }, { titulo: "Grupo de costos", valor: (r) => r.grupoCosto }] },
      { titulo: "Máquinas y herramientas", filas: d.maquinas, columnas: [{ titulo: "Máquina", valor: (m) => m.description }, { titulo: "Grupo", valor: (m) => m.group }, { titulo: "Estado", valor: (m) => m.estado || "operativa" }, { titulo: "Preventivos", valor: (m) => m.planes, num: true }, { titulo: "Registros", valor: (m) => m.historial, num: true }] },
    ],
  });
}

export function resumenClientes(clientes: any[], empresa: string, hoy: string): string {
  return buildPlanillaHtml({
    titulo: "Clientes",
    subtitulo: `${empresa} · al ${fecha(hoy)}`,
    secciones: [
      {
        titulo: "Clientes",
        filas: clientes.slice().sort((a, b) => String(a.name).localeCompare(String(b.name))),
        columnas: [
          { titulo: "Cliente", valor: (c) => c.name },
          { titulo: "CUIT", valor: (c) => c.taxId },
          { titulo: "Contacto", valor: (c) => c.contactName },
          { titulo: "Teléfono", valor: (c) => c.contactPhone },
          { titulo: "Mail", valor: (c) => c.contactEmail },
          { titulo: "Dirección", valor: (c) => c.direccion },
          { titulo: "Empresa", valor: (c) => (c.company === "General" ? "Ambas (compartido)" : c.company) },
        ],
      },
    ],
  });
}
