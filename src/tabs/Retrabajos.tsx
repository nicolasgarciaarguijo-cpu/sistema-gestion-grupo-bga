// FABRICACION · RETRABAJOS (fase 6, Nicolas 2026-10-26). Cada retrabajo es de un trabajo y de una tarea: quien la hizo
// (cuenta en su efectividad), quien la rehace, que % se rehace (100 = entera), las horas de la tarea y los materiales.
// Costo = horas x costo hora de quien rehace + materiales. Sus horas corren el cronograma del trabajo. Ver
// domain/retrabajos.ts.
import React, { useEffect, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { costoDeRetrabajo, horasDeRetrabajo, type Retrabajo } from "../domain/retrabajos";
import type { TipoTarea } from "../domain/organizacionDiaria";

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const fecha = (iso: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : "");
const th: React.CSSProperties = { padding: "4px 6px", textAlign: "left", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 6px", fontSize: 12.5, borderBottom: "1px solid #f1f5f9" };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13, width: "100%" };
const campo: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };

export function Retrabajos({
  retrabajos,
  trabajos,
  tareas,
  empleados,
  costoHora,
  money,
  hoy,
  onGuardar,
  onBorrar,
  nuevoId,
  precargado,
  onPrecargadoUsado,
}: {
  // Desde la organizacion diaria (click derecho en una tarea): abre el formulario con la tarea, quien la hizo y sus horas.
  precargado?: Partial<Retrabajo> | null;
  onPrecargadoUsado?: () => void;
  retrabajos: Retrabajo[];
  trabajos: Array<{ jobId: number; nombre: string; company: string }>;
  tareas: TipoTarea[];
  empleados: Array<{ id: number; name: string }>;
  costoHora: (empleadoId: number) => number;
  money: (n: number) => string;
  hoy: string;
  onGuardar: (r: Retrabajo) => void;
  onBorrar: (id: number) => void;
  nuevoId: () => number;
}) {
  const [editando, setEditando] = useState<Retrabajo | null>(null);
  const [menu, setMenu] = useState<null | { x: number; y: number; r: Retrabajo }>(null);
  const [mes, setMes] = useState(hoy.slice(0, 7));
  const delMes = retrabajos.filter((r) => !mes || r.fecha.startsWith(mes)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const totales = delMes.reduce(
    (acc, r) => {
      const c = costoDeRetrabajo(r, costoHora);
      return { horas: acc.horas + c.horas, total: acc.total + c.total };
    },
    { horas: 0, total: 0 }
  );
  const nombreEmp = (id?: number) => (id == null ? "" : empleados.find((e) => e.id === id)?.name || "—");
  const nombreTrabajo = (id: number) => trabajos.find((t) => t.jobId === id)?.nombre || `Trabajo ${id}`;
  const nombreTarea = (r: Retrabajo) => (r.tareaId != null ? tareas.find((t) => t.id === r.tareaId)?.nombre : "") || r.descripcion || "—";
  const nuevo = () =>
    setEditando({ id: nuevoId(), company: trabajos[0]?.company || "", fecha: hoy, jobId: trabajos[0]?.jobId ?? 0, tareaId: null, responsableId: empleados[0]?.id ?? 0, porcentaje: 100, horasTarea: 0, materiales: 0 });
  useEffect(() => {
    if (!precargado) return;
    const t = trabajos.find((x) => x.jobId === precargado.jobId) || trabajos[0];
    setEditando({
      id: nuevoId(),
      company: t?.company || "",
      fecha: hoy,
      jobId: t?.jobId ?? 0,
      tareaId: null,
      responsableId: empleados[0]?.id ?? 0,
      porcentaje: 100,
      horasTarea: 0,
      materiales: 0,
      ...precargado,
      ...(t && !trabajos.some((x) => x.jobId === precargado.jobId) ? { jobId: t.jobId, company: t.company } : {}),
    });
    onPrecargadoUsado?.();
  }, [precargado]);
  const e = editando;
  const costoE = e ? costoDeRetrabajo(e, costoHora) : null;

  return (
    <Panel
      span="full"
      title="Retrabajos"
      actions={
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="month" value={mes} onChange={(ev) => setMes(ev.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 6px", fontSize: 12.5 }} title="Mes (vacío = todos)" />
          <ButtonLike onClick={nuevo} disabled={!trabajos.length}>+ Retrabajo</ButtonLike>
        </span>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Lo que hubo que rehacer: de qué trabajo y tarea, quién la hizo (cuenta en su efectividad, en Personal), quién la rehace y cuánto (100% = la tarea entera).
        Costo = horas × costo hora de quien rehace + materiales. Las horas se suman al cronograma del trabajo. Click derecho: editar o borrar.
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>{delMes.length}</strong> retrabajo{delMes.length === 1 ? "" : "s"} · <strong>{fmt(totales.horas)} hs</strong> · costo <strong>{money(totales.total)}</strong>
      </div>
      {delMes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin retrabajos {mes ? "en este mes" : "cargados"}.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Trabajo</th>
                <th style={th}>Tarea</th>
                <th style={th}>La hizo</th>
                <th style={th}>La rehace</th>
                <th style={{ ...th, textAlign: "right" }}>%</th>
                <th style={{ ...th, textAlign: "right" }}>Horas</th>
                <th style={{ ...th, textAlign: "right" }}>Materiales</th>
                <th style={{ ...th, textAlign: "right" }}>Costo</th>
                <th style={th}>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {delMes.map((r) => {
                const c = costoDeRetrabajo(r, costoHora);
                return (
                  <tr
                    key={r.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      setMenu({ x: ev.clientX, y: ev.clientY, r });
                    }}
                    onDoubleClick={() => setEditando(r)}
                    style={{ cursor: "context-menu" }}
                  >
                    <td style={td}>{fecha(r.fecha)}</td>
                    <td style={td}>{nombreTrabajo(r.jobId)}</td>
                    <td style={td}>{nombreTarea(r)}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{nombreEmp(r.responsableId)}</td>
                    <td style={td}>{r.rehaceId != null && r.rehaceId !== r.responsableId ? nombreEmp(r.rehaceId) : "la misma persona"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmt(r.porcentaje)}%</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmt(horasDeRetrabajo(r))}</td>
                    <td style={{ ...td, textAlign: "right" }}>{money(r.materiales || 0)}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{money(c.total)}</td>
                    <td style={{ ...td, color: "#64748b" }}>{r.motivo || ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{nombreTarea(menu.r)}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { setEditando(menu.r); setMenu(null); }}>Editar…</button>
          <QuickMenuSep />
          <button
            type="button"
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              if (window.confirm("¿Borrar este retrabajo?")) onBorrar(menu.r.id);
              setMenu(null);
            }}
          >
            Borrar
          </button>
        </QuickMenu>
      )}

      {e && costoE && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }} onClick={() => setEditando(null)}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 10 }} onClick={(ev) => ev.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Retrabajo</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={campo}>
                Trabajo
                <select style={input} value={e.jobId} onChange={(ev) => { const t = trabajos.find((x) => x.jobId === Number(ev.target.value)); setEditando({ ...e, jobId: Number(ev.target.value), company: t?.company || e.company }); }}>
                  {trabajos.map((t) => <option key={t.jobId} value={t.jobId}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={campo}>
                Fecha
                <input style={input} type="date" value={e.fecha} onChange={(ev) => setEditando({ ...e, fecha: ev.target.value })} />
              </label>
              <label style={campo}>
                Tarea
                <select style={input} value={e.tareaId ?? ""} onChange={(ev) => setEditando({ ...e, tareaId: ev.target.value ? Number(ev.target.value) : null })}>
                  <option value="">— Otra (escribir abajo) —</option>
                  {[...tareas].filter((t) => t.activa !== false).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={campo}>
                Descripción (si no está en el catálogo)
                <input style={input} value={e.descripcion || ""} onChange={(ev) => setEditando({ ...e, descripcion: ev.target.value })} />
              </label>
              <label style={campo}>
                Quién la hizo (cuenta en su efectividad)
                <select style={input} value={e.responsableId} onChange={(ev) => setEditando({ ...e, responsableId: Number(ev.target.value) })}>
                  {empleados.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label style={campo}>
                Quién la rehace
                <select style={input} value={e.rehaceId ?? ""} onChange={(ev) => setEditando({ ...e, rehaceId: ev.target.value ? Number(ev.target.value) : undefined })}>
                  <option value="">La misma persona</option>
                  {empleados.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </label>
              <label style={campo}>
                Cuánto se rehace (%)
                <input style={input} type="number" min={0} max={100} step={5} value={e.porcentaje} onChange={(ev) => setEditando({ ...e, porcentaje: Math.min(100, Math.max(0, Number(ev.target.value) || 0)) })} />
              </label>
              <label style={campo}>
                Horas de la tarea original
                <input style={input} type="number" min={0} step={0.25} value={e.horasTarea} onChange={(ev) => setEditando({ ...e, horasTarea: Math.max(0, Number(ev.target.value) || 0) })} />
              </label>
              <label style={campo}>
                Materiales ($)
                <input style={input} type="number" min={0} step={100} value={e.materiales} onChange={(ev) => setEditando({ ...e, materiales: Math.max(0, Number(ev.target.value) || 0) })} />
              </label>
              <label style={campo}>
                Motivo
                <input style={input} value={e.motivo || ""} onChange={(ev) => setEditando({ ...e, motivo: ev.target.value })} />
              </label>
            </div>
            <div style={{ fontSize: 13, background: "#f8fafc", borderRadius: 8, padding: "6px 10px" }}>
              {fmt(costoE.horas)} hs × costo hora = <strong>{money(costoE.manoDeObra)}</strong> + materiales {money(costoE.materiales)} = <strong>{money(costoE.total)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <ButtonLike secondary onClick={() => setEditando(null)}>Cancelar</ButtonLike>
              <ButtonLike
                disabled={!e.jobId || !e.responsableId || (!e.tareaId && !e.descripcion?.trim())}
                onClick={() => {
                  onGuardar(e);
                  setEditando(null);
                }}
              >
                Guardar
              </ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

// PERSONAL · EFECTIVIDAD (fase 6): por persona, en el mes, las horas de tareas que tildó hechas en la organización diaria y
// las que hubo que rehacer por su culpa. Efectividad = 1 - horas rehechas / horas trabajadas.
export function EfectividadPersonal({
  filas,
  money,
  mes,
  onMes,
}: {
  filas: Array<{ nombre: string; horasHechas: number; retrabajos: number; horasRetrabajo: number; costo: number; efectividad: number | null }>;
  money: (n: number) => string;
  mes: string;
  onMes: (mes: string) => void;
}) {
  const color = (e: number | null) => (e == null ? "#94a3b8" : e >= 95 ? "#166534" : e >= 85 ? "#92400e" : "#991b1b");
  return (
    <Panel
      span="full"
      title="Efectividad (retrabajos)"
      actions={<input type="month" value={mes} onChange={(ev) => onMes(ev.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 6px", fontSize: 12.5 }} />}
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Horas de tareas tildadas hechas en la organización diaria y horas que hubo que rehacer por cada persona (los retrabajos se cargan en Fabricación).
        Efectividad = 1 − horas rehechas / horas trabajadas.
      </div>
      {filas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin tareas hechas ni retrabajos en el mes.</div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Persona</th>
              <th style={{ ...th, textAlign: "right" }}>Hs trabajadas</th>
              <th style={{ ...th, textAlign: "right" }}>Retrabajos</th>
              <th style={{ ...th, textAlign: "right" }}>Hs rehechas</th>
              <th style={{ ...th, textAlign: "right" }}>Costo</th>
              <th style={{ ...th, textAlign: "right" }}>Efectividad</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.nombre}>
                <td style={{ ...td, fontWeight: 600 }}>{f.nombre}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmt(f.horasHechas)}</td>
                <td style={{ ...td, textAlign: "right" }}>{f.retrabajos}</td>
                <td style={{ ...td, textAlign: "right" }}>{fmt(f.horasRetrabajo)}</td>
                <td style={{ ...td, textAlign: "right" }}>{money(f.costo)}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800, color: color(f.efectividad) }}>{f.efectividad == null ? "—" : `${fmt(f.efectividad)}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  );
}
