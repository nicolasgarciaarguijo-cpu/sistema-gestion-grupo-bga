// PRESUPUESTO · MUEBLES DEL BLOQUE (fase 3, Nicolas 2026-10-26). Se elige el tipo de mueble, cuantos y sus
// medidas; las horas salen de su receta con los materiales cotizados en el bloque. Cada tarea la hace el idoneo
// mas caro que la termina antes (los mejores, lo mas rapido posible) y "Pasar a mano de obra" deja una fila por
// persona con sus horas y su costo hora. El calculo vive en domain/presupuestoMuebles.ts.
import React, { useMemo, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import NumInput from "../ui/NumInput";
import type { RubroFabricacion } from "../domain/ganttFabricacion";
import type { TipoTarea } from "../domain/organizacionDiaria";
import { materialesDeLosMuebles, rubrosDeLaReceta, type ConvertidorMateriales, type ItemStockParaMateriales, type MaterialPasado, type TipoMueble } from "../domain/tiposMueble";
import { calcularMueblesDelPresupuesto, planificarMuebles, type MuebleDelPresupuesto, type PersonaParaCotizar, type PlanDeMuebles } from "../domain/presupuestoMuebles";

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(760px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
// Jornada del taller de lunes a viernes: 07:30 a 17:00 menos el almuerzo de 13:30 a 14:00 = 9 hs. Los sabados
// no entran en la cuenta (Nicolas, 2026-10-26).
const HORAS_POR_DIA = 9;
const unidadCorta = (u?: string) => ({ u: "u", ml: "ml", m2: "m²", m3: "m³" } as Record<string, string>)[u || "u"] || "u";

export function MueblesPresupuesto({
  muebles,
  onCambiar,
  tipos,
  tareas,
  rubros,
  materiales,
  personas,
  manoDeObra,
  money,
  onPasarAManoDeObra,
  stock = [],
  convertidor,
  previos = {},
  onPasarMateriales,
  nuevoId,
  soloMuebles = false,
  titulo = "Muebles del presupuesto",
}: {
  muebles: MuebleDelPresupuesto[];
  onCambiar: (muebles: MuebleDelPresupuesto[]) => void;
  tipos: TipoMueble[];
  tareas: TipoTarea[];
  rubros: RubroFabricacion[];
  // Los materiales del bloque (de ahi salen las cantidades de los rubros).
  materiales: Array<{ description: string; qty: number }>;
  // El plantel con su costo hora para cotizar y las tareas que sabe hacer (categorias internas).
  personas: PersonaParaCotizar[];
  // La mano de obra del bloque hoy (para saber si ya tiene lo que sale de los muebles).
  manoDeObra: Array<{ employeeId?: number; jobHours: number; hourlyRate: number }>;
  money: (n: number) => string;
  onPasarAManoDeObra: (plan: PlanDeMuebles) => void;
  // Materiales GENERICOS de los tipos de mueble (con su desperdicio, 30/10/2026): se elige el articulo concreto de Stock en
  // una ventana y se pasan al bloque de materiales. elegidosPrevios = lo elegido la vez anterior (por generico).
  stock?: ItemStockParaMateriales[];
  convertidor?: ConvertidorMateriales;
  // Lo que se paso la vez anterior, por generico: el articulo elegido y la cantidad si se corrigio a mano.
  previos?: Record<string, { articuloId?: number; qty?: number }>;
  onPasarMateriales?: (filas: MaterialPasado[]) => void;
  // En Fabricacion (muebles de un trabajo) no va lo de mano de obra: solo la lista y sus horas.
  soloMuebles?: boolean;
  titulo?: string;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("ppto.muebles", { label: 260, col: 96, colCompact: 76 });
  const [menu, setMenu] = useState<null | { x: number; y: number; id: number }>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  // La ventana de elegir: articulo y cantidad corregida a mano por generico.
  const [elegir, setElegir] = useState<{ articulos: Record<string, number | undefined>; cantidades: Record<string, number | undefined> } | null>(null);
  // Lo que pasaria sin elegir nada (con los sugeridos): de ahi salen la lista y el arranque de la ventana.
  const genericos = useMemo(() => materialesDeLosMuebles(muebles, tipos, stock, { convertidor }), [muebles, tipos, stock, convertidor]);
  const filasElegidas = elegir ? materialesDeLosMuebles(muebles, tipos, stock, { elegidos: elegir.articulos, cantidades: elegir.cantidades, convertidor }) : [];
  const activos = tipos.filter((t) => t.activa !== false).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const res = useMemo(() => calcularMueblesDelPresupuesto(muebles, tipos, tareas, materiales, rubros), [muebles, tipos, tareas, materiales, rubros]);
  const cambiar = (id: number, cambios: Partial<MuebleDelPresupuesto>) => onCambiar(muebles.map((m) => (m.id === id ? { ...m, ...cambios } : m)));
  const agregar = (tipoId: number) => {
    const t = tipos.find((x) => x.id === tipoId);
    if (!t) return;
    onCambiar([...muebles, { id: nuevoId(), tipoMuebleId: t.id, cantidad: 1, largo: t.largo, alto: t.alto, profundidad: t.profundidad }]);
  };
  const plan = useMemo(() => planificarMuebles(res.muebles, personas), [res, personas]);
  const quienHace = (muebleId: number, renglonId: number) => plan.asignaciones.find((a) => a.muebleId === muebleId && a.renglonId === renglonId);
  // Al dia: la mano de obra tiene exactamente una fila por persona del plan, con sus horas y su costo hora.
  const alDia =
    manoDeObra.length === plan.porPersona.length &&
    plan.porPersona.every((p) => manoDeObra.some((l) => (l.employeeId ?? null) === p.personaId && Math.abs(l.jobHours - p.horas) < 0.05 && Math.abs(l.hourlyRate - p.costoHora) < 1));
  const abierto = res.muebles.find((c) => c.mueble.id === detalle);

  return (
    <Panel
      span="full"
      title={titulo}
      actions={
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value=""
            onChange={(e) => e.target.value && agregar(Number(e.target.value))}
            style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            title="Sumar un mueble de un tipo (Fabricación → Tipos de mueble o trabajo)"
          >
            <option value="">+ Mueble…</option>
            {activos.map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
          <ButtonLike onClick={anchos.toggleCompacto} secondary>{anchos.esCompacto ? "Ancho normal" : "Compacto"}</ButtonLike>
        </div>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Las horas salen de la receta de cada tipo de mueble o trabajo: las tareas por medida usan las medidas, y las que salen de materiales usan lo cotizado en este bloque
        (si dos muebles usan el mismo rubro, se reparte según cuántos son). Click derecho: ver tareas, fijar materiales a mano, quitar.
      </div>
      {activos.length === 0 && muebles.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Todavía no hay tipos de mueble o trabajo. Se arman en Fabricación → Tipos de mueble o trabajo.</div>
      ) : muebles.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Este bloque no tiene muebles. Sumá uno con "+ Mueble…".</div>
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
                  Mueble
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Cant.
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>Largo (m)</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Alto (m)</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Prof. (m)</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Horas-hombre de todos los muebles de esta fila">Hs-hombre</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Horas de reloj mínimas (los pasos en paralelo, por distintas personas)">Hs reloj</th>
                <th style={thFlexible}>Tipo · materiales usados</th>
              </tr>
            </thead>
            <tbody>
              {res.muebles.map((c) => {
                const m = c.mueble;
                const mats = Object.entries(c.materiales).map(([rid, q]) => `${rubros.find((r) => r.id === Number(rid))?.nombre || "rubro"} ${fmt(q)}${c.materialesAMano.includes(Number(rid)) ? " (a mano)" : ""}`);
                return (
                  <tr
                    key={m.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setMenu({ x: ev.clientX, y: ev.clientY, id: m.id });
                    }}
                  >
                    <td style={tdNombre}>
                      <input style={{ ...inputCelda, fontWeight: 700 }} {...focoCelda} placeholder={c.tipo?.nombre || "tipo borrado"} value={m.nombre || ""} onChange={(e) => cambiar(m.id, { nombre: e.target.value })} />
                    </td>
                    {(["cantidad", "largo", "alto", "profundidad"] as const).map((k) => (
                      <td key={k} style={{ ...tdDato, padding: 0 }}>
                        <NumInput style={inputCeldaDerecha} {...focoCelda} value={Number(m[k] || 0)} onChange={(e) => cambiar(m.id, { [k]: Number(e.target.value) })} />
                      </td>
                    ))}
                    <td
                      style={{ ...tdDato, textAlign: "right", fontWeight: 700, color: c.incompleto ? "#b45309" : undefined, cursor: "pointer" }}
                      title={c.incompleto ? "Hay tareas sin tiempo estándar o sin materiales cotizados del rubro: el total queda corto (click para ver)" : "Click para ver las tareas"}
                      onClick={() => setDetalle(m.id)}
                    >
                      {fmt(c.horasHombre)}{c.incompleto ? "*" : ""}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right" }}>{fmt(c.horasReloj)}</td>
                    <td style={{ ...tdFlexible, fontSize: 12, color: "#64748b" }}>
                      {c.tipo ? c.tipo.nombre : <span style={{ color: "#b91c1c" }}>El tipo de mueble o trabajo ya no existe</span>}
                      {mats.length ? ` · ${mats.join(" · ")}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {muebles.length > 0 && !soloMuebles && (
        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4 }}>Quién hace qué</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Cada tarea la hace la persona que sabe hacerla con el costo hora más alto; si está ocupada con otra tarea en paralelo, la toma el
            siguiente que sabe, para que salga lo más rápido posible. Las tareas de 2 o más personas las encabeza un especialista y lo ayudan
            aprendices o ayudantes (por su categoría interna); si no hay ayudantes libres, completa un especialista y se avisa. Los especialistas
            van primero a las tareas más complejas. Si la gente que sabe está ocupada, la tarea espera: así se ve el tiempo de fabricación real
            con este plantel. Se cotiza como si fuera el único trabajo de la fábrica.
          </div>
          {personas.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#b45309" }}>Nadie tiene categorías internas cargadas (Personal → ficha de cada persona): no se puede saber quién hace cada tarea.</div>
          ) : (
            <table style={{ width: "100%", maxWidth: 720, borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "3px 6px" }}>Persona</th>
                  <th style={{ padding: "3px 6px", textAlign: "right" }}>Horas</th>
                  <th style={{ padding: "3px 6px", textAlign: "right" }}>$ hora</th>
                  <th style={{ padding: "3px 6px", textAlign: "right" }}>Costo</th>
                </tr>
              </thead>
              <tbody>
                {plan.porPersona.map((p) => (
                  <tr key={String(p.personaId)} style={{ borderTop: "1px solid #f1f5f9", color: p.personaId == null ? "#b45309" : undefined }}>
                    <td style={{ padding: "3px 6px", fontWeight: 600 }} title={p.personaId == null ? "Nadie tiene estas tareas en sus categorías: se cotizan al costo hora más alto del plantel" : undefined}>{p.nombre}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt(p.horas)}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right" }}>{money(p.costoHora)}</td>
                    <td style={{ padding: "3px 6px", textAlign: "right", fontWeight: 700 }}>{money(p.costo)}</td>
                  </tr>
                ))}
                <tr style={{ borderTop: "1px solid #cbd5e1", fontWeight: 800 }}>
                  <td style={{ padding: "3px 6px" }}>Total</td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{fmt(res.horasHombre)}</td>
                  <td />
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{money(plan.costo)}</td>
                </tr>
              </tbody>
            </table>
          )}
          {plan.especialistasDeAyudante.horas > 0 && (
            <div style={{ fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 10px" }}>
              ⚠ No alcanzan los ayudantes: hay especialistas haciendo tareas de ayudante ({fmt(plan.especialistasDeAyudante.horas)} hs en{" "}
              {plan.especialistasDeAyudante.tareas.map((a) => a.nombre).filter((v, i, x) => x.indexOf(v) === i).join(", ")}). Conviene evaluar contratar un ayudante.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ fontSize: 13 }}>
              <strong>{fmt(res.horasHombre)} hs-hombre</strong>
              {res.incompleto ? <span style={{ color: "#b45309" }}> (incompleto)</span> : null}
              <span style={{ color: "#64748b" }}>
                {" · "}tiempo de fabricación con este plantel: <strong style={{ color: "#0f172a" }}>{fmt(plan.horasReloj)} hs</strong> (≈ {fmt(Math.ceil((plan.horasReloj / HORAS_POR_DIA) * 10) / 10)} días hábiles de {fmt(HORAS_POR_DIA)} hs)
                {plan.horasReloj - plan.horasRelojSinEsperas > 0.05 ? ` · ${fmt(plan.horasReloj - plan.horasRelojSinEsperas)} hs son esperas porque la gente que sabe está ocupada` : ""}
              </span>
              {plan.sinPersona.length ? <span style={{ color: "#b45309" }}> · {plan.sinPersona.length} tarea{plan.sinPersona.length === 1 ? "" : "s"} sin nadie que sepa hacerla{plan.sinPersona.length === 1 ? "" : "s"}</span> : null}
            </div>
            <ButtonLike
              onClick={() => {
                if (!manoDeObra.length || window.confirm("La mano de obra de este bloque se reemplaza por una fila por persona, con sus horas y su costo hora. ¿Seguir? (Restaurar trae de vuelta las categorías)")) onPasarAManoDeObra(plan);
              }}
              disabled={alDia || !plan.porPersona.length}
            >
              {alDia ? "Mano de obra al día ✓" : "Pasar a mano de obra (por persona)"}
            </ButtonLike>
            {onPasarMateriales && (
              <ButtonLike
                secondary
                disabled={!genericos.length}
                onClick={() =>
                  setElegir({
                    articulos: Object.fromEntries(genericos.map((g) => [g.generico, previos[g.generico]?.articuloId ?? g.stockItemId])),
                    cantidades: Object.fromEntries(genericos.flatMap((g) => (previos[g.generico]?.qty != null ? [[g.generico, previos[g.generico].qty]] : []))),
                  })
                }
              >
                {genericos.length ? `Pasar materiales de los muebles (${genericos.length})` : "Los tipos no tienen materiales cargados"}
              </ButtonLike>
            )}
          </div>
        </div>
      )}

      {menu && (() => {
        const c = res.muebles.find((x) => x.mueble.id === menu.id);
        if (!c) return null;
        const cerrar = () => setMenu(null);
        return (
          <QuickMenu x={menu.x} y={menu.y} onClose={cerrar}>
            <QuickMenuTitle>{c.mueble.nombre || c.tipo?.nombre || "mueble"}</QuickMenuTitle>
            <button type="button" style={quickMenuItem} onClick={() => { setDetalle(c.mueble.id); cerrar(); }}>Tareas y materiales…</button>
            <button
              type="button"
              style={quickMenuItem}
              onClick={() => {
                onCambiar([...muebles, { ...c.mueble, id: nuevoId(), nombre: c.mueble.nombre ? `${c.mueble.nombre} (copia)` : "" }]);
                cerrar();
              }}
            >
              Duplicar
            </button>
            <QuickMenuSep />
            <button
              type="button"
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                onCambiar(muebles.filter((m) => m.id !== c.mueble.id));
                cerrar();
              }}
            >
              Quitar del presupuesto
            </button>
          </QuickMenu>
        );
      })()}

      {abierto && (
        <div style={overlay} onClick={() => setDetalle(null)}>
          <div style={caja} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>{abierto.mueble.nombre || abierto.tipo?.nombre || "Mueble"} · {fmt(abierto.horasHombre)} hs-hombre</strong>
            {abierto.tipo && rubrosDeLaReceta(abierto.tipo).length > 0 && (
              <div style={{ display: "grid", gap: 4 }}>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4 }}>Materiales de este mueble</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Salen de lo cotizado en el bloque. Escribí una cantidad para fijarla a mano; vaciala para que vuelva a salir sola.</div>
                {rubrosDeLaReceta(abierto.tipo)
                  .map((rid) => {
                    const rubro = rubros.find((r) => r.id === rid);
                    const fijado = abierto.mueble.materiales?.[rid];
                    return (
                      <label key={rid} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                        <span style={{ minWidth: 180 }}>{rubro?.nombre || `rubro ${rid}`}</span>
                        <input
                          type="number"
                          min={0}
                          step="any"
                          placeholder={fmt(abierto.materiales[rid] || 0)}
                          value={fijado ?? ""}
                          onChange={(e) => {
                            const resto = { ...(abierto.mueble.materiales || {}) };
                            if (e.target.value === "") delete resto[rid];
                            else resto[rid] = Number(e.target.value);
                            cambiar(abierto.mueble.id, { materiales: resto });
                          }}
                          style={{ width: 100, border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, textAlign: "right" }}
                        />
                        <span style={{ fontSize: 12, color: "#94a3b8" }}>{rubro?.unidad || ""} {fijado != null ? "· a mano" : "· sale de lo cotizado"}</span>
                      </label>
                    );
                  })}
              </div>
            )}
            <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4 }}>Tareas</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr style={{ color: "#64748b", textAlign: "left" }}>
                  <th style={{ padding: "3px 4px" }}>Paso</th>
                  <th style={{ padding: "3px 4px" }}>Tarea</th>
                  <th style={{ padding: "3px 4px", textAlign: "right" }}>Cantidad</th>
                  <th style={{ padding: "3px 4px", textAlign: "right" }}>Hs/unidad</th>
                  <th style={{ padding: "3px 4px", textAlign: "right" }} title="Duración de la tarea (con 2 o más personas, cada una pone estas horas)">Horas</th>
                  <th style={{ padding: "3px 4px" }}>Quién</th>
                  <th style={{ padding: "3px 4px", textAlign: "right" }} title="Desde y hasta qué hora del trabajo (contando desde que arranca)">De – a (hs)</th>
                </tr>
              </thead>
              <tbody>
                {abierto.tareas.map((t) => (
                  <tr key={t.renglonId} style={{ borderTop: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "3px 4px" }}>{t.etiqueta}</td>
                    <td style={{ padding: "3px 4px" }}>{t.nombre}</td>
                    <td style={{ padding: "3px 4px", textAlign: "right", color: t.sinMaterial ? "#b45309" : undefined }}>
                      {t.sinMaterial ? "sin material cotizado" : `${fmt(t.cantidad)} ${unidadCorta(t.unidad)}`}
                    </td>
                    <td style={{ padding: "3px 4px", textAlign: "right", color: t.sinTiempo ? "#b45309" : undefined }}>{t.sinTiempo ? "sin tiempo" : fmt(t.horasPorUnidad)}</td>
                    <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 700 }}>{fmt(t.horas)}{t.personas > 1 ? <span style={{ fontWeight: 400, color: "#64748b" }}> × {t.personas}</span> : null}</td>
                    {(() => {
                      const q = quienHace(abierto.mueble.id, t.renglonId);
                      return (
                        <>
                          <td style={{ padding: "3px 4px" }}>
                            {q ? (
                              <>
                                <span style={{ color: q.personaId == null ? "#b45309" : undefined }}>{q.persona}</span>
                                {q.ayudantes.map((y, i) => (
                                  <span key={i} style={{ color: y.especialista ? "#b45309" : "#64748b" }}> + {y.persona}{y.especialista ? " (especialista haciendo de ayudante)" : " (ayudante)"}</span>
                                ))}
                              </>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td style={{ padding: "3px 4px", textAlign: "right", color: "#64748b" }}>{q ? `${fmt(q.inicio)} – ${fmt(q.fin)}` : ""}</td>
                        </>
                      );
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
            {abierto.tareas.length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Este tipo de mueble o trabajo no tiene receta (Fabricación → Tipos de mueble o trabajo).</div>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ButtonLike onClick={() => setDetalle(null)}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}

      {elegir && (
        <div style={overlay} onClick={() => setElegir(null)}>
          <div style={{ ...caja, width: "min(1000px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 17, fontWeight: 800 }}>Elegir los materiales de los muebles</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              La cantidad la da el tipo de mueble o trabajo (con su desperdicio), pasada a la unidad del artículo con las equivalencias de Fabricación.
              Vos elegís el artículo concreto: placa blanca o símil madera, corredera telescópica u oculta. La cantidad se puede corregir a mano.
            </div>
            <table className="planilla" style={planillaTable}>
              <thead>
                <tr>
                  <th style={thEsquina}>Material</th>
                  <th style={thColumna}>Artículo de Stock</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Cantidad</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Precio</th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {filasElegidas.map((f) => {
                  const g = { clave: f.generico, nombre: f.nombre, grupo: f.grupoGenerico, qty: f.qtyGenerico, unidad: f.unidadGenerico };
                  const delGrupo = stock.filter((x) => !g.grupo || (x.group || "") === g.grupo);
                  return (
                    <tr key={g.clave} style={f?.sinPrecio ? { background: "#fef2f2" } : undefined}>
                      <td style={tdNombre}>
                        <strong>{g.nombre}</strong>
                        <div style={{ fontSize: 11, color: "#94a3b8" }}>
                          {f.acompanaA ? `acompaña a ${f.acompanaA} · ` : ""}
                          {fmt(g.qty)} {g.unidad} · {g.grupo || "sin grupo de Stock"}
                        </div>
                      </td>
                      <td style={tdDato}>
                        <select
                          aria-label={`Artículo para ${g.nombre}`}
                          style={{ ...inputCelda, cursor: "pointer" }}
                          value={elegir.articulos[g.clave] ?? ""}
                          onChange={(e) =>
                            // Otro articulo puede ir en otra unidad: la correccion a mano se descarta.
                            setElegir({ articulos: { ...elegir.articulos, [g.clave]: e.target.value ? Number(e.target.value) : undefined }, cantidades: { ...elegir.cantidades, [g.clave]: undefined } })
                          }
                        >
                          <option value="">(sin elegir)</option>
                          {delGrupo.map((x) => <option key={x.id} value={x.id}>{x.description} · {money(x.unitPrice)}/{x.unit}</option>)}
                        </select>
                        {f?.equivalencia && <div style={{ fontSize: 11, color: "#166534" }}>⇄ {f.equivalencia}</div>}
                        {f?.sinEquivalencia && <div style={{ fontSize: 11, color: "#b45309" }}>⚠ No hay equivalencia {f.sinEquivalencia}: la cantidad pasa tal cual</div>}
                      </td>
                      <td style={tdDato}>
                        <span style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                          <input
                            aria-label={`Cantidad de ${g.nombre}`}
                            style={{ ...inputCeldaDerecha, width: 80, color: f?.cantidadManual ? "#1e40af" : undefined, fontWeight: f?.cantidadManual ? 700 : undefined }}
                            type="number"
                            min={0}
                            step={0.01}
                            value={f ? f.qty : ""}
                            onChange={(e) => setElegir({ ...elegir, cantidades: { ...elegir.cantidades, [g.clave]: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0) } })}
                          />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>{f?.unit}</span>
                        </span>
                        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "right" }}>
                          uso {fmt(f.uso)} · {f.compra}
                        </div>
                        {f?.cantidadManual && (
                          <div style={{ fontSize: 11, color: "#1e40af", textAlign: "right" }}>
                            a mano · el tipo da {fmt(f.qtyDelTipo)}{" "}
                            <button type="button" style={{ border: "none", background: "none", color: "#1e40af", cursor: "pointer", textDecoration: "underline", padding: 0, fontSize: 11 }} onClick={() => setElegir({ ...elegir, cantidades: { ...elegir.cantidades, [g.clave]: undefined } })}>
                              volver
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", color: f?.sinPrecio ? "#b91c1c" : undefined, fontWeight: f?.sinPrecio ? 800 : undefined }}>
                        {f?.sinPrecio ? (f.stockItemId == null ? "FALTA ARTÍCULO" : "FALTA PRECIO") : money(f?.unitPrice || 0)}
                      </td>
                      <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{f && !f.sinPrecio ? money(f.qty * f.unitPrice) : "·"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filasElegidas.some((f) => f.sinPrecio) && (
              <div style={{ fontSize: 12.5, color: "#b91c1c", fontWeight: 700 }}>
                ⚠ {filasElegidas.filter((f) => f.sinPrecio).length} material(es) sin artículo o sin precio: pasan con precio 0 y quedan marcados en rojo en el presupuesto.
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <ButtonLike secondary onClick={() => setElegir(null)}>Cancelar</ButtonLike>
              <ButtonLike
                onClick={() => {
                  onPasarMateriales?.(filasElegidas);
                  setElegir(null);
                }}
              >
                Pasar al presupuesto
              </ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
