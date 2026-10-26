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
  capacidadesDelEmpleado,
  categoriasEfectivas,
  etiquetaCategoria,
  hayCiclo,
  nombreEscalon,
  tareasHeredadas,
  type CategoriaEmpleado,
} from "../domain/categoriasEmpleado";
import { UNIDADES_TAREA, type GrupoTrabajo, type TipoTarea } from "../domain/organizacionDiaria";

type EmpleadoCat = { id: number; name: string; categoriasInternas?: number[] };

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(680px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const sub: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 4 };
const check: React.CSSProperties = { display: "flex", gap: 6, alignItems: "center", fontSize: 13, padding: "2px 0", cursor: "pointer" };
const unidadLabel = (t?: TipoTarea) => UNIDADES_TAREA.find((u) => u.value === (t?.unidad || "u"))?.label || "unidades";

// Escalon por escalon (1 Aprendiz ... 5 Responsable), y al final las habilidades extra.
const claveEscalon = (c: CategoriaEmpleado) => (c.extra ? Number.MAX_SAFE_INTEGER : c.nivel);
const ordenarPorEscalon = (cats: CategoriaEmpleado[]) =>
  [...cats].sort((a, b) => claveEscalon(a) - claveEscalon(b) || a.nombre.localeCompare(b.nombre) || (a.area || "").localeCompare(b.area || ""));
const tituloEscalon = (c: CategoriaEmpleado) => (c.extra ? "Habilidades extra · se suman a cualquier escalón" : `Escalón ${c.nivel} · ${nombreEscalon(c.nivel)}`);
const filaTitulo: React.CSSProperties = { background: "#f8fafc", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, padding: "5px 8px" };

