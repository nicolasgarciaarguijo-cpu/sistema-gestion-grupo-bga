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
  actualizarGrupo,
  agregarGrupo,
  diferenciasConGrupo,
  gruposDeLaReceta,
  tareasDelGrupo,
  tildarGrupo,
  cantidadConDesperdicio,
  DESPERDICIO_POR_DEFECTO,
  type ItemStockParaMateriales,
  type MaterialDelTipo,
  rubrosDeLaReceta,
  pasoSiguiente,
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
  stock = [],
  onGuardar,
  onBorrar,
  nuevoId,
}: {
  // Items de Stock para la lista de materiales de cada tipo.
  stock?: ItemStockParaMateriales[];
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
    nuevo({ nombre: g.nombre, descripcion: g.descripcion, receta: agregarGrupo([], g.id, tareasDelGrupo(g.id, tareas, grupos), nuevoId) });
  };
  const tipoAbierto = tipos.find((t) => t.id === abierto);

  return (
    <Panel
      span="full"
      title="Tipos de mueble o trabajo"
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
              <option value="">Crear desde una tarea…</option>
              {grupos.map((g) => <option key={g.id} value={g.id}>{g.nombre}</option>)}
            </select>
          )}
          <ButtonLike onClick={() => nuevo()}>+ Tipo de mueble o trabajo</ButtonLike>
        </span>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Cada tipo de mueble o trabajo lleva las tareas que se le tildan en su ficha (cada una con su paso a paso), ordenadas por pasos: las del mismo paso (3.1, 3.2) las pueden hacer distintas personas a la vez y el paso siguiente arranca cuando terminó todo el anterior. Cada tarea saca su cantidad de las medidas del mueble (por mueble, ml, m² o m³); con el tiempo estándar de la tarea da las horas. Click derecho: abrir la ficha (tareas, receta y prueba de tiempos), duplicar, pausar o borrar. El nombre se corrige en la misma fila y la lista se ordena sola por nombre.
      </div>
      {ordenados.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Todavía no hay tipos de mueble o trabajo. Creá uno o partí de una tarea.</div>
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
                  Tipo de mueble o trabajo
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
                      {gruposDeLaReceta(tipo.receta).length > 0 && (
                        <strong style={{ color: "#0f766e" }}>{gruposDeLaReceta(tipo.receta).map((g) => grupos.find((x) => x.id === g)?.nombre || "grupo borrado").join(" + ")} · </strong>
                      )}
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
          <button type="button" style={quickMenuItem} onClick={() => { setAbierto(menu.tipo.id); setMenu(null); }}>Abrir ficha (tareas y tiempos)…</button>
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
              if (window.confirm(`¿Borrar el tipo de mueble o trabajo "${menu.tipo.nombre}"?`)) onBorrar(menu.tipo.id);
              setMenu(null);
            }}
          >
            Borrar
          </button>
        </QuickMenu>
      )}

      {tipoAbierto && <EditorReceta tipo={tipoAbierto} tareas={tareas} grupos={grupos} rubros={rubros} stock={stock} onGuardar={onGuardar} onCerrar={() => setAbierto(null)} nuevoId={nuevoId} nombreTarea={nombreTarea} />}
    </Panel>
  );
}

