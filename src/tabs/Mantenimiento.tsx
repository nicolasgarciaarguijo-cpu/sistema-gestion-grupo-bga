// SOLAPA MANTENIMIENTO (Nicolas, 2026-10-26). Las maquinas y herramientas son items de Stock (grupos
// Maquinas pesadas / manuales / Herramientas); aca cada una tiene su FICHA (compra, especificaciones, usos,
// estado, reposicion, planes de mantenimiento preventivo e historial). Los preventivos se programan como
// tarea del dia de alguien idoneo (organizacion diaria) y al marcarlos hechos quedan en el historial. Abajo,
// que tareas quedan trabadas por herramientas que faltan o no andan. La logica vive en domain/mantenimiento.ts.
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija,
} from "../ui/planilla";
import {
  ESTADOS_MAQUINA,
  estadoInfo,
  fichaDe,
  GRUPOS_MAQUINAS,
  idoneosPara,
  nivelVencimiento,
  proximaFecha,
  registrarMantenimiento,
  tareaDeMantenimientoEnElDia,
  tareasQueUsan,
  tareasTrabadasPorHerramientas,
  vencimientosDeMantenimiento,
  diasHasta,
  type EstadoMaquina,
  type FichaMaquina,
  type MaquinaStock,
  type PlanMantenimiento,
  type TipoRegistro,
} from "../domain/mantenimiento";
import type { AsignacionDiaria, GrupoTrabajo, TipoTarea } from "../domain/organizacionDiaria";
import type { CategoriaEmpleado } from "../domain/categoriasEmpleado";

type EmpleadoMant = { id: number; name: string; company: string; categoriasInternas?: number[]; tareasDominadas?: number[] };

