// FABRICACION · TIPOS DE MUEBLE (Nicolas, 2026-10-26). Cada tipo de mueble es una receta ordenada por pasos
// (3.1 / 3.2 en paralelo, el 4 espera a que termine todo el 3) que usa las tareas del catalogo unico. Cada
// renglon dice de que medida del mueble sale su cantidad; con las medidas se prueban los tiempos. Es la
// base del presupuesto por tipo de mueble y del cronograma. La logica vive en domain/tiposMueble.ts.
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import type { RubroFabricacion } from "../domain/ganttFabricacion";
import {
  BASES_CANTIDAD,
  rubrosDeLaReceta,
  pasoSiguiente,
  recetaDesdeTareas,
  recetaOrdenada,
  resumenDeTiempos,
  tareasDelMueble,
  type BaseCantidad,
  type RenglonReceta,
  type TipoMueble,
} from "../domain/tiposMueble";
import { UNIDADES_TAREA, type GrupoTrabajo, type TipoTarea } from "../domain/organizacionDiaria";

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(980px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const sub: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 };
const selectCelda: React.CSSProperties = { ...inputCelda, cursor: "pointer" };
const unidadCorta = (u?: string) => ({ u: "u", ml: "ml", m2: "m²", m3: "m³" } as Record<string, string>)[u || "u"] || "u";
const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });

