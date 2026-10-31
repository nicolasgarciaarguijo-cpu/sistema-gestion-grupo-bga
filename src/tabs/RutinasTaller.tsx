// FABRICACION · MANTENIMIENTO, ORDEN Y LIMPIEZA (Nicolas, 30/10/2026). Las rutinas del taller (diarias y semanales) con
// sus horas y cuantas personas; quien las hace sale de las capacidades (aprendices y ayudantes primero, del mas
// economico al mas costoso). "Completar el dia" las pone en los huecos de la organizacion diaria. El costo es solo una
// PREVISION para presupuestar: no va al cash flow ni al calendario. Ver domain/rutinasTaller.ts.
import React, { useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import {
  DIAS_SEMANA,
  diaDeRutina,
  ordenParaRutina,
  previsionDeRutinas,
  textoFrecuencia,
  type CandidatoRutina,
  type ResultadoCompletar,
  type RutinaTaller,
} from "../domain/rutinasTaller";
import type { TipoTarea } from "../domain/organizacionDiaria";

const fmt = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
const th: React.CSSProperties = { padding: "4px 6px", textAlign: "left", fontSize: 12, color: "#64748b", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 6px", fontSize: 12.5, borderBottom: "1px solid #f1f5f9" };
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "5px 8px", fontSize: 13, width: "100%" };
const campo: React.CSSProperties = { display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600 };

export function RutinasTaller({
  rutinas,
  candidatos,
  gruposCosto,
  tareas,
  money,
  hoy,
  onGuardar,
  onBorrar,
  onCompletarDia,
  nuevoId,
}: {
  rutinas: RutinaTaller[];
  // Toda la gente de fabrica, con su costo hora y si es aprendiz/ayudante (la presencia se mira al completar el dia).
  candidatos: CandidatoRutina[];
  // Grupos de Costos de la empresa que fabrica: ahi se suma en Marcadores la mano de obra de cada rutina.
  gruposCosto: string[];
  tareas: TipoTarea[];
  money: (n: number) => string;
  hoy: string;
  onGuardar: (r: RutinaTaller) => void;
  onBorrar: (id: number) => void;
  onCompletarDia: (fecha: string) => ResultadoCompletar;
  nuevoId: () => number;
}) {
  const [editando, setEditando] = useState<RutinaTaller | null>(null);
  const [menu, setMenu] = useState<null | { x: number; y: number; r: RutinaTaller }>(null);
  const [dia, setDia] = useState(hoy);
  const [resultado, setResultado] = useState<ResultadoCompletar | null>(null);
  const prevision = previsionDeRutinas(rutinas, candidatos);
  const nombreTarea = (id?: number | null) => (id == null ? "" : tareas.find((t) => t.id === id)?.nombre || "tarea borrada");
  const nombreRutina = (id: number) => rutinas.find((r) => r.id === id)?.nombre || "rutina";
  const ordenadas = [...rutinas].sort((a, b) => Number(a.activa === false) - Number(b.activa === false) || a.frecuencia.localeCompare(b.frecuencia) || a.nombre.localeCompare(b.nombre));
  const e = editando;

  return (
    <Panel
      span="full"
      title="Mantenimiento, orden y limpieza"
      actions={
        <span style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <input type="date" value={dia} onChange={(ev) => setDia(ev.target.value)} style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "4px 6px", fontSize: 12.5 }} />
          <ButtonLike secondary disabled={!dia || !rutinas.some((r) => r.activa !== false)} onClick={() => setResultado(onCompletarDia(dia))}>
            Completar huecos del día
          </ButtonLike>
          <ButtonLike onClick={() => setEditando({ id: nuevoId(), nombre: "", frecuencia: "diaria", horas: 0.5, personas: 1, activa: true })}>+ Rutina</ButtonLike>
        </span>
      }
    >
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
        Los trabajos que se repiten en el taller, diarios (lunes a viernes) o semanales. Los hacen primero aprendices y ayudantes, del más económico al más costoso;
        si la rutina tiene una tarea del catálogo, solo quienes la tienen en sus categorías. "Completar huecos del día" las pone al final del hueco libre de cada uno en la
        organización diaria. Los materiales tienen sus facturas; acá se calcula la <strong>mano de obra</strong> del tiempo de cada rutina, que se suma en <strong>Marcadores</strong> al grupo de costos elegido (previsión para presupuestar: no va al cash flow ni al calendario). Click derecho: editar, pausar o borrar.
      </div>
      {ordenadas.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin rutinas cargadas. Ej.: "Barrido del taller", diaria, 0,5 h; "Orden del depósito", semanal viernes, 2 h, 2 personas.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Rutina</th>
                <th style={th}>Frecuencia</th>
                <th style={{ ...th, textAlign: "right" }}>Horas</th>
                <th style={{ ...th, textAlign: "right" }}>Personas</th>
                <th style={th}>Autoriza (tarea)</th>
                <th style={th}>La hacen (en orden)</th>
                <th style={th}>Grupo de costos</th>
                <th style={{ ...th, textAlign: "right" }}>Hs-hombre/mes</th>
                <th style={{ ...th, textAlign: "right" }}>Mano de obra/mes</th>
              </tr>
            </thead>
            <tbody>
              {ordenadas.map((r) => {
                const p = prevision.filas.find((f) => f.rutinaId === r.id);
                const orden = ordenParaRutina(r, candidatos);
                const pausada = r.activa === false;
                return (
                  <tr
                    key={r.id}
                    onContextMenu={(ev) => {
                      ev.preventDefault();
                      setMenu({ x: ev.clientX, y: ev.clientY, r });
                    }}
                    onDoubleClick={() => setEditando(r)}
                    style={{ cursor: "context-menu", opacity: pausada ? 0.5 : 1 }}
                  >
                    <td style={{ ...td, fontWeight: 600 }}>{r.nombre}{pausada ? " (pausada)" : ""}</td>
                    <td style={td}>{textoFrecuencia(r)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{fmt(r.horas)}</td>
                    <td style={{ ...td, textAlign: "right" }}>{Math.max(1, Math.round(r.personas || 1))}</td>
                    <td style={td}>{nombreTarea(r.tareaId) || <span style={{ color: "#94a3b8" }}>cualquiera</span>}</td>
                    <td style={td} title={orden.map((c, i) => `${i + 1}. ${c.nombre} · ${money(c.costoHora)}/h${c.ayudante ? " · ayudante" : ""}`).join("\n")}>
                      {orden.length ? orden.slice(0, 3).map((c) => c.nombre).join(" → ") + (orden.length > 3 ? " → …" : "") : <span style={{ color: "#b91c1c" }}>nadie autorizado</span>}
                    </td>
                    <td style={td}>{r.grupoCosto || <span style={{ color: "#b45309" }}>⚠ sin grupo (no llega a Marcadores)</span>}</td>
                    <td style={{ ...td, textAlign: "right" }}>{p ? fmt(p.horasMes) : "—"}</td>
                    <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{p ? money(p.costoMes) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ fontSize: 13, background: "#f8fafc", borderRadius: 8, padding: "6px 10px", marginTop: 8 }}>
        Mano de obra de las rutinas: <strong>{fmt(prevision.horasMes)} hs-hombre</strong> · <strong>{money(prevision.costoMes)}</strong> por mes, con el costo hora de quienes las hacen.
        Se suma en Marcadores → Costos empresariales, en el grupo de cada rutina.
      </div>

      {resultado && (
        <div style={{ fontSize: 12.5, border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", marginTop: 8, display: "grid", gap: 3 }}>
          <strong>Día {dia.split("-").reverse().join("/")}</strong>
          {resultado.puestas.length === 0 && resultado.sinHueco.length === 0 && (
            <span style={{ color: "#64748b" }}>{resultado.yaEstaban ? "Las rutinas del día ya estaban en la organización." : "Ese día no toca ninguna rutina."}</span>
          )}
          {resultado.puestas.map((p, i) => (
            <span key={i} style={{ color: "#166534" }}>✓ {nombreRutina(p.rutinaId)}: {p.empleado} de {p.desde} a {p.hasta}</span>
          ))}
          {resultado.sinHueco.map((s) => (
            <span key={s.rutinaId} style={{ color: "#b91c1c" }}>⚠ {s.nombre}: falta{s.faltan === 1 ? "" : "n"} {s.faltan} persona{s.faltan === 1 ? "" : "s"} con hueco (o no hay nadie autorizado en fábrica)</span>
          ))}
          <ButtonLike secondary onClick={() => setResultado(null)}>Cerrar</ButtonLike>
        </div>
      )}

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>{menu.r.nombre}</QuickMenuTitle>
          <button type="button" style={quickMenuItem} onClick={() => { setEditando(menu.r); setMenu(null); }}>Editar…</button>
          <button type="button" style={quickMenuItem} onClick={() => { onGuardar({ ...menu.r, activa: menu.r.activa === false }); setMenu(null); }}>
            {menu.r.activa === false ? "Reanudar" : "Pausar"}
          </button>
          <QuickMenuSep />
          <button
            type="button"
            style={{ ...quickMenuItem, color: "#b91c1c" }}
            onClick={() => {
              if (window.confirm(`¿Borrar la rutina "${menu.r.nombre}"? Lo ya puesto en la organización diaria queda.`)) onBorrar(menu.r.id);
              setMenu(null);
            }}
          >
            Borrar
          </button>
        </QuickMenu>
      )}

      {e && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }} onClick={() => setEditando(null)}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(560px, 100%)", padding: 18, display: "grid", gap: 10 }} onClick={(ev) => ev.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Rutina de mantenimiento, orden y limpieza</strong>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label style={{ ...campo, gridColumn: "1 / -1" }}>
                Nombre
                <input style={input} value={e.nombre} autoFocus onChange={(ev) => setEditando({ ...e, nombre: ev.target.value })} placeholder="Barrido del taller" />
              </label>
              <label style={campo}>
                Frecuencia
                <select style={input} value={e.frecuencia} onChange={(ev) => setEditando({ ...e, frecuencia: ev.target.value as RutinaTaller["frecuencia"] })}>
                  <option value="diaria">Diaria (lunes a viernes)</option>
                  <option value="semanal">Semanal</option>
                </select>
              </label>
              <label style={campo}>
                Día (semanal)
                <select style={input} disabled={e.frecuencia !== "semanal"} value={diaDeRutina(e)} onChange={(ev) => setEditando({ ...e, dia: Number(ev.target.value) })}>
                  {DIAS_SEMANA.map((d, i) => (i ? <option key={i} value={i}>{d}</option> : null))}
                </select>
              </label>
              <label style={campo}>
                Horas cada vez
                <input style={input} type="number" min={0} step={0.25} value={e.horas} onChange={(ev) => setEditando({ ...e, horas: Math.max(0, Number(ev.target.value) || 0) })} />
              </label>
              <label style={campo}>
                Personas
                <input style={input} type="number" min={1} step={1} value={e.personas || 1} onChange={(ev) => setEditando({ ...e, personas: Math.max(1, Math.round(Number(ev.target.value) || 1)) })} />
              </label>
              <label style={{ ...campo, gridColumn: "1 / -1" }}>
                Tarea del catálogo (autoriza por categorías; vacío = cualquiera)
                <select style={input} value={e.tareaId ?? ""} onChange={(ev) => setEditando({ ...e, tareaId: ev.target.value ? Number(ev.target.value) : null })}>
                  <option value="">— Cualquiera —</option>
                  {[...tareas].filter((t) => t.activa !== false).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </label>
              <label style={{ ...campo, gridColumn: "1 / -1" }}>
                Grupo de costos (ahí se suma su mano de obra en Marcadores)
                <select style={input} value={e.grupoCosto || ""} onChange={(ev) => setEditando({ ...e, grupoCosto: ev.target.value || undefined })}>
                  <option value="">— Elegir —</option>
                  {[...gruposCosto, ...(e.grupoCosto && !gruposCosto.includes(e.grupoCosto) ? [e.grupoCosto] : [])].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label style={{ ...campo, gridColumn: "1 / -1" }}>
                Notas
                <input style={input} value={e.notas || ""} onChange={(ev) => setEditando({ ...e, notas: ev.target.value })} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <ButtonLike secondary onClick={() => setEditando(null)}>Cancelar</ButtonLike>
              <ButtonLike
                disabled={!e.nombre.trim() || !(e.horas > 0)}
                onClick={() => {
                  onGuardar({ ...e, nombre: e.nombre.trim() });
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
