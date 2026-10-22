// FABRICACION · GANTT (Nicolas, 2026-10-22). Los trabajos aprobados que esperan asignacion, con sus
// cantidades por rubro (placas, modulos, cajones, puertas, iluminacion, laqueado...) sacadas de lo cotizado
// en el presupuesto. Por cada rubro se carga tarea, personas, horas y fechas; el Gantt muestra las barras y
// la carga del taller por dia contra la gente que hay. Abajo, la lista de rubros (editable). La logica vive
// en domain/ganttFabricacion.ts.
import React, { useMemo, useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import {
  cantidadDelRubro,
  cantidadesCotizadas,
  cargaPorDia,
  duracionDelRubro,
  estadoDelPlan,
  finSugerido,
  horasSugeridas,
  type CantidadCotizada,
  type OrigenRubro,
  type PlanFabricacion,
  type PlanRubro,
  type RubroFabricacion,
} from "../domain/ganttFabricacion";
import type { TipoTarea } from "../domain/organizacionDiaria";
import { mapaDeFeriados } from "../domain/feriadosArgentina";

export type TrabajoGantt = {
  id: number;
  company: string;
  budgetNumber: string;
  client: string;
  project: string;
  executionStatus: string;
  maxRequirementDate?: string;
  estimatedJobHours?: number;
  snapshot: unknown;
};

const pad = (n: number) => String(n).padStart(2, "0");
const aIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const ddmm = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toLocaleString("es-AR", { maximumFractionDigits: 2 }));
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "3px 5px", fontSize: 12.5, background: "#fff", boxSizing: "border-box" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11, color: "#64748b", fontWeight: 700, padding: "4px 5px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "3px 5px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, verticalAlign: "middle" };
const btn = (rojo = false): React.CSSProperties => ({
  border: `1px solid ${rojo ? "#fecaca" : "#cbd5e1"}`, background: "#fff", color: rojo ? "#b91c1c" : "#334155",
  borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
});
const COLORES = ["#0f766e", "#b45309", "#7c3aed", "#0369a1", "#be123c", "#4d7c0f", "#a16207", "#334155", "#c2410c"];