// Tareas agrupadas como en el catalogo de Fabricacion (grupo de trabajo), para tildar.
function tareasPorGrupo(tipos: TipoTarea[], grupos: GrupoTrabajo[]) {
  const activos = tipos.filter((t) => t.activa !== false);
  const orden = [...grupos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre));
  const out = orden.map((g) => ({ nombre: g.nombre, tareas: activos.filter((t) => t.grupoId === g.id) })).filter((x) => x.tareas.length);
  const sueltas = activos.filter((t) => !t.grupoId || !grupos.some((g) => g.id === t.grupoId));
  if (sueltas.length) out.push({ nombre: "Sin grupo", tareas: sueltas });
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
}: {
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  grupos: GrupoTrabajo[];
  empleados: EmpleadoCat[];
  onGuardar: (c: CategoriaEmpleado) => void;
  onBorrar: (id: number) => void;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("personal.categorias", { label: 230, col: 96, colCompact: 70 });
  const [menu, setMenu] = useState<{ x: number; y: number; cat: CategoriaEmpleado } | null>(null);
  const [editTareas, setEditTareas] = useState<number | null>(null);
  const [editIncluye, setEditIncluye] = useState<number | null>(null);
  const ordenadas = ordenarPorEscalon(categorias);
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
  const nueva = () => onGuardar({ id: nuevoId(), nombre: "Categoría nueva", nivel: 1, incluye: [], tareaIds: [], activa: true });
  const catTareas = categorias.find((c) => c.id === editTareas);
  const catIncluye = categorias.find((c) => c.id === editIncluye);

  return (
    <Panel span="full" title="Categorías internas" actions={<ButtonLike onClick={nueva}>+ Categoría</ButtonLike>}>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        No son las del convenio (esas liquidan): son las capacidades de cada persona, por escalones. Aprendiz → Ayudante general → Ayudante especializado (con su rumbo) → el oficio → Responsable. Cada escalón suma lo de abajo, así que quien sube conserva lo que ya hacía, y se priorizan las tareas del escalón más alto. Las habilidades extra (Terminaciones) no son escalón: se suman a quien las tenga. Click derecho sobre una categoría: tareas, qué incluye, pausar o borrar.
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
              <th style={thColumna}>Incluye a</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Tareas propias</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Con heredadas</th>
              <th style={{ ...thColumna, textAlign: "right" }}>Personas</th>
              <th style={thFlexible}>Tareas que da</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((cat, i) => {
              const heredadas = tareasHeredadas(cat, categorias);
              const gente = empleadosDe(cat.id);
              const pausada = cat.activa === false;
              const titulo = i === 0 || tituloEscalon(ordenadas[i - 1]) !== tituloEscalon(cat);
              return (
                <React.Fragment key={cat.id}>
                {titulo && (
                  <tr>
                    <td colSpan={8} style={filaTitulo}>{tituloEscalon(cat)}</td>
                  </tr>
                )}
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
          <button type="button" style={quickMenuItem} onClick={() => { nueva(); setMenu(null); }}>+ Categoría nueva</button>
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
              Tildá las tareas propias de esta categoría. Las que ya da una categoría que incluye aparecen como heredadas: no hace falta repetirlas.
            </div>
            {(() => {
              const heredadas = new Set(tareasHeredadas(catTareas, categorias));
              const bloques = tareasPorGrupo(tipos, grupos);
              if (!bloques.length) return <div style={{ fontSize: 13, color: "#b45309" }}>No hay tareas en el catálogo de Fabricación.</div>;
              return bloques.map((b) => (
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
              ));
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
export function CategoriasDelEmpleado({
  empleado,
  categorias,
  tipos,
  onCambiar,
}: {
  empleado: EmpleadoCat;
  categorias: CategoriaEmpleado[];
  tipos: TipoTarea[];
  onCambiar: (ids: number[]) => void;
}) {
  const tildadas = empleado.categoriasInternas || [];
  const efectivas = categoriasEfectivas(tildadas, categorias);
  const caps = capacidadesDelEmpleado(tildadas, categorias);
  const maxNivel = caps.length ? caps[0].prioridad : 0;
  const ordenadas = ordenarPorEscalon(categorias.filter((c) => c.activa !== false));
  const bloques = Array.from(new Set(ordenadas.map(tituloEscalon)));
  // En los escalones con rumbo, el rumbo solo alcanza (bajo "Ayudante especializado": Armado, Laqueado...).
  const etiquetaEnBloque = (c: CategoriaEmpleado) => (c.area && ordenadas.filter((x) => tituloEscalon(x) === tituloEscalon(c) && x.nombre === c.nombre).length > 1 ? c.area : c.nombre);
  return (
    <Panel title="Categorías internas y capacidades" span="full" nested>
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Tildá su escalón y su rumbo (lo de abajo se suma solo, en gris) y sus habilidades extra. En la organización diaria solo se le pueden dar estas tareas, priorizando las de su escalón más alto.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "2px 14px" }}>
        {bloques.map((b) => (
          <div key={b}>
            <div style={sub}>{b.replace(" · se suman a cualquier escalón", "")}</div>
            {ordenadas.filter((c) => tituloEscalon(c) === b).map((c) => {
              const directa = tildadas.includes(c.id);
              const porArrastre = !directa && efectivas.has(c.id);
              return (
                <label key={c.id} style={{ ...check, color: porArrastre ? "#94a3b8" : undefined }}>
                  <input
                    type="checkbox"
                    checked={directa || porArrastre}
                    onChange={(e) => onCambiar(e.target.checked ? [...tildadas, c.id] : tildadas.filter((id) => id !== c.id))}
                  />
                  {etiquetaEnBloque(c)}
                  {porArrastre && <span style={{ fontSize: 11 }}>(incluida)</span>}
                </label>
              );
            })}
          </div>
        ))}
      </div>
      <div style={{ ...sub, marginTop: 10 }}>Lo que puede hacer ({caps.length})</div>
      {tildadas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Sin categorías: por ahora en la organización diaria se le puede dar cualquier tarea.</div>
      ) : caps.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#b45309" }}>Sus categorías todavía no tienen tareas asignadas (Personal → Categorías internas).</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {caps.map((x) => {
            const nueva = x.prioridad === maxNivel;
            return (
              <span
                key={x.tareaId}
                title={`De ${(() => { const c = categorias.find((k) => k.id === x.categoriaId); return c ? etiquetaCategoria(c, categorias) : ""; })()}${nueva ? " · prioritaria" : ""}`}
                style={{
                  fontSize: 12, borderRadius: 999, padding: "2px 8px",
                  background: nueva ? "#ccfbf1" : "#f1f5f9", color: nueva ? "#115e59" : "#475569",
                  border: `1px solid ${nueva ? "#99f6e4" : "#e2e8f0"}`,
                }}
              >
                {tipos.find((t) => t.id === x.tareaId)?.nombre || "tarea borrada"}
              </span>
            );
          })}
        </div>
      )}
    </Panel>
  );
}
