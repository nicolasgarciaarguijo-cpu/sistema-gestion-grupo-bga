// PRESUPUESTO · MUEBLES DEL BLOQUE (fase 3, Nicolas 2026-10-26). Se elige el tipo de mueble, cuantos y sus
// medidas; las horas salen de su receta con los materiales cotizados en el bloque, y "Pasar a mano de obra"
// las reparte entre las categorias. El calculo vive en domain/presupuestoMuebles.ts.
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
import { rubrosDeLaReceta, type TipoMueble } from "../domain/tiposMueble";
import { calcularMueblesDelPresupuesto, type MuebleDelPresupuesto } from "../domain/presupuestoMuebles";

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(760px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const unidadCorta = (u?: string) => ({ u: "u", ml: "ml", m2: "m²", m3: "m³" } as Record<string, string>)[u || "u"] || "u";

export function MueblesPresupuesto({
  muebles,
  onCambiar,
  tipos,
  tareas,
  rubros,
  materiales,
  horasEnManoDeObra,
  hayManoDeObra,
  onPasarAManoDeObra,
  nuevoId,
}: {
  muebles: MuebleDelPresupuesto[];
  onCambiar: (muebles: MuebleDelPresupuesto[]) => void;
  tipos: TipoMueble[];
  tareas: TipoTarea[];
  rubros: RubroFabricacion[];
  // Los materiales del bloque (de ahi salen las cantidades de los rubros).
  materiales: Array<{ description: string; qty: number }>;
  horasEnManoDeObra: number;
  hayManoDeObra: boolean;
  onPasarAManoDeObra: (horas: number) => void;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("ppto.muebles", { label: 260, col: 96, colCompact: 76 });
  const [menu, setMenu] = useState<null | { x: number; y: number; id: number }>(null);
  const [detalle, setDetalle] = useState<number | null>(null);
  const activos = tipos.filter((t) => t.activa !== false).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const res = useMemo(() => calcularMueblesDelPresupuesto(muebles, tipos, tareas, materiales, rubros), [muebles, tipos, tareas, materiales, rubros]);
  const cambiar = (id: number, cambios: Partial<MuebleDelPresupuesto>) => onCambiar(muebles.map((m) => (m.id === id ? { ...m, ...cambios } : m)));
  const agregar = (tipoId: number) => {
    const t = tipos.find((x) => x.id === tipoId);
    if (!t) return;
    onCambiar([...muebles, { id: nuevoId(), tipoMuebleId: t.id, cantidad: 1, largo: t.largo, alto: t.alto, profundidad: t.profundidad }]);
  };
  const distinto = Math.abs(horasEnManoDeObra - res.horasHombre) > 0.05;
  const abierto = res.muebles.find((c) => c.mueble.id === detalle);

  return (
    <Panel
      span="full"
      title="Muebles del presupuesto"
      actions={
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <select
            value=""
            onChange={(e) => e.target.value && agregar(Number(e.target.value))}
            style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 8px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
            title="Sumar un mueble de un tipo (Fabricación → Tipos de mueble)"
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
        Las horas salen de la receta de cada tipo de mueble: las tareas por medida usan las medidas, y las que salen de materiales usan lo cotizado en este bloque
        (si dos muebles usan el mismo rubro, se reparte según cuántos son). Click derecho: ver tareas, fijar materiales a mano, quitar.
      </div>
      {activos.length === 0 && muebles.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Todavía no hay tipos de mueble. Se arman en Fabricación → Tipos de mueble.</div>
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
                      {c.tipo ? c.tipo.nombre : <span style={{ color: "#b91c1c" }}>El tipo de mueble ya no existe</span>}
                      {mats.length ? ` · ${mats.join(" · ")}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {muebles.length > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 8 }}>
          <div style={{ fontSize: 13 }}>
            <strong>{fmt(res.horasHombre)} hs-hombre</strong>
            {res.incompleto ? <span style={{ color: "#b45309" }}> (incompleto)</span> : null}
            <span style={{ color: "#64748b" }}> · el mueble más largo: {fmt(res.horasRelojMax)} hs de reloj · en mano de obra hoy: {fmt(horasEnManoDeObra)} hs</span>
          </div>
          <span title={!hayManoDeObra ? "Primero cargá la mano de obra del bloque (Restaurar)" : distinto ? "Reparte estas horas entre las categorías de mano de obra según cuánta gente tiene cada una" : "La mano de obra ya tiene estas horas"}>
            <ButtonLike
              onClick={() => onPasarAManoDeObra(res.horasHombre)}
              disabled={!hayManoDeObra || !distinto}
            >
              {distinto ? "Pasar las horas a mano de obra" : "Mano de obra al día ✓"}
            </ButtonLike>
          </span>
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
                  <th style={{ padding: "3px 4px", textAlign: "right" }}>Horas</th>
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
                    <td style={{ padding: "3px 4px", textAlign: "right", fontWeight: 700 }}>{fmt(t.horas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {abierto.tareas.length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Este tipo de mueble no tiene receta (Fabricación → Tipos de mueble).</div>}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ButtonLike onClick={() => setDetalle(null)}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
