// FABRICACION · CRONOGRAMA AUTOMATICO (fases 4 y 5, Nicolas 2026-10-26). Los trabajos aprobados con sus muebles cargados
// se reparten entre la gente de De Raiz (los mejores, lo mas rapido) en el calendario del taller; cada uno dice cuando
// termina y si llega a la entrega con su holgura. Los presupuestos viejos se "reabren" aca: se les cargan los muebles
// sin tocar su precio. Lo que no tiene muebles sigue como siempre (Gantt por rubros). Calculo: domain/cronograma.ts.
import React, { useMemo, useState } from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
import type { RubroFabricacion } from "../domain/ganttFabricacion";
import type { AsignacionDiaria, TipoTarea } from "../domain/organizacionDiaria";
import type { TipoMueble } from "../domain/tiposMueble";
import type { MaquinaDelTaller, MuebleDelPresupuesto, PersonaParaCotizar } from "../domain/presupuestoMuebles";
import { cronogramaDeTrabajos, HOLGURA_POR_DEFECTO, ocupacionDelTaller, primerHabil, tareasPorPersonaYDia, type EstadoEntrega, type TrabajoParaCronograma } from "../domain/cronograma";
import { MueblesPresupuesto } from "./MueblesPresupuesto";
import { ETIQUETA_RUBRO, type EstadoChecklist } from "../domain/checklistProduccion";

export type TrabajoDeFabrica = TrabajoParaCronograma & { company: string; deCotizacion: boolean };

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 1 });
const fecha = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "—");
const ESTADO: Record<EstadoEntrega, { texto: string; color: string; fondo: string }> = {
  llega: { texto: "Llega", color: "#166534", fondo: "#dcfce7" },
  justo: { texto: "Justo (menos holgura)", color: "#92400e", fondo: "#fef3c7" },
  no_llega: { texto: "No llega", color: "#991b1b", fondo: "#fee2e2" },
  sin_entrega: { texto: "Sin fecha de entrega", color: "#475569", fondo: "#f1f5f9" },
  sin_datos: { texto: "Faltan tiempos o gente", color: "#475569", fondo: "#f1f5f9" },
};