const overlay: React.CSSProperties = { position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" };
const caja: React.CSSProperties = { background: "#fff", borderRadius: 12, width: "min(900px, 100%)", padding: 18, display: "grid", gap: 10, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" };
const sub: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginTop: 6 };
const campo: React.CSSProperties = { display: "grid", gap: 2, fontSize: 11.5, color: "#64748b" };
const input: React.CSSProperties = { fontSize: 13, padding: "5px 7px", borderRadius: 6, border: "1px solid #cbd5e1", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
const colorNivel = { rojo: "#dc2626", amarillo: "#d97706", verde: "#16a34a", gris: "#94a3b8" } as const;
const fechaCorta = (f?: string | null) => (f ? f.split("-").reverse().join("/") : "—");
const textoDias = (d: number | null) => (d == null ? "sin fecha" : d < 0 ? `vencido hace ${-d} d` : d === 0 ? "hoy" : `en ${d} d`);

export function Mantenimiento({
  maquinas,
  fichas,
  tipos,
  grupos,
  categorias,
  empleados,
  asignaciones,
  hoy,
  companyShort,
  onGuardarFicha,
  onGuardarAsignacion,
  onCrearEnStock,
  empresas = [],
  onPrepararCatalogo,
  onIrAStock,
  nuevoId,
}: {
  maquinas: MaquinaStock[];
  fichas: FichaMaquina[];
  tipos: TipoTarea[];
  grupos: GrupoTrabajo[];
  categorias: CategoriaEmpleado[];
  empleados: EmpleadoMant[];
  asignaciones: AsignacionDiaria[];
  hoy: string;
  companyShort: (c: string) => string;
  onGuardarFicha: (f: FichaMaquina) => void;
  onGuardarAsignacion: (a: AsignacionDiaria) => void;
  // La maquina es de una empresa (su valor) y la usan las dos: se pregunta la duena.
  onCrearEnStock: (descripcion: string, grupo: string, empresa?: string) => number;
  empresas?: Array<{ value: string; label: string }>;
  onPrepararCatalogo: () => void;
  onIrAStock: () => void;
  nuevoId: () => number;
}) {
  const anchos = usePlanillaWidths("mantenimiento.maquinas", { label: 240, col: 110, colCompact: 80 });
  const [menu, setMenu] = useState<{ x: number; y: number; m: MaquinaStock } | null>(null);
  const [fichaAbierta, setFichaAbierta] = useState<number | null>(null);
  const [programar, setProgramar] = useState<{ m: MaquinaStock; planId?: number } | null>(null);
  const [nueva, setNueva] = useState<{ descripcion: string; grupo: string; empresa?: string } | null>(null);
  const ordenadas = [...maquinas].sort((a, b) => GRUPOS_MAQUINAS.indexOf(a.group) - GRUPOS_MAQUINAS.indexOf(b.group) || a.description.localeCompare(b.description));
  const vencimientos = vencimientosDeMantenimiento(maquinas, fichas, hoy);
  const trabadas = tareasTrabadasPorHerramientas(tipos, maquinas, fichas);
  const activas = tipos.filter((t) => t.activa !== false);
  const sinHerramientas = activas.filter((t) => !(t.herramientas || []).length);
  const hayGrupoMant = grupos.some((g) => /manten/i.test(g.nombre));
  const proximoDe = (id: number) => vencimientos.find((v) => v.stockItemId === id);
  const abrirMenu = (ev: React.MouseEvent, m: MaquinaStock) => {
    ev.preventDefault();
    ev.stopPropagation();
    setMenu({ x: ev.clientX, y: ev.clientY, m });
  };
  const guardar = (f: FichaMaquina) => onGuardarFicha(f);
  const maqAbierta = maquinas.find((m) => m.id === fichaAbierta);

  return (
    <>
      <Panel
        span="full"
        title="Máquinas y herramientas"
        actions={
          <span style={{ display: "flex", gap: 6 }}>
            {!hayGrupoMant && <ButtonLike secondary onClick={onPrepararCatalogo}>Preparar tareas de mantenimiento</ButtonLike>}
            <ButtonLike onClick={() => setNueva({ descripcion: "", grupo: "Maquinas pesadas" })}>+ Máquina o herramienta</ButtonLike>
          </span>
        }
      >
        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
          Salen de Stock (grupos Máquinas pesadas, Máquinas manuales y Herramientas): la cantidad se lleva allá. Acá vive la ficha de cada una: estado, compra, especificaciones, usos, reposición, sus mantenimientos preventivos y el historial. Click derecho: ficha, programar un mantenimiento como tarea, registrar uno hecho o cambiar el estado.
        </div>
        {!hayGrupoMant && (
          <div style={{ fontSize: 12.5, color: "#b45309", marginBottom: 8 }}>
            Todavía no hay un grupo de trabajo de Mantenimiento en el catálogo de tareas. "Preparar tareas de mantenimiento" lo crea con sus tareas y se las da a la habilidad extra "Mantenimiento de máquinas" (así el sistema sabe quiénes son idóneos).
          </div>
        )}
        {ordenadas.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>
            No hay máquinas ni herramientas en Stock. Sumalas con "+ Máquina o herramienta" (se crean en Stock) o desde{" "}
            <button type="button" onClick={onIrAStock} style={{ border: "none", background: "none", color: "#0f766e", cursor: "pointer", padding: 0, fontSize: 12.5 }}>Stock</button>.
          </div>
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
                <col style={colFlexible} />
              </colgroup>
              <thead>
                <tr>
                  <th style={thEsquina}>
                    Máquina / herramienta
                    <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "label")} onDoubleClick={anchos.resetLabel} />
                  </th>
                  <th style={thColumna}>
                    Estado
                    <PlanillaManija onMouseDown={(ev) => anchos.startResize(ev, "col")} onDoubleClick={anchos.resetCol} />
                  </th>
                  <th style={{ ...thColumna, textAlign: "right" }}>Cant.</th>
                  <th style={thColumna}>Compra</th>
                  <th style={thColumna}>Próximo preventivo</th>
                  <th style={thColumna}>Reposición</th>
                  <th style={thFlexible}>Tareas que la usan</th>
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((m, i) => {
                  const f = fichaDe(fichas, m.id);
                  const est = estadoInfo(f.estado);
                  const prox = proximoDe(m.id);
                  const usan = tareasQueUsan(m.id, tipos);
                  const titulo = i === 0 || ordenadas[i - 1].group !== m.group;
                  const diasRepo = f.fechaReposicion ? diasHasta(f.fechaReposicion, hoy) : null;
                  return (
                    <React.Fragment key={m.id}>
                      {titulo && (
                        <tr>
                          <td colSpan={7} style={{ background: "#f8fafc", fontSize: 11, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, padding: "5px 8px" }}>{m.group}</td>
                        </tr>
                      )}
                      <tr onContextMenu={(ev) => abrirMenu(ev, m)} onDoubleClick={() => setFichaAbierta(m.id)} style={{ opacity: m.active === false ? 0.5 : 1 }}>
                        <td style={tdNombre}>
                          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span title={est.label} style={{ width: 8, height: 8, borderRadius: 999, background: est.color, flex: "none" }} />
                            <span style={{ fontWeight: 700 }}>{m.description}</span>
                            <span style={{ fontSize: 11, color: "#94a3b8" }}>{[m.code, f.marca, f.modelo].filter(Boolean).join(" · ")}</span>
                          </span>
                        </td>
                        <td style={{ ...tdDato, fontSize: 12, color: est.color, fontWeight: 600 }}>{est.label}</td>
                        <td style={{ ...tdDato, textAlign: "right", color: Number(m.quantity) > 0 ? undefined : "#dc2626" }}>{m.quantity}</td>
                        <td style={{ ...tdDato, fontSize: 12 }}>{fechaCorta(f.fechaCompra)}</td>
                        <td style={{ ...tdDato, fontSize: 12, color: colorNivel[nivelVencimiento(prox?.dias ?? null)] }} title={prox ? `${prox.plan.descripcion}` : "Sin preventivos cargados"}>
                          {prox ? `${fechaCorta(prox.fecha)} · ${textoDias(prox.dias)}` : "—"}
                        </td>
                        <td style={{ ...tdDato, fontSize: 12, color: diasRepo != null && diasRepo <= 30 ? "#7c3aed" : undefined }}>{fechaCorta(f.fechaReposicion)}</td>
                        <td style={{ ...tdFlexible, fontSize: 12, color: usan.length ? undefined : "#94a3b8" }}>
                          {usan.length ? usan.map((t) => t.nombre).join(" · ") : "Ninguna tarea la pide todavía"}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel span="full" title="Mantenimiento preventivo · próximos">
        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
          Cada preventivo vence a los N días del último hecho. Click derecho → "Programar como tarea": va al día de una persona idónea (organización diaria) y, cuando la marca hecha, queda en el historial de la máquina y el contador vuelve a arrancar.
        </div>
        {vencimientos.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin preventivos cargados. Se cargan en la ficha de cada máquina.</div>
        ) : (
          <div style={{ display: "grid", gap: 3 }}>
            {vencimientos.map((v) => {
              const nivel = nivelVencimiento(v.dias);
              const m = maquinas.find((x) => x.id === v.stockItemId)!;
              return (
                <div
                  key={`${v.stockItemId}-${v.planId}`}
                  onContextMenu={(ev) => abrirMenu(ev, m)}
                  onDoubleClick={() => setProgramar({ m, planId: v.planId })}
                  style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13, padding: "4px 8px", borderRadius: 6, background: nivel === "rojo" ? "#fef2f2" : nivel === "amarillo" ? "#fffbeb" : "#f8fafc", cursor: "context-menu" }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 999, background: colorNivel[nivel], flex: "none" }} />
                  <strong style={{ minWidth: 180 }}>{v.maquina}</strong>
                  <span style={{ flex: 1 }}>{v.plan.descripcion} <span style={{ color: "#94a3b8" }}>· cada {v.plan.cadaDias} d</span></span>
                  <span style={{ color: colorNivel[nivel], fontWeight: 600 }}>{v.fecha ? `${fechaCorta(v.fecha)} · ${textoDias(v.dias)}` : "sin último hecho: cargalo en la ficha"}</span>
                  <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", padding: "3px 8px", cursor: "pointer" }} onClick={() => setProgramar({ m, planId: v.planId })}>
                    Programar
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel span="full" title="Herramientas para las tareas">
        <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
          Cada tarea del catálogo dice qué máquinas y herramientas necesita (Fabricación → Tipos de tarea → Herramientas…). Acá se ve si con lo que hay se pueden hacer todas.
        </div>
        {trabadas.length === 0 ? (
          <div style={{ fontSize: 13, color: "#16a34a" }}>Con las máquinas y herramientas de hoy se pueden hacer todas las tareas que tienen herramientas cargadas.</div>
        ) : (
          <div style={{ display: "grid", gap: 3 }}>
            {trabadas.map((t) => (
              <div key={t.tareaId} style={{ fontSize: 13, padding: "4px 8px", borderRadius: 6, background: "#fef2f2" }}>
                <strong>{t.nombre}</strong> no se puede hacer: {t.faltantes.map((f) => `${f.nombre} (${f.motivo})`).join(", ")}
              </div>
            ))}
          </div>
        )}
        {sinHerramientas.length > 0 && (
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6 }}>
            {sinHerramientas.length} tarea(s) todavía sin herramientas cargadas: {sinHerramientas.slice(0, 12).map((t) => t.nombre).join(", ")}{sinHerramientas.length > 12 ? "…" : ""}
          </div>
        )}
      </Panel>

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.m.description}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { setFichaAbierta(menu.m.id); setMenu(null); }}>Ficha…</button>
          <button type="button" style={quickMenuItem} onClick={() => { setProgramar({ m: menu.m }); setMenu(null); }}>Programar mantenimiento como tarea…</button>
          <QuickMenuSep />
          {ESTADOS_MAQUINA.map((e) => (
            <button
              key={e.value}
              type="button"
              style={{ ...quickMenuItem, fontWeight: (fichaDe(fichas, menu.m.id).estado || "operativa") === e.value ? 800 : undefined }}
              onClick={() => { guardar({ ...fichaDe(fichas, menu.m.id), estado: e.value }); setMenu(null); }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 999, background: e.color }} /> {e.label}
            </button>
          ))}
          <QuickMenuSep />
          <button type="button" style={quickMenuItem} onClick={() => { onIrAStock(); setMenu(null); }}>Ver en Stock</button>
        </QuickMenu>
      )}

      {nueva && (
        <div style={overlay} onClick={() => setNueva(null)}>
          <div style={{ ...caja, width: "min(460px, 100%)" }} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Nueva máquina o herramienta</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>Se crea en Stock (con cantidad 1) y se abre su ficha.</div>
            <label style={campo}>
              Nombre
              <input autoFocus style={input} value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />
            </label>
            <label style={campo}>
              Grupo
              <select style={input} value={nueva.grupo} onChange={(e) => setNueva({ ...nueva, grupo: e.target.value })}>
                {GRUPOS_MAQUINAS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </label>
            {empresas.length > 1 && (
              <label style={campo}>
                ¿De qué empresa es? (su valor impacta en esa; la usan las dos)
                <select style={input} value={nueva.empresa || ""} onChange={(e) => setNueva({ ...nueva, empresa: e.target.value })}>
                  <option value="">Elegí la empresa…</option>
                  {empresas.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </label>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <ButtonLike secondary onClick={() => setNueva(null)}>Cancelar</ButtonLike>
              <ButtonLike
                onClick={() => {
                  if (!nueva.descripcion.trim()) return;
                  if (empresas.length > 1 && !nueva.empresa) return;
                  const id = onCrearEnStock(nueva.descripcion.trim(), nueva.grupo, nueva.empresa || empresas[0]?.value);
                  setNueva(null);
                  setFichaAbierta(id);
                }}
              >
                Crear
              </ButtonLike>
            </div>
          </div>
        </div>
      )}

      {fichaAbierta != null && (
        <FichaDeMaquina
          maquina={maqAbierta}
          stockItemId={fichaAbierta}
          ficha={fichaDe(fichas, fichaAbierta)}
          tipos={tipos}
          hoy={hoy}
          onGuardar={guardar}
          onProgramar={(planId) => maqAbierta && setProgramar({ m: maqAbierta, planId })}
          onCerrar={() => setFichaAbierta(null)}
          nuevoId={nuevoId}
        />
      )}

      {programar && (
        <ProgramarTarea
          m={programar.m}
          ficha={fichaDe(fichas, programar.m.id)}
          planIdInicial={programar.planId}
          tipos={tipos}
          categorias={categorias}
          empleados={empleados}
          asignaciones={asignaciones}
          hoy={hoy}
          companyShort={companyShort}
          onConfirmar={(a) => { onGuardarAsignacion(a); setProgramar(null); }}
          onCerrar={() => setProgramar(null)}
          nuevoId={nuevoId}
        />
      )}
    </>
  );
}

function FichaDeMaquina({
  maquina,
  stockItemId,
  ficha,
  tipos,
  hoy,
  onGuardar,
  onProgramar,
  onCerrar,
  nuevoId,
}: {
  maquina?: MaquinaStock;
  stockItemId: number;
  ficha: FichaMaquina;
  tipos: TipoTarea[];
  hoy: string;
  onGuardar: (f: FichaMaquina) => void;
  onProgramar: (planId?: number) => void;
  onCerrar: () => void;
  nuevoId: () => number;
}) {
  const [registro, setRegistro] = useState<{ fecha: string; tipo: TipoRegistro; planId?: number; descripcion: string; empleado: string; costo: string } | null>(null);
  const set = (cambios: Partial<FichaMaquina>) => onGuardar({ ...ficha, stockItemId, ...cambios });
  const setPlan = (p: PlanMantenimiento) => set({ planes: ficha.planes.map((x) => (x.id === p.id ? p : x)) });
  const texto = (k: keyof FichaMaquina, label: string, tipo: "text" | "date" = "text") => (
    <label style={campo}>
      {label}
      <input type={tipo} style={input} value={(ficha[k] as string) || ""} onChange={(e) => set({ [k]: e.target.value || undefined } as Partial<FichaMaquina>)} />
    </label>
  );
  const usan = tareasQueUsan(stockItemId, tipos);
  const tareasMant = tipos.filter((t) => t.activa !== false);

  return (
    <div style={overlay} onClick={onCerrar}>
      <div style={caja} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <strong style={{ fontSize: 16, flex: 1 }}>
            {maquina?.description || "Máquina"} <span style={{ fontSize: 12, color: "#94a3b8", fontWeight: 400 }}>{maquina ? `${maquina.group} · ${maquina.quantity} en stock` : ""}</span>
          </strong>
          <ButtonLike onClick={onCerrar}>Listo</ButtonLike>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          <label style={campo}>
            Estado
            <select style={input} value={ficha.estado || "operativa"} onChange={(e) => set({ estado: e.target.value as EstadoMaquina })}>
              {ESTADOS_MAQUINA.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
          </label>
          {texto("fechaCompra", "Fecha de compra", "date")}
          {texto("fechaReposicion", "Fecha de reposición", "date")}
          {texto("marca", "Marca")}
          {texto("modelo", "Modelo")}
          {texto("nroSerie", "N.º de serie")}
          {texto("proveedor", "Proveedor / service")}
        </div>
        <label style={campo}>
          Especificaciones
          <textarea style={{ ...input, minHeight: 54, resize: "vertical" }} value={ficha.especificaciones || ""} onChange={(e) => set({ especificaciones: e.target.value || undefined })} />
        </label>
        <label style={campo}>
          Usos
          <textarea style={{ ...input, minHeight: 44, resize: "vertical" }} value={ficha.usos || ""} onChange={(e) => set({ usos: e.target.value || undefined })} />
        </label>
        <div style={{ fontSize: 12, color: "#64748b" }}>
          Tareas del catálogo que la necesitan: {usan.length ? usan.map((t) => t.nombre).join(" · ") : "ninguna todavía (se cargan en Fabricación → Tipos de tarea → Herramientas…)"}
        </div>

        <div style={sub}>Mantenimiento preventivo</div>
        {ficha.planes.length === 0 && <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin preventivos. Sumá uno: qué se hace, cada cuántos días y con qué tarea del catálogo (así se sabe quién es idóneo).</div>}
        {ficha.planes.map((p) => {
          const prox = proximaFecha(p);
          const d = prox ? diasHasta(prox, hoy) : null;
          return (
            <div key={p.id} style={{ display: "grid", gridTemplateColumns: "2fr 80px 130px 130px 1.5fr 70px auto", gap: 6, alignItems: "end", opacity: p.activo === false ? 0.5 : 1 }}>
              <label style={campo}>Qué se hace<input style={input} value={p.descripcion} onChange={(e) => setPlan({ ...p, descripcion: e.target.value })} /></label>
              <label style={campo}>Cada (días)<input type="number" min={1} style={input} value={p.cadaDias} onChange={(e) => setPlan({ ...p, cadaDias: Math.max(1, Number(e.target.value) || 1) })} /></label>
              <label style={campo}>Último hecho<input type="date" style={input} value={p.ultimaFecha || ""} onChange={(e) => setPlan({ ...p, ultimaFecha: e.target.value || undefined })} /></label>
              <label style={campo} title="Se calcula sola; si la fijás, manda la tuya">
                Próximo {d != null && <span style={{ color: colorNivel[nivelVencimiento(d)] }}>({textoDias(d)})</span>}
                <input type="date" style={input} value={prox || ""} onChange={(e) => setPlan({ ...p, proximaFecha: e.target.value || undefined })} />
              </label>
              <label style={campo}>
                Tarea del catálogo
                <select style={input} value={p.tareaId ?? ""} onChange={(e) => setPlan({ ...p, tareaId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {tareasMant.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={campo}>Horas<input type="number" min={0} step={0.25} style={input} value={p.horas ?? ""} onChange={(e) => setPlan({ ...p, horas: e.target.value === "" ? undefined : Number(e.target.value) })} /></label>
              <span style={{ display: "flex", gap: 4 }}>
                <button type="button" style={{ fontSize: 12, border: "1px solid #cbd5e1", borderRadius: 6, background: "#fff", padding: "5px 8px", cursor: "pointer" }} onClick={() => onProgramar(p.id)}>Programar</button>
                <button
                  type="button"
                  title="Quitar este preventivo"
                  style={{ fontSize: 12, border: "1px solid #fecaca", color: "#b91c1c", borderRadius: 6, background: "#fff", padding: "5px 8px", cursor: "pointer" }}
                  onClick={() => window.confirm(`¿Quitar el preventivo "${p.descripcion}"?`) && set({ planes: ficha.planes.filter((x) => x.id !== p.id) })}
                >
                  ✕
                </button>
              </span>
            </div>
          );
        })}
        <div>
          <ButtonLike secondary onClick={() => set({ planes: [...ficha.planes, { id: nuevoId(), descripcion: "Preventivo", cadaDias: 90, activo: true }] })}>+ Preventivo</ButtonLike>
        </div>

        <div style={sub}>Historial</div>
        {ficha.historial.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin registros. Se suman solos al marcar hecha una tarea de mantenimiento, o a mano.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
            <thead>
              <tr style={{ color: "#64748b", textAlign: "left" }}>
                <th style={{ padding: "3px 6px" }}>Fecha</th>
                <th style={{ padding: "3px 6px" }}>Tipo</th>
                <th style={{ padding: "3px 6px" }}>Qué se hizo</th>
                <th style={{ padding: "3px 6px" }}>Quién</th>
                <th style={{ padding: "3px 6px", textAlign: "right" }}>Costo</th>
              </tr>
            </thead>
            <tbody>
              {ficha.historial.map((r) => (
                <tr key={r.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "3px 6px" }}>{fechaCorta(r.fecha)}</td>
                  <td style={{ padding: "3px 6px" }}>{r.tipo}</td>
                  <td style={{ padding: "3px 6px" }}>{r.descripcion}</td>
                  <td style={{ padding: "3px 6px" }}>{r.empleado || "—"}</td>
                  <td style={{ padding: "3px 6px", textAlign: "right" }}>{r.costo ? `$ ${r.costo.toLocaleString("es-AR")}` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {registro ? (
          <div style={{ display: "grid", gridTemplateColumns: "130px 130px 1.4fr 2fr 1fr 100px auto", gap: 6, alignItems: "end", background: "#f8fafc", padding: 8, borderRadius: 8 }}>
            <label style={campo}>Fecha<input type="date" style={input} value={registro.fecha} onChange={(e) => setRegistro({ ...registro, fecha: e.target.value })} /></label>
            <label style={campo}>
              Tipo
              <select style={input} value={registro.tipo} onChange={(e) => setRegistro({ ...registro, tipo: e.target.value as TipoRegistro })}>
                <option value="preventivo">Preventivo</option>
                <option value="correctivo">Correctivo</option>
                <option value="reposicion">Reposición</option>
              </select>
            </label>
            <label style={campo}>
              Preventivo
              <select style={input} value={registro.planId ?? ""} onChange={(e) => setRegistro({ ...registro, planId: e.target.value ? Number(e.target.value) : undefined })}>
                <option value="">—</option>
                {ficha.planes.map((p) => <option key={p.id} value={p.id}>{p.descripcion}</option>)}
              </select>
            </label>
            <label style={campo}>Qué se hizo<input style={input} value={registro.descripcion} onChange={(e) => setRegistro({ ...registro, descripcion: e.target.value })} /></label>
            <label style={campo}>Quién<input style={input} value={registro.empleado} onChange={(e) => setRegistro({ ...registro, empleado: e.target.value })} /></label>
            <label style={campo}>Costo $<input type="number" min={0} style={input} value={registro.costo} onChange={(e) => setRegistro({ ...registro, costo: e.target.value })} /></label>
            <span style={{ display: "flex", gap: 4 }}>
              <ButtonLike
                onClick={() => {
                  if (!registro.fecha) return;
                  onGuardar(
                    registrarMantenimiento({ ...ficha, stockItemId }, {
                      id: nuevoId(),
                      fecha: registro.fecha,
                      tipo: registro.tipo,
                      planId: registro.planId,
                      descripcion: registro.descripcion || (registro.tipo === "reposicion" ? "Reposición" : "Mantenimiento"),
                      empleado: registro.empleado || undefined,
                      costo: Number(registro.costo) || undefined,
                    })
                  );
                  setRegistro(null);
                }}
              >
                Asentar
              </ButtonLike>
              <ButtonLike secondary onClick={() => setRegistro(null)}>✕</ButtonLike>
            </span>
          </div>
        ) : (
          <div>
            <ButtonLike secondary onClick={() => setRegistro({ fecha: hoy, tipo: "preventivo", descripcion: "", empleado: "", costo: "" })}>+ Registrar un mantenimiento hecho</ButtonLike>
          </div>
        )}
      </div>
    </div>
  );
}

function ProgramarTarea({
  m,
  ficha,
  planIdInicial,
  tipos,
  categorias,
  empleados,
  asignaciones,
  hoy,
  companyShort,
  onConfirmar,
  onCerrar,
  nuevoId,
}: {
  m: MaquinaStock;
  ficha: FichaMaquina;
  planIdInicial?: number;
  tipos: TipoTarea[];
  categorias: CategoriaEmpleado[];
  empleados: EmpleadoMant[];
  asignaciones: AsignacionDiaria[];
  hoy: string;
  companyShort: (c: string) => string;
  onConfirmar: (a: AsignacionDiaria) => void;
  onCerrar: () => void;
  nuevoId: () => number;
}) {
  const planInicial = ficha.planes.find((p) => p.id === planIdInicial);
  const [planId, setPlanId] = useState<number | undefined>(planInicial?.id);
  const plan = ficha.planes.find((p) => p.id === planId);
  const [fecha, setFecha] = useState(() => {
    const prox = plan ? proximaFecha(plan) : null;
    return prox && prox > hoy ? prox : hoy;
  });
  const [descripcion, setDescripcion] = useState("");
  const [horas, setHoras] = useState<number>(planInicial?.horas || 1);
  const [empleadoId, setEmpleadoId] = useState<number | null>(null);
  const idoneos = idoneosPara(plan?.tareaId ?? null, empleados, categorias);
  const otros = empleados.filter((e) => !idoneos.some((i) => i.id === e.id));
  const emp = empleados.find((e) => e.id === empleadoId);
  const yaTiene = emp ? asignaciones.find((a) => a.empleadoId === emp.id && a.fecha === fecha) : undefined;
  const tarea = tipos.find((t) => t.id === plan?.tareaId);

  return (
    <div style={overlay} onClick={onCerrar}>
      <div style={{ ...caja, width: "min(560px, 100%)" }} onClick={(e) => e.stopPropagation()}>
        <strong style={{ fontSize: 15 }}>Programar mantenimiento · {m.description}</strong>
        <div style={{ fontSize: 12.5, color: "#64748b" }}>
          Se suma como tarea al día de la persona (Fabricación → Organización diaria), a continuación de lo que ya tenga. Al marcarla hecha queda en el historial de la máquina.
        </div>
        <label style={campo}>
          Qué mantenimiento
          <select
            style={input}
            value={planId ?? ""}
            onChange={(e) => {
              const p = ficha.planes.find((x) => x.id === Number(e.target.value));
              setPlanId(p?.id);
              if (p?.horas) setHoras(p.horas);
            }}
          >
            <option value="">Correctivo / otro (no es un preventivo)</option>
            {ficha.planes.map((p) => <option key={p.id} value={p.id}>{p.descripcion} (cada {p.cadaDias} d)</option>)}
          </select>
        </label>
        {!plan && (
          <label style={campo}>Qué hay que hacer<input style={input} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej.: cambiar rodamiento" /></label>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8 }}>
          <label style={campo}>Día<input type="date" style={input} value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
          <label style={campo}>Horas<input type="number" min={0.25} step={0.25} style={input} value={horas} onChange={(e) => setHoras(Number(e.target.value) || 1)} /></label>
        </div>
        <label style={campo}>
          Quién
          <select style={input} value={empleadoId ?? ""} onChange={(e) => setEmpleadoId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Elegí a la persona…</option>
            {idoneos.length > 0 && (
              <optgroup label={`Idóneos (tienen "${tarea?.nombre || "la tarea"}" en sus categorías)`}>
                {idoneos.map((e) => <option key={e.id} value={e.id}>{e.name} · {companyShort(e.company)}</option>)}
              </optgroup>
            )}
            <optgroup label={idoneos.length ? "Otros" : "Personal"}>
              {otros.map((e) => <option key={e.id} value={e.id}>{e.name} · {companyShort(e.company)}</option>)}
            </optgroup>
          </select>
        </label>
        {plan && !plan.tareaId && <div style={{ fontSize: 12, color: "#b45309" }}>Este preventivo no tiene tarea del catálogo: no se puede saber quién es idóneo. Elegila en la ficha.</div>}
        {plan?.tareaId && idoneos.length === 0 && <div style={{ fontSize: 12, color: "#b45309" }}>Nadie tiene esa tarea en sus categorías internas (Personal → Categorías internas, por ejemplo la habilidad extra "Mantenimiento de máquinas").</div>}
        {emp && <div style={{ fontSize: 12, color: "#64748b" }}>{yaTiene ? `${emp.name} ya tiene ${yaTiene.tareas.length} tarea(s) ese día: va a continuación.` : `${emp.name} no tiene el día armado: se arma en fábrica con los turnos de siempre.`}</div>}
        <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
          <ButtonLike secondary onClick={onCerrar}>Cancelar</ButtonLike>
          <ButtonLike
            onClick={() => {
              if (!emp || !fecha) return;
              onConfirmar(
                tareaDeMantenimientoEnElDia(asignaciones, {
                  fecha,
                  empleadoId: emp.id,
                  empleado: emp.name,
                  company: emp.company,
                  stockItemId: m.id,
                  maquina: m.description,
                  plan,
                  descripcion: plan ? undefined : descripcion || "correctivo",
                  horas,
                  nuevoId,
                })
              );
            }}
          >
            Programar
          </ButtonLike>
        </div>
      </div>
    </div>
  );
}