export function TiposMueble({
  tipos,
  tareas,
  grupos,
  rubros = [],
  onGuardar,
  onBorrar,
  nuevoId,
}: {
  tipos: TipoMueble[];
  tareas: TipoTarea[];
  grupos: GrupoTrabajo[];
  // Rubros de materiales del Gantt (placas, cajones, puertas...): una tarea puede sacar su cantidad de ahi.
  rubros?: RubroFabricacion[];
  onGuardar: (t: TipoMueble) => void;
  onBorrar: (id: number) => void;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("fabricacion.tiposMueble", { label: 220, col: 100, colCompact: 76 });
  const [menu, setMenu] = useState<{ x: number; y: number; tipo: TipoMueble } | null>(null);
  const [abierto, setAbierto] = useState<number | null>(null);
  const ordenados = [...tipos].sort((a, b) => a.nombre.localeCompare(b.nombre));
  const nombreTarea = (id: number) => tareas.find((t) => t.id === id)?.nombre || "tarea borrada";
  const nuevo = (base: Partial<TipoMueble> = {}) => {
    const t: TipoMueble = { id: nuevoId(), nombre: "Mueble nuevo", receta: [], largo: 1, alto: 0.9, profundidad: 0.6, activa: true, ...base };
    onGuardar(t);
    setAbierto(t.id);
  };
  const desdeGrupo = (g: GrupoTrabajo) => {
    const ids = tareas.filter((t) => t.grupoId === g.id && t.activa !== false).map((t) => t.id);
    nuevo({ nombre: g.nombre, descripcion: g.descripcion, receta: recetaDesdeTareas(ids, nuevoId) });
  };
  const tipoAbierto = tipos.find((t) => t.id === abierto);

  return (
    <Panel
      span="full"
      title="Tipos de mueble"
      actions={
        <span style={{ display: "flex", gap: 6 }}>
          {grupos.length > 0 && (
            <select
              style={{ fontSize: 12.5, borderRadius: 8, border: "1px solid #cbd5e1", padding: "4px 6px" }}
              value=""
              onChange={(e) => {
                const g = grupos.find((x) => x.id === Number(e.target.value));
                if (g) desdeGrupo(g);
              }}
            >
              <option value="">Crear desde un grupo de trabajo…</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
          <ButtonLike onClick={() => nuevo()}>+ Tipo de mueble</ButtonLike>
        </span>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Cada tipo de mueble es una receta de tareas del catálogo, ordenada por pasos: las del mismo paso (3.1, 3.2) las pueden hacer distintas personas a la vez y el paso siguiente arranca cuando terminó todo el anterior. Cada tarea saca su cantidad de las medidas del mueble (por mueble, ml, m² o m³); con el tiempo estándar de la tarea da las horas. Click derecho: receta y prueba de tiempos, duplicar, pausar o borrar.
      </div>
      {ordenados.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Todavía no hay tipos de mueble. Creá uno o partí de un grupo de trabajo.</div>
      ) : (
        <div style={{ ...planillaWrap, ...anchos.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={thEsquina}>
                  Tipo de mueble
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }}>
                  Pasos
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
                </th>
                <th style={thColumna} title="Medidas habituales: largo × alto × profundidad (m)">Medidas</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Horas-hombre de UN mueble con las medidas habituales">Hs-hombre</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Horas de reloj mínimas: cada paso dura lo que su tarea más larga">Hs reloj</th>
                <th style={thFlexible}>Receta</th>
              </tr>
            </thead>
            <tbody>
              {ordenados.map((tipo) => {
                const pausado = tipo.activa === false;
                const calc = tareasDelMueble(tipo, { tipoMuebleId: tipo.id, cantidad: 1, largo: tipo.largo, alto: tipo.alto, profundidad: tipo.profundidad }, tareas);
                const res = resumenDeTiempos(calc);
                const faltanTiempos = calc.some((t) => t.sinTiempo || t.sinMaterial);
                return (
                  <tr
                    key={tipo.id}
                    style={{ opacity: pausado ? 0.5 : 1 }}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setMenu({ x: ev.clientX, y: ev.clientY, tipo });
                    }}
                  >
                    <td style={tdNombre}>
                      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                          title={pausado ? "Pausado (click para activar)" : "Activo (click para pausar)"}
                          onClick={() => onGuardar({ ...tipo, activa: pausado })}
                          style={{ width: 8, height: 8, borderRadius: 999, background: pausado ? "#cbd5e1" : "#16a34a", cursor: "pointer", flex: "none" }}
                        />
                        <input style={{ ...inputCelda, fontWeight: 700 }} value={tipo.nombre} onChange={(e) => onGuardar({ ...tipo, nombre: e.target.value })} {...focoCelda} />
                      </span>
                    </td>
                    <td style={{ ...tdDato, textAlign: "right" }}>{res.pasos.length}</td>
                    <td style={{ ...tdDato, fontSize: 12 }}>{[tipo.largo, tipo.alto, tipo.profundidad].map((x) => fmt(x || 0)).join(" × ")}</td>
                    <td style={{ ...tdDato, textAlign: "right", color: faltanTiempos ? "#b45309" : undefined }} title={faltanTiempos ? "Hay tareas sin tiempo estándar o que salen de materiales (se completan con el presupuesto): el total queda corto" : undefined}>
                      {fmt(res.horasHombre)}{faltanTiempos ? "*" : ""}
                    </td>
                    <td style={{ ...tdDato, textAlign: "right" }}>{fmt(res.horasReloj)}</td>
                    <td style={{ ...tdFlexible, fontSize: 12 }}>
                      {calc.length ? calc.map((t) => `${t.etiqueta} ${t.nombre}`).join(" · ") : <span style={{ color: "#94a3b8" }}>Sin tareas (click derecho → Receta…)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.tipo.nombre}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { setAbierto(menu.tipo.id); setMenu(null); }}>Receta y tiempos…</button>
          <button
            type="button"
            style={quickMenuItem}
            onClick={() => {
              const receta = menu.tipo.receta.map((r) => ({ ...r, id: nuevoId() }));
              nuevo({ ...menu.tipo, nombre: `${menu.tipo.nombre} (copia)`, receta });
              setMenu(null);
            }}
          >
            Duplicar
          </button>
          <button type="button" style={quickMenuItem} onClick={() => { onGuardar({ ...menu.tipo, activa: menu.tipo.activa === false }); setMenu(null); }}>
            {menu.tipo.activa === false ? "Activar" : "Pausar"}
          </button>
          <QuickMenuSep />
          <button
            type="button"
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              if (window.confirm(`¿Borrar el tipo de mueble "${menu.tipo.nombre}"?`)) onBorrar(menu.tipo.id);
              setMenu(null);
            }}
          >
            Borrar
          </button>
        </QuickMenu>
      )}

      {tipoAbierto && <EditorReceta tipo={tipoAbierto} tareas={tareas} grupos={grupos} rubros={rubros} onGuardar={onGuardar} onCerrar={() => setAbierto(null)} nuevoId={nuevoId} nombreTarea={nombreTarea} />}
    </Panel>
  );
}

function EditorReceta({
  tipo,
  tareas,
  grupos,
  rubros,
  onGuardar,
  onCerrar,
  nuevoId,
  nombreTarea,
}: {
  tipo: TipoMueble;
  tareas: TipoTarea[];
  grupos: GrupoTrabajo[];
  rubros: RubroFabricacion[];
  onGuardar: (t: TipoMueble) => void;
  onCerrar: () => void;
  nuevoId: () => number;
  nombreTarea: (id: number) => string;
}) {
  const anchos = usePlanillaWidths("fabricacion.receta", { label: 240, col: 96, colCompact: 70 });
  const [menu, setMenu] = useState<{ x: number; y: number; r: RenglonReceta } | null>(null);
  // La prueba no se guarda: es para ver tiempos con otras medidas o corregir cantidades.
  const [prueba, setPrueba] = useState({ cantidad: 1, largo: tipo.largo || 0, alto: tipo.alto || 0, profundidad: tipo.profundidad || 0 });
  const [ajustes, setAjustes] = useState<Record<number, number>>({});
  // Cantidades de materiales para probar (en el presupuesto salen solas de lo cotizado).
  const [materiales, setMateriales] = useState<Record<number, number>>({});
  const ordenada = recetaOrdenada(tipo.receta);
  const calc = tareasDelMueble(tipo, { tipoMuebleId: tipo.id, ...prueba, ajustes, materiales }, tareas);
  const rubrosMateriales = rubros.filter((r) => r.origen === "materiales" && r.activo !== false);
  const rubrosUsados = rubrosDeLaReceta(tipo).map((id) => rubros.find((r) => r.id === id)).filter((r): r is RubroFabricacion => !!r);
  const res = resumenDeTiempos(calc);
  const activas = tareas.filter((t) => t.activa !== false);
  const grupoDe = (t: TipoTarea) => grupos.find((g) => g.id === t.grupoId)?.nombre || "Sin grupo";
  const gruposDeTareas = Array.from(new Set(activas.map(grupoDe)));
  const guardarRenglon = (r: RenglonReceta) => onGuardar({ ...tipo, receta: tipo.receta.map((x) => (x.id === r.id ? r : x)) });
  const mover = (r: RenglonReceta, d: -1 | 1) => {
    const lista = ordenada.map(({ etiqueta, ...x }) => x);
    const i = lista.findIndex((x) => x.id === r.id);
    const j = i + d;
    if (j < 0 || j >= lista.length) return;
    // Cambia de lugar y toma el paso del vecino si era de otro paso (asi "subir" de verdad adelanta la tarea).
    const vecino = lista[j];
    const a = { ...r, paso: vecino.paso };
    const b = { ...vecino, paso: r.paso };
    lista[i] = b;
    lista[j] = a;
    onGuardar({ ...tipo, receta: lista });
  };
  const medida = (k: "largo" | "alto" | "profundidad" | "cantidad", label: string) => (
    <label style={{ display: "grid", gap: 2, fontSize: 11.5, color: "#64748b" }}>
      {label}
      <input
        type="number"
        min={0}
        step={k === "cantidad" ? 1 : 0.05}
        style={{ width: 80, fontSize: 13, padding: "4px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}
        value={prueba[k]}
        onChange={(e) => setPrueba({ ...prueba, [k]: Number(e.target.value) || 0 })}
      />
    </label>
  );

  return (
    <div style={overlay} onClick={onCerrar}>
      <div style={caja} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            style={{ fontSize: 16, fontWeight: 800, border: "none", borderBottom: "1px dashed #cbd5e1", flex: 1, padding: "2px 0" }}
            value={tipo.nombre}
            onChange={(e) => onGuardar({ ...tipo, nombre: e.target.value })}
          />
          <ButtonLike onClick={onCerrar}>Listo</ButtonLike>
        </div>
        <input
          style={{ fontSize: 13, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px" }}
          placeholder="Descripción (qué incluye, terminación, etc.)"
          value={tipo.descripcion || ""}
          onChange={(e) => onGuardar({ ...tipo, descripcion: e.target.value })}
        />

        <div style={sub}>Receta · por pasos</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Mismo número de paso = en paralelo (3.1, 3.2); el siguiente espera a que terminen todas. Click derecho sobre un renglón: subir, bajar, juntar con el paso anterior, borrar.
        </div>
        {activas.length === 0 && <div style={{ fontSize: 12.5, color: "#b45309" }}>No hay tareas en el catálogo (Fabricación → Tipos de tarea y grupos de trabajo).</div>}
        <div style={{ ...planillaWrap, ...anchos.vars }}>
          <table className="planilla" style={planillaTable}>
            <colgroup>
              <col style={{ width: 64 }} />
              <col style={colLabel} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colDato} />
              <col style={colFlexible} />
            </colgroup>
            <thead>
              <tr>
                <th style={{ ...thEsquina, textAlign: "right" }}>Paso</th>
                <th style={thColumna}>
                  Tarea
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
                </th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Cantidad de la tarea por cada unidad de la base">
                  Cantidad
                  <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
                </th>
                <th style={thColumna}>Sale de</th>
                <th style={{ ...thColumna, textAlign: "right" }} title="Tiempo estándar de la tarea (se edita en el catálogo)">h / unidad</th>
                <th style={thFlexible}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {ordenada.map((r) => {
                const t = tareas.find((x) => x.id === r.tareaId);
                return (
                  <tr
                    key={r.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setMenu({ x: ev.clientX, y: ev.clientY, r });
                    }}
                  >
                    <td style={tdNombre}>
                      <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
                        <input
                          style={{ ...inputCeldaDerecha, width: 34 }}
                          type="number"
                          min={1}
                          value={r.paso}
                          onChange={(e) => guardarRenglon({ ...r, paso: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
                          {...focoCelda}
                        />
                        {r.etiqueta.includes(".") && <span style={{ fontSize: 11, color: "#0f766e" }}>.{r.etiqueta.split(".")[1]}</span>}
                      </span>
                    </td>
                    <td style={tdDato}>
                      <select style={selectCelda} value={r.tareaId} onChange={(e) => guardarRenglon({ ...r, tareaId: Number(e.target.value) })}>
                        {!t && <option value={r.tareaId}>tarea borrada</option>}
                        {gruposDeTareas.map((g) => (
                          <optgroup key={g} label={g}>
                            {activas.filter((x) => grupoDe(x) === g).map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
                          </optgroup>
                        ))}
                      </select>
                    </td>
                    <td style={tdDato}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input
                          style={inputCeldaDerecha}
                          type="number"
                          min={0}
                          step={0.1}
                          value={r.factor}
                          onChange={(e) => guardarRenglon({ ...r, factor: Number(e.target.value) || 0 })}
                          {...focoCelda}
                        />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{unidadCorta(t?.unidad)}</span>
                      </span>
                    </td>
                    <td style={tdDato}>
                      <select
                        style={selectCelda}
                        value={r.base || t?.unidad || "u"}
                        onChange={(e) => guardarRenglon({ ...r, base: e.target.value as BaseCantidad })}
                      >
                        <optgroup label="Medidas del mueble">
                          {BASES_CANTIDAD.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                        </optgroup>
                        {rubrosMateriales.length > 0 && (
                          <optgroup label="Materiales del presupuesto">
                            {rubrosMateriales.map((rb) => <option key={rb.id} value={`rubro:${rb.id}`}>por {rb.unidad} de {rb.nombre.toLowerCase()}</option>)}
                          </optgroup>
                        )}
                      </select>
                    </td>
                    <td style={{ ...tdDato, textAlign: "right", color: t?.horasEstimadas ? undefined : "#b45309" }}>
                      {t?.horasEstimadas ? fmt(t.horasEstimadas) : "falta"}
                    </td>
                    <td style={tdFlexible}>
                      <input style={inputCelda} value={r.nota || ""} onChange={(e) => guardarRenglon({ ...r, nota: e.target.value || undefined })} {...focoCelda} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div>
          <ButtonLike
            secondary
            onClick={() => activas[0] && onGuardar({ ...tipo, receta: [...tipo.receta, { id: nuevoId(), tareaId: activas[0].id, paso: pasoSiguiente(tipo.receta), factor: 1 }] })}
          >
            + Tarea (paso siguiente)
          </ButtonLike>
        </div>

        <div style={sub}>Probar tiempos</div>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          {medida("cantidad", "Cantidad")}
          {medida("largo", "Largo (m)")}
          {medida("alto", "Alto (m)")}
          {medida("profundidad", "Profundidad (m)")}
          {rubrosUsados.map((rb) => (
            <label key={rb.id} style={{ display: "grid", gap: 2, fontSize: 11.5, color: "#64748b" }} title="En el presupuesto sale solo de los materiales cotizados">
              {rb.nombre} ({rb.unidad})
              <input
                type="number"
                min={0}
                style={{ width: 80, fontSize: 13, padding: "4px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                value={materiales[rb.id] ?? ""}
                placeholder="del ppto"
                onChange={(e) => setMateriales({ ...materiales, [rb.id]: Number(e.target.value) || 0 })}
              />
            </label>
          ))}
          <button
            type="button"
            style={{ fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", padding: "5px 8px", cursor: "pointer" }}
            onClick={() => onGuardar({ ...tipo, largo: prueba.largo, alto: prueba.alto, profundidad: prueba.profundidad })}
            title="Guardar estas medidas como las habituales del tipo de mueble"
          >
            Usar como medidas habituales
          </button>
        </div>
        {calc.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "3px 6px" }}>Paso</th>
                <th style={{ padding: "3px 6px" }}>Tarea</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>Cantidad</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>Horas</th>
              </tr>
            </thead>
            <tbody>
              {calc.map((t) => (
                <tr key={t.renglonId} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "3px 6px", color: "#0f766e", fontWeight: 700 }}>{t.etiqueta}</td>
                  <td style={{ padding: "3px 6px" }}>{t.nombre}</td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      title="Se calcula sola con las medidas; si la cambiás, manda lo tuyo"
                      style={{ width: 70, textAlign: "right", fontSize: 12.5, border: "1px solid", borderColor: t.ajustada ? "#f59e0b" : "#e2e8f0", borderRadius: 5, padding: "2px 4px" }}
                      value={t.cantidad}
                      onChange={(e) => setAjustes({ ...ajustes, [t.renglonId]: Number(e.target.value) || 0 })}
                    />{" "}
                    <span style={{ color: "#94a3b8" }}>{UNIDADES_TAREA.find((u) => u.value === t.unidad)?.label}</span>
                  </td>
                  <td style={{ padding: "3px 6px", textAlign: "right", color: t.sinTiempo || t.sinMaterial ? "#b45309" : undefined }}>
                    {t.sinTiempo ? "sin tiempo" : t.sinMaterial ? "falta el material" : fmt(t.horas)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", gap: 16, fontSize: 13, flexWrap: "wrap" }}>
          <span>
            <strong>{fmt(res.horasHombre)} h-hombre</strong> <span style={{ color: "#64748b" }}>(todo sumado)</span>
          </span>
          <span>
            <strong>{fmt(res.horasReloj)} h de reloj</strong> <span style={{ color: "#64748b" }}>como mínimo, si cada tarea de un mismo paso la hace otra persona</span>
          </span>
          {Object.keys(ajustes).length > 0 && (
            <button type="button" style={{ fontSize: 12, border: "none", background: "none", color: "#0f766e", cursor: "pointer" }} onClick={() => setAjustes({})}>
              Volver a lo calculado
            </button>
          )}
        </div>
      </div>

      {menu && (
        <span onClick={(e) => e.stopPropagation()}>
          <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
            <QuickMenuTitle>{nombreTarea(menu.r.tareaId)}</QuickMenuTitle>
            <button type="button" style={quickMenuItem} onClick={() => { mover(menu.r, -1); setMenu(null); }}>Subir</button>
            <button type="button" style={quickMenuItem} onClick={() => { mover(menu.r, 1); setMenu(null); }}>Bajar</button>
            <button
              type="button"
              style={quickMenuItem}
              title="Pasa al paso anterior: se hace en paralelo con esas tareas"
              onClick={() => { guardarRenglon({ ...menu.r, paso: Math.max(1, menu.r.paso - 1) }); setMenu(null); }}
            >
              En paralelo con el paso anterior
            </button>
            <button
              type="button"
              style={quickMenuItem}
              onClick={() => {
                // Abre un paso propio: corre un lugar todo lo que viene despues.
                const p = menu.r.paso;
                onGuardar({ ...tipo, receta: tipo.receta.map((x) => (x.id === menu.r.id ? { ...x, paso: p + 1 } : x.paso > p ? { ...x, paso: x.paso + 1 } : x)) });
                setMenu(null);
              }}
            >
              Separar en un paso propio
            </button>
            <QuickMenuSep />
            <button
              type="button"
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => { onGuardar({ ...tipo, receta: tipo.receta.filter((x) => x.id !== menu.r.id) }); setMenu(null); }}
            >
              Quitar de la receta
            </button>
          </QuickMenu>
        </span>
      )}
    </div>
  );
}