function EditorReceta({
  tipo,
  tareas,
  grupos,
  rubros,
  stock,
  onGuardar,
  onCerrar,
  nuevoId,
  nombreTarea,
}: {
  tipo: TipoMueble;
  tareas: TipoTarea[];
  grupos: GrupoTrabajo[];
  rubros: RubroFabricacion[];
  stock: ItemStockParaMateriales[];
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
  const [buscarMaterial, setBuscarMaterial] = useState("");
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
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, flexWrap: "wrap" }}>
          <strong>Personas que lo hacen:</strong>
          <input
            type="number"
            min={1}
            step={1}
            style={{ width: 70, fontSize: 13, padding: "4px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            placeholder="1"
            value={tipo.personas ?? ""}
            onChange={(e) => {
              const n = Math.round(Number(e.target.value) || 0);
              onGuardar({ ...tipo, personas: n > 0 ? n : undefined });
            }}
          />
          <span style={{ fontSize: 12, color: "#64748b" }}>
            Todas sus tareas las hace esta cantidad de personas y las horas se cargan contando con ellas. Si en la organización diaria hay menos, avisa.
          </span>
        </label>

        <div style={sub}>Tareas que lleva</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Tildá las tareas que lleva este tipo de mueble o trabajo. Cada una entra con su paso a paso (siempre el mismo). Las tareas, su paso a paso y las máquinas que usan se arman al fondo de Fabricación.
        </div>
        {grupos.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#b45309" }}>Todavía no hay tareas (se arman al fondo de Fabricación).</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 8 }}>
            {[...grupos]
              .sort((a, b) => a.nombre.localeCompare(b.nombre))
              .map((g) => {
                const asignado = gruposDeLaReceta(tipo.receta).includes(g.id);
                const pasos = tareasDelGrupo(g.id, tareas, grupos);
                const dif = diferenciasConGrupo(tipo.receta, g.id, pasos);
                const cambio = asignado && dif.faltan.length + dif.sobran.length > 0;
                return (
                  <div key={g.id} style={{ border: `1px solid ${asignado ? "#99f6e4" : "#e2e8f0"}`, background: asignado ? "#f0fdfa" : "#fff", borderRadius: 8, padding: "6px 10px" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={asignado}
                        onChange={(e) => {
                          if (!e.target.checked && !window.confirm(`¿Sacar la tarea "${g.nombre}" de este tipo de mueble o trabajo?`)) return;
                          onGuardar(tildarGrupo(tipo, g.id, e.target.checked, tareas, grupos, nuevoId));
                        }}
                      />
                      {g.nombre}
                      <span style={{ fontWeight: 400, color: "#64748b", fontSize: 12 }}>{pasos.length} pasos</span>
                    </label>
                    {cambio && (
                      <button
                        type="button"
                        style={{ border: "none", background: "none", color: "#b45309", fontWeight: 700, cursor: "pointer", padding: "2px 0", fontSize: 12 }}
                        title="El paso a paso cambió al fondo de Fabricación: lo pone al día en este tipo"
                        onClick={() => onGuardar({ ...tipo, receta: actualizarGrupo(tipo.receta, g.id, pasos, nuevoId) })}
                      >
                        el paso a paso cambió · actualizar
                      </button>
                    )}
                    {asignado && pasos.length > 0 && (
                      <ol style={{ margin: "4px 0 0", paddingLeft: 22, fontSize: 12, color: "#475569" }}>
                        {pasos.map((id) => <li key={id}>{nombreTarea(id)}</li>)}
                      </ol>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        <div style={sub}>Materiales (por cada mueble)</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Lo que lleva UN mueble de esta medida, sacado de Stock (con su precio de hoy). La cantidad es la exacta; el % de desperdicio se suma
          al presupuestar. El desperdicio del tipo vale para todos; cada material puede tener el suyo.
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
          Desperdicio del tipo:
          <input
            type="number"
            min={0}
            step={1}
            style={{ width: 70, fontSize: 13, padding: "4px 6px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            value={tipo.desperdicioPct ?? DESPERDICIO_POR_DEFECTO}
            onChange={(e) => onGuardar({ ...tipo, desperdicioPct: Math.max(0, Number(e.target.value) || 0) })}
          />
          %
        </div>
        {(tipo.materiales || []).length > 0 && (
          <table className="planilla" style={planillaTable}>
            <thead>
              <tr>
                <th style={thEsquina}>Material (Stock)</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Cantidad</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Desperdicio %</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Con desperdicio</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Precio</th>
                <th style={{ ...thColumna, textAlign: "right" }}>Subtotal</th>
                <th style={thFlexible} />
              </tr>
            </thead>
            <tbody>
              {(tipo.materiales || []).map((m) => {
                const it = stock.find((x) => x.id === m.stockItemId);
                const conDesp = cantidadConDesperdicio(tipo, m);
                const guardarM = (cambio: Partial<MaterialDelTipo>) =>
                  onGuardar({ ...tipo, materiales: (tipo.materiales || []).map((x) => (x.id === m.id ? { ...x, ...cambio } : x)) });
                return (
                  <tr key={m.id}>
                    <td style={tdNombre}>{it ? it.description : <span style={{ color: "#b91c1c" }}>borrado de Stock</span>}</td>
                    <td style={tdDato}>
                      <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                        <input style={inputCeldaDerecha} type="number" min={0} step={0.01} value={m.cantidad} onChange={(e) => guardarM({ cantidad: Number(e.target.value) || 0 })} {...focoCelda} />
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{it?.unit || ""}</span>
                      </span>
                    </td>
                    <td style={tdDato}>
                      <input
                        style={inputCeldaDerecha}
                        type="number"
                        min={0}
                        step={1}
                        placeholder={String(tipo.desperdicioPct ?? DESPERDICIO_POR_DEFECTO)}
                        value={m.desperdicioPct ?? ""}
                        onChange={(e) => guardarM({ desperdicioPct: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0) })}
                        {...focoCelda}
                      />
                    </td>
                    <td style={{ ...tdDato, textAlign: "right" }}>{fmt(conDesp)}</td>
                    <td style={{ ...tdDato, textAlign: "right", color: "#475569" }}>{it ? `$ ${fmt(it.unitPrice)}` : "·"}</td>
                    <td style={{ ...tdDato, textAlign: "right", fontWeight: 700 }}>{it ? `$ ${fmt(conDesp * it.unitPrice)}` : "·"}</td>
                    <td style={tdFlexible}>
                      <button
                        type="button"
                        style={{ border: "none", background: "none", color: "#b91c1c", cursor: "pointer" }}
                        title="Sacar el material"
                        onClick={() => onGuardar({ ...tipo, materiales: (tipo.materiales || []).filter((x) => x.id !== m.id) })}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <input
            list={`stock-${tipo.id}`}
            style={{ flex: 1, minWidth: 260, fontSize: 13, padding: "5px 8px", borderRadius: 6, border: "1px solid #cbd5e1" }}
            placeholder="+ Material de Stock: escribí para buscar y elegí"
            value={buscarMaterial}
            onChange={(e) => {
              const v = e.target.value;
              const it = stock.find((x) => x.description === v);
              if (it) {
                onGuardar({ ...tipo, materiales: [...(tipo.materiales || []), { id: nuevoId(), stockItemId: it.id, cantidad: 1 }] });
                setBuscarMaterial("");
              } else setBuscarMaterial(v);
            }}
          />
          <datalist id={`stock-${tipo.id}`}>
            {stock.map((x) => <option key={x.id} value={x.description}>{x.group}</option>)}
          </datalist>
          {(tipo.materiales || []).length > 0 && (
            <strong style={{ fontSize: 13 }}>
              Materiales de un mueble: $ {fmt((tipo.materiales || []).reduce((a, m) => a + cantidadConDesperdicio(tipo, m) * Number(stock.find((x) => x.id === m.stockItemId)?.unitPrice || 0), 0))}
            </strong>
          )}
        </div>

        <div style={sub}>Receta · por pasos</div>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Mismo número de paso = en paralelo (3.1, 3.2); el siguiente espera a que terminen todas. Los pasos de las tareas tildadas quedan en verde. Click derecho sobre un renglón: subir, bajar, juntar con el paso anterior, borrar.
        </div>
        {activas.length === 0 && <div style={{ fontSize: 12.5, color: "#b45309" }}>No hay pasos cargados (al fondo de Fabricación → Tareas y su paso a paso).</div>}
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
                <th style={{ ...thColumna, textAlign: "right" }} title="Horas de reloj por mueble, hechas por las personas del tipo. Vacío = cantidad × tiempo estándar de la tarea">Horas x mueble</th>
                <th style={thFlexible}>Nota</th>
              </tr>
            </thead>
            <tbody>
              {ordenada.map((r, i) => {
                const t = tareas.find((x) => x.id === r.tareaId);
                // Encabezado de operacion: cuando arranca un grupo (Operacion 1 · Corte CNC).
                const arrancaGrupo = r.grupoId != null && ordenada[i - 1]?.grupoId !== r.grupoId;
                const nroOperacion = r.grupoId != null ? gruposDeLaReceta(tipo.receta).indexOf(r.grupoId) + 1 : 0;
                return (
                  <React.Fragment key={r.id}>
                  {arrancaGrupo && (
                    <tr>
                      <td colSpan={6} style={{ ...tdNombre, background: "#f0fdfa", color: "#0f766e", fontWeight: 800, fontSize: 12.5 }}>
                        Operación {nroOperacion} · {grupos.find((g) => g.id === r.grupoId)?.nombre || "grupo borrado"}
                      </td>
                    </tr>
                  )}
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
                    <td style={tdDato} title={r.grupoId != null ? `Del grupo ${grupos.find((x) => x.id === r.grupoId)?.nombre || "borrado"}` : undefined}>
                      <select style={{ ...selectCelda, color: r.grupoId != null ? "#0f766e" : undefined }} value={r.tareaId} onChange={(e) => guardarRenglon({ ...r, tareaId: Number(e.target.value) })}>
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
                    <td style={tdDato}>
                      <input
                        style={inputCeldaDerecha}
                        type="number"
                        min={0}
                        step={0.25}
                        placeholder={t?.horasEstimadas ? `${fmt(t.horasEstimadas)}/u` : "falta"}
                        value={r.horas ?? ""}
                        onChange={(e) => guardarRenglon({ ...r, horas: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0) })}
                        {...focoCelda}
                      />
                    </td>
                    <td style={tdFlexible}>
                      <input style={inputCelda} value={r.nota || ""} onChange={(e) => guardarRenglon({ ...r, nota: e.target.value || undefined })} {...focoCelda} />
                    </td>
                  </tr>
                  </React.Fragment>
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
            title="Guardar estas medidas como las habituales del tipo de mueble o trabajo"
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