export function CronogramaFabricacion({
  trabajos,
  sinMuebles,
  tipos,
  tareas,
  rubros,
  personas,
  hoy,
  diasOrganizados = [],
  maquinas = [],
  companyShort,
  onGuardarFabricacion,
  onPasarAOrganizacion,
  nuevoId,
  checklist,
}: {
  // Checklist antes de produccion por trabajo (materiales, insumos, herrajes): se ve en el estado y avisa al lanzar.
  checklist?: Map<number, EstadoChecklist>;
  trabajos: TrabajoDeFabrica[];
  // Trabajos en curso que todavia no tienen muebles (para cargarselos).
  sinMuebles: Array<{ jobId: number; nombre: string; company: string; inicio: string }>;
  tipos: TipoMueble[];
  tareas: TipoTarea[];
  rubros: RubroFabricacion[];
  personas: PersonaParaCotizar[];
  hoy: string;
  // La organizacion diaria (lo cargado a mano, los dias en obra y los mantenimientos se descuentan).
  diasOrganizados?: AsignacionDiaria[];
  // Maquinas de Stock: las pesadas con sus unidades (cuello de botella) y si andan. El ocupado sale de los mantenimientos.
  maquinas?: Array<Omit<MaquinaDelTaller, "ocupado">>;
  companyShort: (c: string) => string;
  onGuardarFabricacion: (jobId: number, cambios: { muebles?: MuebleDelPresupuesto[]; inicio?: string; holguraDias?: number }) => void;
  onPasarAOrganizacion: (jobId: number, filas: ReturnType<typeof tareasPorPersonaYDia>) => void;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("fabricacion.cronograma", { label: 260, col: 96, colCompact: 76 });
  const [mueblesDe, setMueblesDe] = useState<number | null>(null);
  const [detalleDe, setDetalleDe] = useState<number | null>(null);
  const ocupacion = useMemo(() => ocupacionDelTaller(primerHabil(hoy), diasOrganizados, trabajos.map((t) => t.jobId)), [hoy, diasOrganizados, trabajos]);
  const crono = useMemo(
    () =>
      cronogramaDeTrabajos(trabajos, tipos, tareas, rubros, personas, hoy, {
        ocupadoPersona: ocupacion.ocupadoPersona,
        maquinas: maquinas.map((m) => ({ ...m, ocupado: ocupacion.ocupadoMaquina[m.id] || [] })),
        herramientasDeTarea: Object.fromEntries(tareas.filter((t) => t.herramientas?.length).map((t) => [t.id, t.herramientas as number[]])),
      }),
    [trabajos, tipos, tareas, rubros, personas, hoy, ocupacion, maquinas]
  );
  const pesadas = maquinas.filter((m) => m.unidades != null);
  const nombreMueble = (muebleId: number) => {
    for (const t of trabajos) {
      const m = t.muebles.find((x) => x.id === muebleId);
      if (m) return m.nombre || tipos.find((x) => x.id === m.tipoMuebleId)?.nombre || "mueble";
    }
    return "mueble";
  };
  const nombrePersona = (id: number) => personas.find((p) => p.id === id)?.nombre || "—";
  const editando = [...trabajos, ...sinMuebles.map((s) => ({ ...s, muebles: [] as MuebleDelPresupuesto[], materiales: [], deCotizacion: false }))].find((t) => t.jobId === mueblesDe);
  const detalle = crono.trabajos.find((t) => t.jobId === detalleDe);
  const filasDetalle = detalle ? tareasPorPersonaYDia(crono.base, detalle.asignaciones, nombreMueble) : [];

  return (
    <Panel span="full" title="Cronograma automático">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Los trabajos con sus muebles cargados se reparten entre la gente de De Raíz (cada tarea la hace quien sabe con el costo hora más alto, y lo que
        va en paralelo se reparte para terminar antes), de lunes a viernes de 07:30 a 17:00 con el almuerzo. Cada trabajo arranca en su inicio; después
        se ve si llega a la entrega con la holgura pedida. A un trabajo de un presupuesto viejo se le cargan los muebles acá, sin tocar su precio.
      </div>
      <div style={{ fontSize: 12, color: "#475569", marginBottom: 8 }}>
        Descuenta de la organización diaria: <strong>{ocupacion.diasEnObra}</strong> día{ocupacion.diasEnObra === 1 ? "" : "s"} en obra ·{" "}
        <strong>{ocupacion.tareasAMano}</strong> tarea{ocupacion.tareasAMano === 1 ? "" : "s"} cargada{ocupacion.tareasAMano === 1 ? "" : "s"} a mano ·{" "}
        <strong>{ocupacion.mantenimientos}</strong> mantenimiento{ocupacion.mantenimientos === 1 ? "" : "s"}
        {pesadas.length > 0 && <> · máquinas pesadas de a una tarea por unidad ({pesadas.map((m) => m.nombre).join(", ")})</>}.
      </div>
      {personas.length === 0 && (
        <div style={{ fontSize: 12.5, color: "#b45309", marginBottom: 8 }}>Nadie de De Raíz tiene categorías internas cargadas: no se puede saber quién hace cada tarea.</div>
      )}
      {trabajos.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Ningún trabajo en curso tiene muebles cargados todavía.</div>
      ) : (
        <div style={{ ...planillaWrap, ...anchos.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Trabajo
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
                </th>
                <th style={thColumna}>
                  Inicio
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>Hs-hombre</th>
                <th style={thColumna}>Termina</th>
                <th style={thColumna}>Entrega</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Días hábiles de margen pedidos antes de la entrega">Holgura</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Días hábiles entre que termina y la entrega">Margen</th>
                <th style={thFlexible}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {crono.trabajos.map((r) => {
                const t = trabajos.find((x) => x.jobId === r.jobId)!;
                const e = ESTADO[r.estado];
                return (
                  <tr key={r.jobId}>
                    <td style={tdNombre}>
                      <span style={{ fontWeight: 700 }}>{r.nombre}</span>
                      <span style={{ fontSize: 11.5, color: "#94a3b8" }}> · {companyShort(t.company)} · {t.muebles.length} mueble{t.muebles.length === 1 ? "" : "s"}{t.deCotizacion ? "" : " (cargados en Fabricación)"}</span>
                    </td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        type="date"
                        value={r.inicio}
                        onChange={(ev) => ev.target.value && onGuardarFabricacion(r.jobId, { inicio: ev.target.value })}
                        style={{ border: "none", background: "transparent", fontSize: 12.5, width: "100%", padding: "2px 4px" }}
                      />
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: r.incompleto ? "#b45309" : undefined }} title={r.incompleto ? "Hay tareas sin tiempo estándar o sin materiales: el total queda corto" : undefined}>
                      {fmt(r.horasHombre)}{r.incompleto ? "*" : ""}
                    </td>
                    <td style={{ ...tdDato, fontWeight: 700 }}>{fecha(r.fin)}</td>
                    <td style={tdDato}>{fecha(r.entrega)}</td>
                    <td style={{ ...tdDato, padding: 0 }}>
                      <input
                        type="number"
                        min={0}
                        value={r.holguraDias}
                        onChange={(ev) => onGuardarFabricacion(r.jobId, { holguraDias: Math.max(0, Math.round(Number(ev.target.value) || 0)) })}
                        style={{ border: "none", background: "transparent", fontSize: 12.5, width: "100%", textAlign: "right", padding: "2px 4px" }}
                        title={`Por defecto ${HOLGURA_POR_DEFECTO} días hábiles`}
                      />
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: r.margenDias != null && r.margenDias < 0 ? "#b91c1c" : undefined }}>{r.margenDias != null ? r.margenDias : "—"}</td>
                    <td style={tdFlexible}>
                      <span style={{ display: "inline-flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: e.color, background: e.fondo, borderRadius: 999, padding: "1px 8px" }}>{e.texto}</span>
                        {checklist?.get(r.jobId) && (
                          <span
                            title="Checklist antes de producción (materiales, insumos, herrajes)"
                            style={{ fontSize: 12, fontWeight: 700, color: checklist.get(r.jobId)!.listo ? "#166534" : "#991b1b" }}
                          >
                            {checklist.get(r.jobId)!.listo ? "✓ listo para producción" : `checklist ${checklist.get(r.jobId)!.cumplidos}/3`}
                          </span>
                        )}
                        {r.trabadas.length > 0 && (
                          <span
                            style={{ fontSize: 12, fontWeight: 700, color: "#991b1b" }}
                            title={r.trabadas.map((x) => `${x.nombre}: ${x.motivos.join(", ")}`).join("\n")}
                          >
                            ⚠ máquina parada: la fecha no es real
                          </span>
                        )}
                        <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "1px 6px", cursor: "pointer" }} onClick={() => setMueblesDe(r.jobId)}>Muebles…</button>
                        {r.asignaciones.length > 0 && (
                          <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 6, padding: "1px 6px", cursor: "pointer" }} onClick={() => setDetalleDe(r.jobId)}>Quién y cuándo…</button>
                        )}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {sinMuebles.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", fontSize: 12.5 }}>
          <span style={{ color: "#64748b" }}>Cargar los muebles de un trabajo en curso (presupuestos hechos a la manera vieja):</span>
          <select
            value=""
            onChange={(ev) => ev.target.value && setMueblesDe(Number(ev.target.value))}
            style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 6px", fontSize: 12.5 }}
          >
            <option value="">Elegí el trabajo…</option>
            {sinMuebles.map((s) => (
              <option key={s.jobId} value={s.jobId}>{s.nombre} · {companyShort(s.company)}</option>
            ))}
          </select>
        </div>
      )}

      {editando && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }} onClick={() => setMueblesDe(null)}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(1100px, 100%)", padding: 14 }} onClick={(e) => e.stopPropagation()}>
            <MueblesPresupuesto
              titulo={`Muebles de ${editando.nombre}`}
              soloMuebles
              muebles={editando.muebles}
              onCambiar={(muebles) => onGuardarFabricacion(editando.jobId, { muebles })}
              tipos={tipos}
              tareas={tareas}
              rubros={rubros}
              materiales={editando.materiales}
              personas={personas}
              manoDeObra={[]}
              money={(n) => String(n)}
              onPasarAManoDeObra={() => {}}
              nuevoId={nuevoId}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
              <ButtonLike onClick={() => setMueblesDe(null)}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}

      {detalle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }} onClick={() => setDetalleDe(null)}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(820px, 100%)", padding: 18, display: "grid", gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>{detalle.nombre} · quién y cuándo</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Del {fecha(detalle.inicio)} al {fecha(detalle.fin)}. Contempla los otros trabajos con muebles (la gente y las máquinas se comparten), los días en
              obra, las tareas cargadas a mano y los mantenimientos de la organización diaria. Si alguien de la tarea no está, la tarea se corta y sigue después.
            </div>
            {detalle.trabadas.length > 0 && (
              <div style={{ fontSize: 12.5, color: "#991b1b", fontWeight: 700 }}>
                {detalle.trabadas.map((x) => <div key={x.nombre}>⚠ {x.nombre} necesita {x.motivos.join(", ")}: hasta que vuelva a andar, la fecha de fin no es real.</div>)}
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "3px 6px" }}>Día</th>
                  <th style={{ padding: "3px 6px" }}>Horario</th>
                  <th style={{ padding: "3px 6px" }}>Persona</th>
                  <th style={{ padding: "3px 6px" }}>Tarea</th>
                </tr>
              </thead>
              <tbody>
                {filasDetalle.map((f, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "3px 6px" }}>{fecha(f.fecha)}</td>
                    <td style={{ padding: "3px 6px" }}>{f.desde}–{f.hasta}</td>
                    <td style={{ padding: "3px 6px", fontWeight: 600 }}>{nombrePersona(f.personaId)}</td>
                    <td style={{ padding: "3px 6px" }}>{f.descripcion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <ButtonLike secondary onClick={() => setDetalleDe(null)}>Cerrar</ButtonLike>
              <ButtonLike
                onClick={() => {
                  // Lanzar a produccion pide el checklist completo: si falta algo, se avisa y se decide (el stock todavia no esta completo).
                  const ck = checklist?.get(detalle.jobId);
                  const faltan = ck ? ck.rubros.filter((x) => x.estado === "falta" || x.estado === "sin_detalle").map((x) => ETIQUETA_RUBRO[x.rubro].toLowerCase()) : [];
                  if (faltan.length && !window.confirm(`El checklist antes de producción no está completo: falta ${faltan.join(", ")}. ¿Pasar las tareas igual?`)) return;
                  if (window.confirm(`¿Pasar estas ${filasDetalle.length} tareas a la organización diaria de cada persona? Lo que ya está en esos días queda; si se aprieta dos veces no se duplica.`)) {
                    onPasarAOrganizacion(detalle.jobId, filasDetalle);
                    setDetalleDe(null);
                  }
                }}
              >
                Pasar a la organización diaria
              </ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
