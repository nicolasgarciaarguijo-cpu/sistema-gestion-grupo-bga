// PERSONAL · CATEGORIAS INTERNAS (Nicolas, 2026-10-25). La planilla de categorias (editable, con las
// tareas de fabricacion que da cada una y a que categorias inferiores incluye) y el bloque de la ficha del
// empleado donde se tildan las suyas. La logica vive en domain/categoriasEmpleado.ts.
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
  inputCelda, inputCeldaDerecha, focoCelda,
} from "../ui/planilla";
import {
  avanceDeCategoria,
  capacidadesDelEmpleado,
  categoriasEfectivas,
  dominaPaso,
  listoParaAumento,
  marcarTarea,
  type ListoParaAumento,
  ESCALONES_POR_DEFECTO,
  etiquetaCategoria,
  hayCiclo,
  insertarEscalon,
  moverEscalon,
  nombreEscalon,
  quitarEscalon,
  tareasHeredadas,
  type CategoriaEmpleado,
} from "../domain/categoriasEmpleado";
import { UNIDADES_TAREA, type GrupoTrabajo, type TipoTarea } from "../domain/organizacionDiaria";

type EmpleadoCat = { id: number; name: string; category?: string; categoriasInternas?: number[]; tareasDominadas?: number[] };

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(680px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const sub: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 };
const check: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 13, padding: "2px 0", cursor: "pointer" };
const unidadLabel = (t?: TipoTarea) => UNIDADES_TAREA.find((u) => u.value === (t?.unidad || "u"))?.label || "unidades";

// Escalon por escalon (1 Aprendiz ... 5 Responsable), y al final las habilidades extra.
const claveEscalon = (c: CategoriaEmpleado) => (c.extra ? Number.MAX_SAFE_INTEGER : c.nivel);
const ordenarPorEscalon = (cats: CategoriaEmpleado[]) =>
  [...cats].sort((a, b) => claveEscalon(a) - claveEscalon(b) || a.nombre.localeCompare(b.nombre) || (a.area || "").localeCompare(b.area || ""));
const tituloEscalon = (c: CategoriaEmpleado, escalones?: string[]) => (c.extra ? "Habilidades extra · se suman a cualquier escalón" : `Escalón ${c.nivel} · ${nombreEscalon(c.nivel, escalones)}`);
const filaTitulo: React.CSSProperties = { background: "#f8fafc", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, padding: "5px 8px" };

// Tareas agrupadas como en el catalogo de Fabricacion (grupo de trabajo), para tildar.
function tareasPorGrupo(tipos: TipoTarea[], grupos: GrupoTrabajo[]) {
  const activos = tipos.filter((t) => t.activa !== false);
  const orden = [...grupos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre));
  const out: Array<{ nombre: string; grupoId: number | null; tareas: TipoTarea[] }> = orden
    .map((g) => ({ nombre: g.nombre, grupoId: g.id as number | null, tareas: activos.filter((t) => t.grupoId === g.id) }))
    .filter((x) => x.tareas.length);
  const sueltas = activos.filter((t) => !t.grupoId || !grupos.some((g) => g.id === t.grupoId));
  if (sueltas.length) out.push({ nombre: "Sin grupo", grupoId: null, tareas: sueltas });
  return out;
}