export function GanttFabricacion({
  trabajos,
  planes,
  rubros,
  tipos,
  cantidadEmpleados,
  feriados: feriadosProp,
  companyShort,
  onGuardarPlan,
  onGuardarRubro,
  onBorrarRubro,
  onAbrirTrabajo,
  nuevoId,
}: {
  trabajos: TrabajoGantt[];
  planes: PlanFabricacion[];
  rubros: RubroFabricacion[];
  tipos: TipoTarea[];
  cantidadEmpleados: number;
  feriados?: Set<string>;
  companyShort: (company: string) => string;
  onGuardarPlan: (p: PlanFabricacion) => void;
  onGuardarRubro: (r: RubroFabricacion) => void;
  onBorrarRubro: (id: number) => void;
  onAbrirTrabajo?: (jobId: number) => void;
  nuevoId: () => number;
}) {
  const [soloEspera, setSoloEspera] = useState(true);
  // Feriados nacionales del año pasado, este y el que viene (los dias habiles los saltean).
  const feriados = useMemo(() => {
    if (feriadosProp) return feriadosProp;
    const y = new Date().getFullYear();
    return new Set(Array.from(mapaDeFeriados([y - 1, y, y + 1]).keys()));
  }, [feriadosProp]);
  const [abierto, setAbierto] = useState<number | null>(null);
  const hoy = new Date();
  const lunes = new Date(hoy);
  lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  const [inicio, setInicio] = useState(aIso(lunes));
  const SEMANAS = 8;

  const activos = useMemo(() => [...rubros].filter((r) => r.activo !== false).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)), [rubros]);
  const filas = useMemo(
    () =>
      trabajos
        .filter((t) => t.executionStatus !== "finalizado")
        .map((t) => {
          const cot = cantidadesCotizadas(t, activos);
          const plan = planes.find((p) => p.jobId === t.id);
          return { t, cot, plan, estado: estadoDelPlan(cot, plan, activos) };
        })
        .sort((a, b) => (a.t.maxRequirementDate || "9999").localeCompare(b.t.maxRequirementDate || "9999") || a.t.budgetNumber.localeCompare(b.t.budgetNumber)),
    [trabajos, planes, activos]
  );
  const visibles = soloEspera ? filas.filter((f) => f.estado.espera) : filas;
  const enEspera = filas.filter((f) => f.estado.espera);
  // Lo que espera asignacion, sumado por rubro (para ver de un vistazo cuanto hay que hacer).
  const totales = activos.map((r) => ({
    r,
    total: enEspera.reduce((a, f) => a + cantidadDelRubro(f.plan?.rubros.find((x) => x.rubroId === r.id), f.cot[r.id]), 0),
  }));

  const planDe = (f: (typeof filas)[number]): PlanFabricacion => f.plan || { id: 0, company: f.t.company, jobId: f.t.id, rubros: [] };
  const guardarRubroDelPlan = (f: (typeof filas)[number], rubroId: number, patch: Partial<PlanRubro>) => {
    const p = planDe(f);
    const ya = p.rubros.some((x) => x.rubroId === rubroId);
    const rubrosPlan = ya ? p.rubros.map((x) => (x.rubroId === rubroId ? { ...x, ...patch } : x)) : [...p.rubros, { rubroId, ...patch }];
    onGuardarPlan({ ...p, id: p.id || nuevoId(), rubros: rubrosPlan });
  };

  // ---- Gantt ----
  const dias = useMemo(() => {
    const out: string[] = [];
    const d = new Date(`${inicio}T12:00:00`);
    for (let i = 0; i < SEMANAS * 7; i++, d.setDate(d.getDate() + 1)) out.push(aIso(d));
    return out;
  }, [inicio]);
  const mover = (semanas: number) => {
    const d = new Date(`${inicio}T12:00:00`);
    d.setDate(d.getDate() + semanas * 7);
    setInicio(aIso(d));
  };
  const carga = useMemo(() => cargaPorDia(planes.filter((p) => filas.some((f) => f.t.id === p.jobId)), feriados), [planes, filas, feriados]);
  const conBarras = filas.filter((f) => f.plan?.rubros.some((r) => r.desde));
  const ANCHO = 18;
  const indice = (iso: string) => dias.indexOf(iso);
  const barra = (desde: string, hasta: string) => {
    const a = desde < dias[0] ? 0 : indice(desde);
    const b = hasta > dias[dias.length - 1] ? dias.length - 1 : indice(hasta);
    if (a < 0 || b < 0 || hasta < dias[0] || desde > dias[dias.length - 1]) return null;
    return { left: a * ANCHO, width: (b - a + 1) * ANCHO };
  };

  return (
    <>
      <Panel span="full" title="Gantt de fabricación" abierto>
        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
          Las cantidades salen solas de los materiales cotizados en el presupuesto (cada rubro busca sus palabras clave, abajo). Si no coinciden con lo real, se pisan a mano en el plan del trabajo. Las horas son horas-hombre; los días se calculan con jornadas de 9 h de lunes a viernes.
        </div>

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {totales.map(({ r, total }) => (
            <div key={r.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "5px 10px", background: total ? "#fff7ed" : "#f8fafc", minWidth: 110 }}>
              <div style={{ fontSize: 10.5, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>{r.nombre}</div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{fmt(total)} <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>{r.unidad}</span></div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
          <strong>{enEspera.length} trabajo(s) esperando asignación · {filas.length} sin terminar</strong>
          <label style={{ fontSize: 12.5, display: "inline-flex", gap: 5, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={soloEspera} onChange={(e) => setSoloEspera(e.target.checked)} /> Solo los que esperan asignación
          </label>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Trabajo</th>
                <th style={th}>Entrega</th>
                {activos.map((r) => <th key={r.id} style={{ ...th, textAlign: "right" }} title={r.nombre}>{r.nombre}</th>)}
                <th style={th}>Asignado</th>
                <th style={{ ...th, textAlign: "right" }}>Horas plan / presup.</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {visibles.length === 0 && (
                <tr><td style={{ ...td, color: "#94a3b8" }} colSpan={activos.length + 5}>{soloEspera ? "No hay trabajos esperando asignación." : "No hay trabajos sin terminar."}</td></tr>
              )}
              {visibles.map((f) => {
                const open = abierto === f.t.id;
                return (
                  <React.Fragment key={f.t.id}>
                    <tr style={{ background: open ? "#f1f5f9" : undefined, cursor: "pointer" }} onClick={() => setAbierto(open ? null : f.t.id)}>
                      <td style={td}>
                        <strong>{f.t.budgetNumber}</strong> · {f.t.client}
                        <div style={{ fontSize: 11, color: "#64748b" }}>{[f.t.project, companyShort(f.t.company)].filter(Boolean).join(" · ")}</div>
                      </td>
                      <td style={{ ...td, whiteSpace: "nowrap" }}>{ddmm(f.t.maxRequirementDate) || "—"}</td>
                      {activos.map((r) => {
                        const p = f.plan?.rubros.find((x) => x.rubroId === r.id);
                        const c = cantidadDelRubro(p, f.cot[r.id]);
                        return (
                          <td key={r.id} style={{ ...td, textAlign: "right", color: c ? (p?.desde ? "#166534" : "#0f172a") : "#cbd5e1", fontWeight: c ? 700 : 400 }}>
                            {c ? fmt(c) : "·"}
                          </td>
                        );
                      })}
                      <td style={{ ...td, whiteSpace: "nowrap", color: f.estado.espera ? "#b45309" : "#166534", fontWeight: 700 }}>
                        {f.estado.conCantidad ? `${f.estado.asignados}/${f.estado.conCantidad}` : "sin cantidades"}
                      </td>
                      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                        {fmt(f.estado.horas)} / {fmt(Math.round((f.t.estimatedJobHours || 0) * 100) / 100)}
                      </td>
                      <td style={{ ...td, textAlign: "right" }}>
                        <button type="button" style={btn()} onClick={(e) => { e.stopPropagation(); setAbierto(open ? null : f.t.id); }}>{open ? "Cerrar" : "Planificar"}</button>
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={activos.length + 5} style={{ padding: "6px 8px 12px", background: "#f8fafc" }}>
                          <PlanDelTrabajo
                            fila={f}
                            rubros={activos}
                            tipos={tipos}
                            feriados={feriados}
                            onCambiar={(rubroId, patch) => guardarRubroDelPlan(f, rubroId, patch)}
                            onNotas={(notas) => { const p = planDe(f); onGuardarPlan({ ...p, id: p.id || nuevoId(), notas }); }}
                            onAbrirTrabajo={onAbrirTrabajo}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel
        span="full"
        title="Gantt · quién hace qué y cuándo"
        actions={
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" style={btn()} onClick={() => mover(-4)}>◀</button>
            <button type="button" style={btn()} onClick={() => setInicio(aIso(lunes))}>Hoy</button>
            <button type="button" style={btn()} onClick={() => mover(4)}>▶</button>
          </span>
        }
      >
        {conBarras.length === 0 ? (
          <div style={{ fontSize: 13, color: "#64748b" }}>Todavía no hay rubros con fecha. Planificá un trabajo arriba (desde, personas y horas) y aparece acá.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <div style={{ display: "grid", gridTemplateColumns: `230px ${dias.length * ANCHO}px`, fontSize: 11.5 }}>
              <div />
              <div style={{ display: "flex" }}>
                {dias.map((d) => {
                  const dow = new Date(`${d}T12:00:00`).getDay();
                  return (
                    <div key={d} style={{ width: ANCHO, textAlign: "center", color: dow === 1 ? "#0f172a" : "#94a3b8", fontWeight: dow === 1 ? 700 : 400, fontSize: 9.5 }}>
                      {dow === 1 ? ddmm(d) : ""}
                    </div>
                  );
                })}
              </div>
              <div style={{ fontWeight: 700, color: "#475569", padding: "2px 0" }}>Gente en el taller (de {cantidadEmpleados})</div>
              <div style={{ display: "flex" }}>
                {dias.map((d) => {
                  const n = carga.get(d) || 0;
                  const pasa = n > cantidadEmpleados;
                  const finde = [0, 6].includes(new Date(`${d}T12:00:00`).getDay()) || feriados?.has(d);
                  return (
                    <div
                      key={d}
                      title={`${ddmm(d)}: ${n} persona(s)`}
                      style={{ width: ANCHO, height: 18, textAlign: "center", lineHeight: "18px", fontSize: 10, fontWeight: 700, background: finde ? "#f1f5f9" : pasa ? "#fecaca" : n ? "#dcfce7" : "#fff", color: pasa ? "#b91c1c" : "#166534", borderRight: "1px solid #f1f5f9" }}
                    >
                      {n || ""}
                    </div>
                  );
                })}
              </div>
              {conBarras.map((f) => (
                <React.Fragment key={f.t.id}>
                  <div style={{ fontWeight: 800, padding: "6px 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.t.budgetNumber} · {f.t.client}</div>
                  <div style={{ position: "relative", borderBottom: "1px solid #e2e8f0" }}>
                    {f.t.maxRequirementDate && indice(f.t.maxRequirementDate) >= 0 && (
                      <div title={`Entrega ${ddmm(f.t.maxRequirementDate)}`} style={{ position: "absolute", left: indice(f.t.maxRequirementDate) * ANCHO + ANCHO / 2, top: 0, bottom: 0, borderLeft: "2px dashed #b91c1c" }} />
                    )}
                  </div>
                  {activos.map((r, i) => {
                    const p = f.plan?.rubros.find((x) => x.rubroId === r.id);
                    if (!p?.desde) return null;
                    const hasta = p.hasta || finSugerido(p, feriados) || p.desde;
                    const b = barra(p.desde, hasta);
                    return (
                      <React.Fragment key={r.id}>
                        <div style={{ paddingLeft: 10, color: "#475569", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", height: 18 }}>
                          {r.nombre} · {p.personas || 0} p · {fmt(p.horas || 0)} h
                        </div>
                        <div style={{ position: "relative", height: 18, backgroundImage: `repeating-linear-gradient(90deg, transparent 0 ${ANCHO - 1}px, #f1f5f9 ${ANCHO - 1}px ${ANCHO}px)` }}>
                          {b && (
                            <div
                              title={`${r.nombre}: ${ddmm(p.desde)} a ${ddmm(hasta)} · ${p.personas || 0} persona(s) · ${fmt(p.horas || 0)} h${p.tarea ? ` · ${p.tarea}` : ""}`}
                              style={{ position: "absolute", left: b.left, width: b.width, top: 3, height: 12, borderRadius: 3, background: COLORES[i % COLORES.length], opacity: p.hecho ? 0.35 : 0.9 }}
                            />
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 6 }}>
              Arriba, cuántas personas hay asignadas cada día: en rojo cuando se pasa de la gente que hay. La línea punteada roja es la fecha de entrega del trabajo.
            </div>
          </div>
        )}
      </Panel>

      <ListaDeRubros rubros={rubros} tipos={tipos} onGuardar={onGuardarRubro} onBorrar={onBorrarRubro} nuevoId={nuevoId} />
    </>
  );
}

// ---- El plan de un trabajo: rubro por rubro -------------------------------------------------------
function PlanDelTrabajo({
  fila,
  rubros,
  tipos,
  feriados,
  onCambiar,
  onNotas,
  onAbrirTrabajo,
}: {
  fila: { t: TrabajoGantt; cot: Record<number, CantidadCotizada>; plan?: PlanFabricacion };
  rubros: RubroFabricacion[];
  tipos: TipoTarea[];
  feriados?: Set<string>;
  onCambiar: (rubroId: number, patch: Partial<PlanRubro>) => void;
  onNotas: (notas: string) => void;
  onAbrirTrabajo?: (jobId: number) => void;
}) {
  const num = (v: string) => (v === "" ? undefined : Number(v));
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <strong>Plan de {fila.t.budgetNumber}</strong>
        {onAbrirTrabajo && <button type="button" style={btn()} onClick={() => onAbrirTrabajo(fila.t.id)}>Abrir el trabajo (y su presupuesto)</button>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
        <thead>
          <tr>
            <th style={th}>Rubro</th>
            <th style={{ ...th, textAlign: "right" }}>Cotizado</th>
            <th style={th}>Cantidad real</th>
            <th style={th}>Tipo de tarea</th>
            <th style={th}>Personas</th>
            <th style={th}>Horas</th>
            <th style={th}>Desde</th>
            <th style={th}>Hasta</th>
            <th style={th}>Hecho</th>
          </tr>
        </thead>
        <tbody>
          {rubros.map((r) => {
            const p: PlanRubro = fila.plan?.rubros.find((x) => x.rubroId === r.id) || { rubroId: r.id };
            const c = fila.cot[r.id];
            const cant = cantidadDelRubro(p, c);
            const tipoId = p.tipoTareaId ?? r.tipoTareaId ?? null;
            const tipo = tipos.find((x) => x.id === tipoId);
            const sug = horasSugeridas(cant, tipo?.horasEstimadas);
            const fin = finSugerido({ ...p, horas: p.horas ?? sug }, feriados);
            const diasH = duracionDelRubro(p.horas ?? sug, p.personas || 1);
            return (
              <tr key={r.id} style={{ opacity: cant || p.horas ? 1 : 0.55 }}>
                <td style={{ ...td, fontWeight: 700 }}>{r.nombre} <span style={{ fontWeight: 400, color: "#94a3b8" }}>({r.unidad})</span></td>
                <td
                  style={{ ...td, textAlign: "right", color: "#475569", cursor: c?.detalle.length ? "help" : undefined }}
                  title={c?.detalle.length ? c.detalle.map((d) => `${fmt(d.cantidad)} ${d.unidad} · ${d.descripcion}`).join("\n") : r.origen === "manual" ? "Se carga a mano" : "Nada cotizado con esas palabras"}
                >
                  {r.origen === "manual" ? "a mano" : fmt(c?.cantidad || 0)}
                </td>
                <td style={td}>
                  <input style={{ ...input, width: 70 }} type="number" min="0" step="any" placeholder={fmt(c?.cantidad || 0)} value={p.cantidad ?? ""} onChange={(e) => onCambiar(r.id, { cantidad: num(e.target.value) })} />
                </td>
                <td style={td}>
                  <select style={{ ...input, maxWidth: 170 }} value={tipoId ?? ""} onChange={(e) => onCambiar(r.id, { tipoTareaId: e.target.value ? Number(e.target.value) : null })}>
                    <option value="">—</option>
                    {tipos.filter((x) => x.activa !== false).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                  </select>
                  <input style={{ ...input, width: 140, marginLeft: 4 }} placeholder="detalle" value={p.tarea || ""} onChange={(e) => onCambiar(r.id, { tarea: e.target.value })} />
                </td>
                <td style={td}>
                  <input style={{ ...input, width: 52 }} type="number" min="0" step="1" value={p.personas ?? ""} onChange={(e) => onCambiar(r.id, { personas: num(e.target.value) })} />
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <input style={{ ...input, width: 64 }} type="number" min="0" step="0.5" placeholder={sug ? fmt(sug) : ""} value={p.horas ?? ""} onChange={(e) => onCambiar(r.id, { horas: num(e.target.value) })} />
                  {p.horas == null && sug > 0 && <button type="button" style={{ ...btn(), marginLeft: 3 }} title={`${fmt(cant)} x ${tipo?.horasEstimadas} h estándar`} onClick={() => onCambiar(r.id, { horas: sug })}>usar {fmt(sug)}</button>}
                  {diasH > 0 && <div style={{ fontSize: 10.5, color: "#64748b" }}>{diasH} día(s) hábil(es)</div>}
                </td>
                <td style={td}><input style={input} type="date" value={p.desde || ""} onChange={(e) => onCambiar(r.id, { desde: e.target.value || undefined })} /></td>
                <td style={td}>
                  <input style={input} type="date" value={p.hasta || ""} onChange={(e) => onCambiar(r.id, { hasta: e.target.value || undefined })} />
                  {!p.hasta && fin && <div style={{ fontSize: 10.5, color: "#64748b" }}>sugerido {ddmm(fin)}</div>}
                </td>
                <td style={{ ...td, textAlign: "center" }}>
                  <input type="checkbox" checked={!!p.hecho} onChange={(e) => onCambiar(r.id, { hecho: e.target.checked })} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600, marginTop: 8 }}>
        Notas del plan
        <input style={{ ...input, width: "100%" }} value={fila.plan?.notas || ""} onChange={(e) => onNotas(e.target.value)} />
      </label>
      <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
        Las horas sugeridas salen de la cantidad x las horas estándar del tipo de tarea (catálogo de Organización diaria). Pasá el mouse por "Cotizado" para ver qué materiales del presupuesto se contaron.
      </div>
    </div>
  );
}

// ---- Lista de rubros (editable) --------------------------------------------------------------------
function ListaDeRubros({
  rubros,
  tipos,
  onGuardar,
  onBorrar,
  nuevoId,
}: {
  rubros: RubroFabricacion[];
  tipos: TipoTarea[];
  onGuardar: (r: RubroFabricacion) => void;
  onBorrar: (id: number) => void;
  nuevoId: () => number;
}) {
  const lista = [...rubros].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  const palabras = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return (
    <Panel span="full" title="Rubros del Gantt (cantidades)">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Cada rubro cuenta una cantidad del presupuesto. "Materiales" suma los materiales cotizados cuya descripción tenga alguna de las palabras (y ninguna de las que excluyen); "Subpresupuestos" cuenta las unidades de cada bloque; "A mano" se carga en el plan.
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={th}>Orden</th>
            <th style={th}>Rubro</th>
            <th style={th}>Unidad</th>
            <th style={th}>De dónde sale</th>
            <th style={th}>Palabras (separadas por coma)</th>
            <th style={th}>Excluir</th>
            <th style={th}>Tarea habitual</th>
            <th style={th}></th>
          </tr>
        </thead>
        <tbody>
          {lista.map((r) => (
            <tr key={r.id} style={{ opacity: r.activo === false ? 0.5 : 1 }}>
              <td style={td}><input style={{ ...input, width: 44 }} type="number" value={r.orden ?? ""} onChange={(e) => onGuardar({ ...r, orden: Number(e.target.value) || 0 })} /></td>
              <td style={td}><input style={{ ...input, width: 170 }} value={r.nombre} onChange={(e) => onGuardar({ ...r, nombre: e.target.value })} /></td>
              <td style={td}><input style={{ ...input, width: 60 }} value={r.unidad} onChange={(e) => onGuardar({ ...r, unidad: e.target.value })} /></td>
              <td style={td}>
                <select style={input} value={r.origen} onChange={(e) => onGuardar({ ...r, origen: e.target.value as OrigenRubro })}>
                  <option value="materiales">Materiales</option>
                  <option value="bloques">Subpresupuestos</option>
                  <option value="manual">A mano</option>
                </select>
              </td>
              <td style={td}>
                <input style={{ ...input, width: "100%" }} disabled={r.origen !== "materiales"} defaultValue={r.palabras.join(", ")} key={`p${r.id}${r.palabras.join()}`} onBlur={(e) => onGuardar({ ...r, palabras: palabras(e.target.value) })} />
              </td>
              <td style={td}>
                <input style={{ ...input, width: "100%" }} disabled={r.origen !== "materiales"} defaultValue={(r.excluir || []).join(", ")} key={`x${r.id}${(r.excluir || []).join()}`} onBlur={(e) => onGuardar({ ...r, excluir: palabras(e.target.value) })} />
              </td>
              <td style={td}>
                <select style={{ ...input, maxWidth: 160 }} value={r.tipoTareaId ?? ""} onChange={(e) => onGuardar({ ...r, tipoTareaId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </td>
              <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                <button type="button" style={btn()} onClick={() => onGuardar({ ...r, activo: r.activo === false })}>{r.activo === false ? "Activar" : "Pausar"}</button>{" "}
                <button type="button" style={btn(true)} onClick={() => window.confirm(`¿Borrar el rubro "${r.nombre}"?`) && onBorrar(r.id)}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginTop: 8 }}>
        <ButtonLike onClick={() => onGuardar({ id: nuevoId(), nombre: "Rubro nuevo", unidad: "u", origen: "manual", palabras: [], orden: lista.length + 1, activo: true })}>+ Rubro</ButtonLike>
      </div>
    </Panel>
  );
}