export function CategoriasInternas({
  categorias,
  tipos,
  grupos,
  empleados,
  onGuardar,
  onBorrar,
  nuevoId,
  escalones = ESCALONES_POR_DEFECTO,
  onGuardarEscalones,
  categoriasGremio = [],
}: {
  // Las categorias del gremio (las de la escala salarial), para vincular cada interna con la suya.
  categoriasGremio?: string[];
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  grupos: GrupoTrabajo[];
  empleados: EmpleadoCat[];
  onGuardar: (c: CategoriaEmpleado) => void;
  onBorrar: (id: number) => void;
  nuevoId: () => number;
  escalones?: string[];
  // Renombrar, sumar o reordenar escalones: si cambian los niveles, viajan tambien las categorias.
  onGuardarEscalones?: (escalones: string[], categorias?: CategoriaEmpleado[]) => void;
}) {
  const anchos = usePlanillaWidths("personal.categorias", { label: 230, col: 96, colCompact: 70 });
  const [menu, setMenu] = useState<{ x: number; y: number; cat: CategoriaEmpleado } | null>(null);
  const [editTareas, setEditTareas] = useState<number | null>(null);
  const [editIncluye, setEditIncluye] = useState<number | null>(null);
  const [menuEscalon, setMenuEscalon] = useState<{ x: number; y: number; nivel: number } | null>(null);
  const ordenadas = ordenarPorEscalon(categorias);
  // Filas de la planilla: cada escalon (aunque este vacio) con sus categorias, y al final las extra.
  const cantEscalones = Math.max(escalones.length, ...categorias.filter((c) => !c.extra).map((c) => c.nivel), 0);
  type Fila = { k: "titulo"; nivel: number | null } | { k: "cat"; cat: CategoriaEmpleado } | { k: "vacio"; nivel: number };
  const filas: Fila[] = [];
  for (let n = 1; n <= cantEscalones; n++) {
    filas.push({ k: "titulo", nivel: n });
    const deEste = ordenadas.filter((c) => !c.extra && c.nivel === n);
    if (deEste.length) deEste.forEach((cat) => filas.push({ k: "cat", cat }));
    else filas.push({ k: "vacio", nivel: n });
  }
  const extras = ordenadas.filter((c) => c.extra);
  if (extras.length) {
    filas.push({ k: "titulo", nivel: null });
    extras.forEach((cat) => filas.push({ k: "cat", cat }));
  }
  const completos = Array.from({ length: cantEscalones }, (_, i) => nombreEscalon(i + 1, escalones));
  const guardarEsc = (r: { escalones: string[]; categorias: CategoriaEmpleado[] } | null) => r && onGuardarEscalones?.(r.escalones, r.categorias);
  const nombreTarea = (id: number) => tipos.find((t) => t.id === id)?.nombre;
  const nombreCat = (id: number) => {
    const x = categorias.find((c) => c.id === id);
    return x ? etiquetaCategoria(x, categorias) : "—";
  };
  // Quienes estan en una categoria: la tienen tildada o la alcanzan por una superior.
  const empleadosDe = (catId: number) => empleados.filter((e) => categoriasEfectivas(e.categoriasInternas, categorias).has(catId));
  const abrirMenu = (ev: React.MouseEvent, cat: CategoriaEmpleado) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMenu({ x: ev.clientX, y: ev.clientY, cat });
  };
  const nueva = (nivel = 1) => onGuardar({ id: nuevoId(), nombre: "Categoría nueva", nivel, incluye: [], tareaIds: [], activa: true });
  const catTareas = categorias.find((c) => c.id === editTareas);
  const catIncluye = categorias.find((c) => c.id === editIncluye);

  return (
    <Panel span="full" title="Categorías internas" actions={<ButtonLike onClick={() => nueva()}>+ Categoría</ButtonLike>}>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        No son las del convenio (esas liquidan): son las capacidades de cada persona, por escalones. Cada una se vincula con su categoría del gremio (columna Gremio): quien domina todas sus tareas y cobra una categoría más baja queda listo para un aumento. Aprendiz → Ayudante general → Ayudante especializado (con su rumbo) → el oficio → Responsable. Cada escalón suma lo de abajo, así que quien sube conserva lo que ya hacía, y se priorizan las tareas del escalón más alto. Las habilidades extra (Terminaciones) no son escalón: se suman a quien las tenga. Click derecho sobre una categoría: tareas, qué incluye, pausar o borrar. Click derecho sobre el título de un escalón: subirlo, bajarlo, sumar uno nuevo o quitarlo; el nombre se escribe ahí mismo.
      </div>
      {tipos.length === 0 && (
        <div style={{ fontSize: 12.5, color: "#b45309", marginBottom: 8 }}>
          Todavía no hay tareas en el catálogo de Fabricación (Fabricación → Tipos de tarea y grupos de trabajo). Cargalas ahí y después asignalas a cada categoría.
        </div>
      )}
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
            <col style={colDato} />
            <col style={colFlexible} />
          </colgroup>
          <thead>
            <tr>
              <th style={thEsquina}>
                Categoría
                <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
              </th>
              <th style={{ ...thColumna, textAlign: "right" }} title="Escalón: a más alto, más prioridad tienen sus tareas">
                Escalón
                <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
              </th>
              <th style={thColumna} title="Rumbo / área dentro del escalón (vacío = vale para todos)">Rumbo</th>
              <th style={thColumna} title="Categoría del gremio (convenio) que le corresponde: sirve para saber quién está listo para un aumento">Gremio</th>
              <th style={thColumna}>Incluye a</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Tareas propias</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Con heredadas</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Personas</th>
              <th style={thFlexible}>Tareas que da</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              if (f.k === "titulo") {
                if (f.nivel == null) return <tr key="t-extra"><td colSpan={9} style={filaTitulo}>Habilidades extra · se suman a cualquier escalón</td></tr>;
                const nivel = f.nivel;
                return (
                  <tr
                    key={`t-${nivel}`}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      ev.stopPropagation();
                      setMenuEscalon({ x: ev.clientX, y: ev.clientY, nivel });
                    }}
                  >
                    <td colSpan={9} style={filaTitulo}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        Escalón {nivel} ·
                        <input
                          style={{ ...inputCelda, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: "#475569", maxWidth: 260 }}
                          value={nombreEscalon(nivel, escalones)}
                          onChange={(e) => onGuardarEscalones?.(completos.map((x, i) => (i === nivel - 1 ? e.target.value : x)))}
                          {...focoCelda}
                        />
                      </span>
                    </td>
                  </tr>
                );
              }
              if (f.k === "vacio") {
                return (
                  <tr key={`v-${f.nivel}`}>
                    <td colSpan={9} style={{ ...tdFlexible, fontSize: 12, color: "#94a3b8" }}>
                      Sin categorías en este escalón ·{" "}
                      <button type="button" style={{ border: "none", background: "none", color: "#0f766e", cursor: "pointer", fontSize: 12, padding: 0 }} onClick={() => nueva(f.nivel)}>
                        + Categoría acá
                      </button>
                    </td>
                  </tr>
                );
              }
              const cat = f.cat;
              const heredadas = tareasHeredadas(cat, categorias);
              const gente = empleadosDe(cat.id);
              const pausada = cat.activa === false;
              return (
                <React.Fragment key={cat.id}>
                <tr onContextMenu={(ev) => abrirMenu(ev, cat)} style={{ opacity: pausada ? 0.5 : 1 }}>
                  <td style={tdNombre}>
                    <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span
                        title={pausada ? "Pausada (click para activar)" : "Activa (click para pausar)"}
                        onClick={() => onGuardar({ ...cat, activa: pausada })}
                        style={{ width: 8, height: 8, borderRadius: 999, background: pausada ? "#cbd5e1" : "#16a34a", cursor: "pointer", flex: "none" }}
                      />
                      <input style={{ ...inputCelda, fontWeight: 700 }} value={cat.nombre} onChange={(e) => onGuardar({ ...cat, nombre: e.target.value })} {...focoCelda} />
                    </span>
                  </td>
                  <td style={tdDato}>
                    {cat.extra ? (
                      <span style={{ display: "block", textAlign: "right", fontSize: 12, color: "#7c3aed" }}>extra</span>
                    ) : (
                      <input
                        style={inputCeldaDerecha}
                        type="number"
                        min={1}
                        value={cat.nivel}
                        onChange={(e) => onGuardar({ ...cat, nivel: Math.max(1, Number(e.target.value) || 1) })}
                        {...focoCelda}
                      />
                    )}
                  </td>
                  <td style={tdDato}>
                    <input style={inputCelda} value={cat.area || ""} placeholder="—" onChange={(e) => onGuardar({ ...cat, area: e.target.value || undefined })} {...focoCelda} />
                  </td>
                  <td style={tdDato}>
                    <select style={{ ...inputCelda, color: cat.categoriaGremio ? undefined : "#94a3b8" }} value={cat.categoriaGremio || ""} onChange={(e) => onGuardar({ ...cat, categoriaGremio: e.target.value || undefined })}>
                      <option value="">—</option>
                      {[...categoriasGremio, ...(cat.categoriaGremio && !categoriasGremio.includes(cat.categoriaGremio) ? [cat.categoriaGremio] : [])].map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </td>
                  <td style={{ ...tdDato, fontSize: 12, color: "#475569" }} title={cat.incluye.map(nombreCat).join(", ")}>
                    {cat.incluye.length ? cat.incluye.map(nombreCat).join(", ") : "—"}
                  </td>
                  <td style={{ ...tdDato, textAlign: "right" }}>{cat.tareaIds.length}</td>
                  <td style={{ ...tdDato, textAlign: "right" }}>{cat.tareaIds.length + heredadas.length}</td>
                  <td style={{ ...tdDato, textAlign: "right" }} title={gente.map((e) => e.name).join(", ")}>{gente.length}</td>
                  <td style={{ ...tdFlexible, fontSize: 12 }}>
                    {cat.tareaIds.map(nombreTarea).filter(Boolean).join(" · ")}
                    {heredadas.length > 0 && (
                      <span style={{ color: "#94a3b8" }}>
                        {cat.tareaIds.length ? " · " : ""}+ {heredadas.map(nombreTarea).filter(Boolean).join(" · ")}
                      </span>
                    )}
                    {!cat.tareaIds.length && !heredadas.length && <span style={{ color: "#94a3b8" }}>Sin tareas (click derecho → Tareas…)</span>}
                  </td>
                </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {menuEscalon && (
        <QuickMenu x={menuEscalon.x} y={menuEscalon.y} onClose={() => setMenuEscalon(null)}>
          <QuickMenuTitle>Escalón {menuEscalon.nivel} · {nombreEscalon(menuEscalon.nivel, escalones)}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { nueva(menuEscalon.nivel); setMenuEscalon(null); }}>+ Categoría en este escalón</button>
          <QuickMenuSep />
          <button type="button" style={quickMenuItem} disabled={menuEscalon.nivel >= cantEscalones} onClick={() => { guardarEsc(moverEscalon(completos, categorias, menuEscalon.nivel, 1)); setMenuEscalon(null); }}>Subir un lugar</button>
          <button type="button" style={quickMenuItem} disabled={menuEscalon.nivel <= 1} onClick={() => { guardarEsc(moverEscalon(completos, categorias, menuEscalon.nivel, -1)); setMenuEscalon(null); }}>Bajar un lugar</button>
          <button type="button" style={quickMenuItem} onClick={() => { guardarEsc(insertarEscalon(completos, categorias, menuEscalon.nivel)); setMenuEscalon(null); }}>+ Escalón nuevo encima</button>
          <button type="button" style={quickMenuItem} onClick={() => { guardarEsc(insertarEscalon(completos, categorias, menuEscalon.nivel - 1)); setMenuEscalon(null); }}>+ Escalón nuevo debajo</button>
          <QuickMenuSep />
          <button
            type="button"
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              const r = quitarEscalon(completos, categorias, menuEscalon.nivel);
              if (!r) window.alert("Solo se puede quitar un escalón vacío: primero mové o borrá sus categorías.");
              else guardarEsc(r);
              setMenuEscalon(null);
            }}
          >
            Quitar escalón
          </button>
        </QuickMenu>
      )}

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.cat.nombre}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { setEditTareas(menu.cat.id); setMenu(null); }}>Tareas…</button>
          <button type="button" style={quickMenuItem} onClick={() => { setEditIncluye(menu.cat.id); setMenu(null); }}>Qué categorías incluye…</button>
          <button type="button" style={quickMenuItem} onClick={() => { onGuardar({ ...menu.cat, activa: menu.cat.activa === false }); setMenu(null); }}>
            {menu.cat.activa === false ? "Activar" : "Pausar"}
          </button>
          <button
            type="button"
            style={quickMenuItem}
            onClick={() => { onGuardar(menu.cat.extra ? { ...menu.cat, extra: false, nivel: Math.max(1, menu.cat.nivel) } : { ...menu.cat, extra: true }); setMenu(null); }}
          >
            {menu.cat.extra ? "Pasar a escalón" : "Convertir en habilidad extra"}
          </button>
          <QuickMenuSep />
          <button type="button" style={quickMenuItem} onClick={() => { nueva(menu.cat.extra ? 1 : menu.cat.nivel); setMenu(null); }}>+ Categoría nueva</button>
          <button
            type="button"
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              const gente = empleados.filter((e) => (e.categoriasInternas || []).includes(menu.cat.id));
              const aviso = gente.length ? ` La tienen tildada ${gente.length} persona(s): ${gente.map((e) => e.name).join(", ")}.` : "";
              if (window.confirm(`¿Borrar la categoría "${menu.cat.nombre}"?${aviso}`)) onBorrar(menu.cat.id);
              setMenu(null);
            }}
          >
            Borrar
          </button>
        </QuickMenu>
      )}

      {catTareas && (
        <div style={overlay} onClick={() => setEditTareas(null)}>
          <div style={caja} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Tareas de {etiquetaCategoria(catTareas, categorias)}</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Tildá las Tareas propias de esta categoría: cada una va entera, con todo su paso a paso. Las que ya da una categoría que incluye aparecen como heredadas: no hace falta repetirlas.
            </div>
            {(() => {
              const heredadas = new Set(tareasHeredadas(catTareas, categorias));
              const bloques = tareasPorGrupo(tipos, grupos);
              if (!bloques.length) return <div style={{ fontSize: 13, color: "#b45309" }}>No hay tareas en el catálogo de Fabricación.</div>;
              const tareasEnteras = bloques.filter((b) => b.grupoId != null);
              const sueltas = bloques.filter((b) => b.grupoId == null);
              return (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 4 }}>
                    {tareasEnteras.map((b) => {
                      const ids = b.tareas.map((t) => t.id);
                      const propia = ids.some((id) => catTareas.tareaIds.includes(id));
                      const heredada = !propia && ids.some((id) => heredadas.has(id));
                      return (
                        <label key={b.nombre} style={{ ...check, color: heredada ? "#94a3b8" : undefined }} title={b.tareas.map((t) => t.nombre).join(" → ")}>
                          <input
                            type="checkbox"
                            checked={propia || heredada}
                            disabled={heredada}
                            onChange={(e) =>
                              onGuardar({
                                ...catTareas,
                                tareaIds: e.target.checked ? Array.from(new Set([...catTareas.tareaIds, ...ids])) : catTareas.tareaIds.filter((x) => !ids.includes(x)),
                              })
                            }
                          />
                          {b.nombre}
                          {heredada && <span style={{ fontSize: 11.5, color: "#94a3b8" }}>· heredada</span>}
                        </label>
                      );
                    })}
                  </div>
                  {sueltas.map((b) => (
                <div key={b.nombre}>
                  <div style={sub}>{b.nombre}</div>
                  {b.tareas.map((t) => {
                    const propia = catTareas.tareaIds.includes(t.id);
                    const heredada = heredadas.has(t.id);
                    return (
                      <label key={t.id} style={{ ...check, color: heredada && !propia ? "#94a3b8" : undefined }}>
                        <input
                          type="checkbox"
                          checked={propia || heredada}
                          disabled={heredada && !propia}
                          onChange={(e) =>
                            onGuardar({ ...catTareas, tareaIds: e.target.checked ? [...catTareas.tareaIds, t.id] : catTareas.tareaIds.filter((x) => x !== t.id) })
                          }
                        />
                        {t.nombre}
                        <span style={{ fontSize: 11.5, color: "#94a3b8" }}>
                          ({unidadLabel(t)}{t.horasEstimadas ? ` · ${t.horasEstimadas} h por unidad` : ""}){heredada && !propia ? " · heredada" : ""}
                        </span>
                      </label>
                    );
                  })}
                </div>
                  ))}
                </>
              );
            })()}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ButtonLike onClick={() => setEditTareas(null)}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}

      {catIncluye && (
        <div style={overlay} onClick={() => setEditIncluye(null)}>
          <div style={caja} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>¿Qué categorías incluye {catIncluye.nombre}?</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Quien tenga {catIncluye.nombre} también puede hacer todas las tareas de las que tildes acá (y de las que esas incluyen, en cascada).
            </div>
            {ordenadas
              .filter((x) => x.id !== catIncluye.id)
              .map((x) => {
                const tiene = catIncluye.incluye.includes(x.id);
                const ciclo = !tiene && hayCiclo(catIncluye.id, [...catIncluye.incluye, x.id], categorias);
                return (
                  <label key={x.id} style={{ ...check, color: ciclo ? "#94a3b8" : undefined }} title={ciclo ? `${x.nombre} ya incluye a ${catIncluye.nombre}: se armaría un círculo` : undefined}>
                    <input
                      type="checkbox"
                      checked={tiene}
                      disabled={ciclo}
                      onChange={(e) => onGuardar({ ...catIncluye, incluye: e.target.checked ? [...catIncluye.incluye, x.id] : catIncluye.incluye.filter((id) => id !== x.id) })}
                    />
                    {etiquetaCategoria(x, categorias)} <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{x.extra ? "extra" : `escalón ${x.nivel}`}{ciclo ? " · ya la incluye a ella" : ""}</span>
                  </label>
                );
              })}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ButtonLike onClick={() => setEditIncluye(null)}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ---- En la ficha del empleado: tildar sus categorias y ver lo que puede hacer --------------------------
// FICHA DEL EMPLEADO (Nicolas, 31/10/2026): las dos categorias a la vista (la del gremio, que cobra, y las internas); cada
// categoria interna se abre con un click y muestra sus Tareas con la casilla "domina" (se marcan una por una: "hoy en dia no
// todos dominan todo y tienen la misma categoria"). Al 100% de una categoria vinculada a una del gremio mas alta, avisa.
export function CategoriasDelEmpleado({
  empleado,
  categorias,
  tipos,
  grupos = [],
  onCambiar,
  onCambiarDominadas,
  escalones,
  valorGremio,
}: {
  empleado: EmpleadoCat;
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  grupos?: GrupoTrabajo[];
  onCambiar: (ids: number[]) => void;
  onCambiarDominadas?: (ids: number[]) => void;
  escalones?: string[];
  // Valor hora de la escala del mes de una categoria del gremio (0 = sin escala).
  valorGremio?: (categoria: string) => number;
}) {
  const tildadas = empleado.categoriasInternas || [];
  const dominadas = empleado.tareasDominadas || [];
  const efectivas = categoriasEfectivas(tildadas, categorias);
  const caps = capacidadesDelEmpleado(tildadas, categorias, dominadas);
  const ordenadas = ordenarPorEscalon(categorias.filter((c) => c.activa !== false));
  const titulo = (c: CategoriaEmpleado) => tituloEscalon(c, escalones);
  const bloques = Array.from(new Set(ordenadas.map(titulo)));
  const etiquetaEnBloque = (c: CategoriaEmpleado) => (c.area && ordenadas.filter((x) => titulo(x) === titulo(c) && x.nombre === c.nombre).length > 1 ? c.area : c.nombre);
  const [abierta, setAbierta] = useState<number | null>(null);
  const cat = categorias.find((c) => c.id === abierta) || null;
  const listo: ListoParaAumento | null = valorGremio ? listoParaAumento(dominadas, empleado.category || "", categorias, tipos, valorGremio) : null;
  const nombreTarea = (pasoId: number) => {
    const t = tipos.find((x) => x.id === pasoId);
    return (t?.grupoId != null ? grupos.find((g) => g.id === t.grupoId)?.nombre : undefined) || t?.nombre || "tarea borrada";
  };
  const pasosDeLaTarea = (pasoId: number) => {
    const g = tipos.find((x) => x.id === pasoId)?.grupoId;
    return g != null ? tipos.filter((x) => x.grupoId === g).map((x) => x.id) : [pasoId];
  };
  // Las Tareas de la categoria abierta (una por Tarea, propias primero).
  const tareasDe = (c: CategoriaEmpleado) => {
    const vistas = new Set<string>();
    const out: Array<{ paso: number; heredada: boolean }> = [];
    [...c.tareaIds.map((p) => ({ paso: p, heredada: false })), ...tareasHeredadas(c, categorias).map((p) => ({ paso: p, heredada: true }))].forEach((x) => {
      const k = String(tipos.find((t) => t.id === x.paso)?.grupoId ?? `p${x.paso}`);
      if (vistas.has(k)) return;
      vistas.add(k);
      out.push(x);
    });
    return out;
  };
  const chip = (c: CategoriaEmpleado) => {
    const av = avanceDeCategoria(c, categorias, dominadas, tipos);
    const tiene = tildadas.includes(c.id);
    const incluida = !tiene && efectivas.has(c.id);
    const sel = abierta === c.id;
    return (
      <button
        key={c.id}
        type="button"
        onClick={() => setAbierta(sel ? null : c.id)}
        title={`${etiquetaCategoria(c, categorias)}${c.categoriaGremio ? ` · gremio: ${c.categoriaGremio}` : ""} · domina ${av.dominadas} de ${av.total} tareas`}
        style={{
          display: "flex", justifyContent: "space-between", gap: 6, alignItems: "center", width: "100%", textAlign: "left",
          border: `1px solid ${sel ? "#0f766e" : av.completa ? "#86efac" : "#e2e8f0"}`, borderRadius: 8, padding: "4px 8px", cursor: "pointer", fontSize: 12.5,
          background: sel ? "#f0fdfa" : tiene ? "#ecfeff" : "#fff", fontWeight: tiene ? 700 : 400, color: incluida ? "#64748b" : "#0f172a",
        }}
      >
        <span>{tiene ? "● " : incluida ? "◐ " : ""}{etiquetaEnBloque(c)}</span>
        <span style={{ fontSize: 11, color: av.completa ? "#166534" : "#64748b", fontWeight: 600 }}>{av.total ? `${av.dominadas}/${av.total}` : "—"}{av.completa ? " ✓" : ""}</span>
      </button>
    );
  };
  return (
    <Panel title="Categorías y tareas que domina" span="full" nested>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, marginBottom: 6 }}>
        <span>Gremio (cobra): <strong>{empleado.category || "—"}</strong>{valorGremio && empleado.category ? <span style={{ color: "#64748b" }}> · ${valorGremio(empleado.category).toLocaleString("es-AR", { maximumFractionDigits: 2 })}/h</span> : null}</span>
        <span>Internas: <strong>{tildadas.length ? tildadas.map((id) => { const c = categorias.find((k) => k.id === id); return c ? etiquetaCategoria(c, categorias) : ""; }).filter(Boolean).join(", ") : "sin asignar"}</strong></span>
        <span>Domina: <strong>{new Set(dominadas.map((d) => tipos.find((t) => t.id === d)?.grupoId ?? `p${d}`)).size}</strong> tareas</span>
      </div>
      {listo && (
        <div style={{ fontSize: 13, color: "#166534", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
          ⬆ Listo para pasar a <strong>{listo.gremio}</strong>: domina todas las tareas de {etiquetaCategoria(listo.categoria, categorias)} y cobra {listo.actual || "sin categoría"}.
        </div>
      )}
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Click en una categoría para ver sus tareas: ahí se asigna la categoría y se tilda cada tarea que domina. ● asignada · ◐ incluida por una superior · n/m tareas que domina · ✓ completa.
        Con tareas tildadas, en la organización diaria, el cronograma y el presupuesto solo cuenta lo que domina; sin ninguna, las de sus categorías.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "4px 14px" }}>
        {bloques.map((b) => (
          <div key={b} style={{ display: "grid", gap: 3, alignContent: "start" }}>
            <div style={sub}>{b.replace(" · se suman a cualquier escalón", "")}</div>
            {ordenadas.filter((c) => titulo(c) === b).map(chip)}
          </div>
        ))}
      </div>
      {cat && (() => {
        const lista = tareasDe(cat);
        const tiene = tildadas.includes(cat.id);
        const av = avanceDeCategoria(cat, categorias, dominadas, tipos);
        return (
          <div style={{ border: "1px solid #99f6e4", background: "#f0fdfa", borderRadius: 10, padding: "8px 12px", marginTop: 8, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <strong>{etiquetaCategoria(cat, categorias)}</strong>
              <span style={{ fontSize: 12, color: "#475569" }}>gremio: {cat.categoriaGremio || "sin vincular"}</span>
              <span style={{ fontSize: 12, color: av.completa ? "#166534" : "#475569", fontWeight: 600 }}>domina {av.dominadas} de {av.total}{av.completa ? " ✓" : ""}</span>
              <label style={{ ...check, marginLeft: "auto" }}>
                <input type="checkbox" checked={tiene} onChange={(e) => onCambiar(e.target.checked ? [...tildadas, cat.id] : tildadas.filter((id) => id !== cat.id))} />
                Tiene esta categoría
              </label>
            </div>
            {lista.length === 0 ? (
              <div style={{ fontSize: 12.5, color: "#b45309" }}>Esta categoría todavía no tiene tareas (Personal → Categorías internas → click derecho → Tareas…).</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "2px 14px" }}>
                {lista.map((x) => {
                  const ok = dominaPaso(dominadas, x.paso, tipos);
                  return (
                    <label key={x.paso} style={{ ...check, color: x.heredada && !ok ? "#64748b" : undefined }}>
                      <input type="checkbox" disabled={!onCambiarDominadas} checked={ok} onChange={(e) => onCambiarDominadas?.(marcarTarea(dominadas, pasosDeLaTarea(x.paso), e.target.checked))} />
                      {nombreTarea(x.paso)}
                      {x.heredada && <span style={{ fontSize: 11, color: "#94a3b8" }}>(de abajo)</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}
      <div style={{ ...sub, marginTop: 10 }}>Lo que puede hacer ({caps.length})</div>
      {!tildadas.length && !dominadas.length ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Sin categorías ni tareas tildadas: por ahora en la organización diaria se le puede dar cualquier tarea.</div>
      ) : caps.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Sus categorías todavía no tienen tareas asignadas (Personal → Categorías internas).</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {Array.from(new Map(caps.map((x) => [String(tipos.find((t) => t.id === x.tareaId)?.grupoId ?? `p${x.tareaId}`), x])).values()).map((x) => (
            <span key={x.tareaId} style={{ fontSize: 12, borderRadius: 999, padding: "2px 8px", background: "#f1f5f9", color: "#475569", border: "1px solid #e2e8f0" }}>
              {nombreTarea(x.tareaId)}
            </span>
          ))}
        </div>
      )}
    </Panel>
  );
}

// PERSONAL · LISTOS PARA AUMENTO: quienes dominan todas las tareas de una categoria interna vinculada a una del gremio que paga
// mas que la que cobran (escala del mes).
export function ListosParaAumento({
  empleados,
  categorias,
  tipos,
  valorGremio,
  onAbrir,
}: {
  empleados: EmpleadoCat[];
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  valorGremio: (categoria: string) => number;
  onAbrir?: (empleadoId: number) => void;
}) {
  const filas = empleados
    .map((e) => ({ e, l: listoParaAumento(e.tareasDominadas, e.category || "", categorias, tipos, valorGremio) }))
    .filter((x): x is { e: EmpleadoCat; l: ListoParaAumento } => !!x.l);
  const fmt = (n: number) => `$${n.toLocaleString("es-AR", { maximumFractionDigits: 2 })}`;
  return (
    <Panel span="full" title={`Listos para aumento (${filas.length})`}>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Quienes dominan el 100% de las tareas de una categoría interna vinculada a una categoría del gremio que paga más que la que cobran (valor hora de la escala del mes).
        Las tareas que domina cada uno se tildan en su ficha.
      </div>
      {filas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Nadie por ahora.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Persona", "Cobra", "Domina toda", "Pasaría a", "Valor hora", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", fontSize: 12, color: "#64748b", padding: "4px 6px", borderBottom: "1px solid #e2e8f0" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filas.map(({ e, l }) => (
              <tr key={e.id}>
                <td style={{ padding: "4px 6px", fontWeight: 600, fontSize: 13 }}>{e.name}</td>
                <td style={{ padding: "4px 6px", fontSize: 13 }}>{l.actual || "—"}</td>
                <td style={{ padding: "4px 6px", fontSize: 13 }}>{etiquetaCategoria(l.categoria, categorias)}</td>
                <td style={{ padding: "4px 6px", fontSize: 13, fontWeight: 700, color: "#166534" }}>{l.gremio}</td>
                <td style={{ padding: "4px 6px", fontSize: 13 }}>{fmt(l.valorActual)} → {fmt(l.valor)}</td>
                <td style={{ padding: "4px 6px" }}>{onAbrir && <ButtonLike secondary onClick={() => onAbrir(e.id)}>Ver ficha</ButtonLike>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
