// FABRICACION · ORGANIZACION DIARIA (Nicolas, 2026-10-22). Un calendario: al abrir un dia aparece el listado
// de empleados, cada uno con su FICHA del dia (fabrica u obra, turnos con sus horas y como se pagan, tareas por
// hora con su casilla de hecha), el PDF de cada empleado para pasarle las tareas y la LINEA TEMPORAL de donde
// esta cada uno (cuantos hay juntos en cada lugar). Abajo, el catalogo de grupos de trabajo y tipos de tarea
// para no tipear todo cada vez. La logica vive en domain/organizacionDiaria.ts.
import React, { useEffect, useMemo, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, quickMenuItem } from "../ui/primitives";
import {
  avisosDelDia,
  comoSePaga,
  franjasPorLugar,
  genteJuntaPorLugar,
  horasDelDia,
  linkMapa,
  minutosReales,
  presenciaDelDia,
  type RegistroAsistencia,
  turnoExtraSiguiente,
  turnosPorDefecto,
  type AsignacionDiaria,
  type GrupoTrabajo,
  type LugarDelDia,
  type TareaDelDia,
  type TipoTarea,
  type TurnoDia,
  type UnidadTarea,
  UNIDADES_TAREA,
  conHerramientasDeLaTarea,
  idsDeGrupo,
  pegarTareasEnGrupo,
  tareasDeGrupo,
} from "../domain/organizacionDiaria";
import { timeToMinutes } from "../domain/attendance";
import { GRUPOS_MAQUINAS, herramientasFaltantes, type Faltante, type FichaMaquina, type MaquinaStock } from "../domain/mantenimiento";
import { claveTarea, faltaDeGente, type NecesidadDeTarea } from "../domain/tiposMueble";
import { capacidadesDelEmpleado, capacidadesPorTareaEntera, categoriaPrincipal, etiquetaCategoria, tieneCapacidades, type Capacidad, type CategoriaEmpleado } from "../domain/categoriasEmpleado";

// asistencia: la de Personal (reloj, ausencias, vacaciones), para saber quien esta ese dia.
export type EmpleadoOrg = { id: number; name: string; company: string; categoriasInternas?: number[]; tareasDominadas?: number[]; asistencia?: RegistroAsistencia[] };
export type TrabajoOrg = { id: number; budgetNumber: string; client: string; company: string; direccion?: string };

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const pad = (n: number) => String(n).padStart(2, "0");
const fmtLargo = (iso: string) => {
  const d = new Date(`${iso}T12:00:00`);
  return `${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
};
const input: React.CSSProperties = { border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, background: "#fff", boxSizing: "border-box" };
const caja: React.CSSProperties = { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 12px" };
const titulo: React.CSSProperties = { fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 6 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "3px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const btn = (rojo = false): React.CSSProperties => ({
  border: `1px solid ${rojo ? "#fecaca" : "#cbd5e1"}`, background: "#fff", color: rojo ? "#b91c1c" : "#334155",
  borderRadius: 6, padding: "3px 8px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
});
const COLOR_LUGAR = { fabrica: "#0f766e", obra: "#b45309" };

export function OrganizacionDiaria({
  empleados,
  trabajos,
  asignaciones,
  grupos,
  tipos,
  categorias,
  companyShort,
  onGuardarAsignacion,
  onBorrarAsignacion,
  onGuardarGrupo,
  onBorrarGrupo,
  onGuardarTipo,
  onBorrarTipo,
  onAbrirTrabajo,
  nuevoId,
  maquinas = [],
  fichasMaquinas = [],
  onRetrabajo,
  mostrarCatalogo = true,
  necesidades,
  onAbrirFichaPersonal,
  vista,
  onVista,
}: {
  // Ir a la ficha de Personal de la persona (y volver: ver App). Para no andar saltando de solapa (Nicolas, 30/10/2026).
  onAbrirFichaPersonal?: (empleadoId: number) => void;
  // Dia elegido y ficha abierta guardados afuera: al volver de la ficha de Personal queda todo como estaba.
  vista?: { dia: string; abierta: number | null };
  onVista?: (v: { dia: string; abierta: number | null }) => void;
  // Lo que piden los muebles de cada trabajo por tarea (personas y horas), para avisar si ese dia hay menos gente.
  necesidades?: Map<number, Map<string, NecesidadDeTarea>>;
  // El catalogo de grupos de trabajo y tareas puede ir aparte (en Fabricacion va al fondo: CatalogoTareas).
  mostrarCatalogo?: boolean;
  // Click derecho en una tarea del dia: registrar que hubo que rehacerla (Retrabajos, en Fabricacion).
  onRetrabajo?: (p: { jobId: number | null; tareaId: number | null; responsableId: number; horasTarea: number; fecha: string; descripcion: string }) => void;
  empleados: EmpleadoOrg[];
  trabajos: TrabajoOrg[];
  asignaciones: AsignacionDiaria[];
  grupos: GrupoTrabajo[];
  tipos: TipoTarea[];
  // Categorias internas (Personal): el empleado solo hace las tareas de las suyas.
  categorias: CategoriaEmpleado[];
  companyShort: (company: string) => string;
  onGuardarAsignacion: (a: AsignacionDiaria) => void;
  onBorrarAsignacion: (id: number) => void;
  onGuardarGrupo: (g: GrupoTrabajo) => void;
  onBorrarGrupo: (id: number) => void;
  onGuardarTipo: (t: TipoTarea) => void;
  onBorrarTipo: (id: number) => void;
  onAbrirTrabajo?: (jobId: number) => void;
  nuevoId: () => number;
  // Maquinas y herramientas de Stock con su ficha (Mantenimiento): que pide cada tarea y si esta disponible.
  maquinas?: MaquinaStock[];
  fichasMaquinas?: FichaMaquina[];
}) {
  const tiposConHerramientas = conHerramientasDeLaTarea(tipos, grupos);
  const faltanPara = (tipoId: number) => herramientasFaltantes(tiposConHerramientas.find((x) => x.id === tipoId)?.herramientas, maquinas, fichasMaquinas);
  const hoy = new Date();
  const hoyIso = `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}`;
  const [mes, setMes] = useState((vista?.dia || hoyIso).slice(0, 7));
  const [diaLocal, setDiaLocal] = useState<string>(vista?.dia || hoyIso);
  const [abiertaLocal, setAbiertaLocal] = useState<number | null>(vista?.abierta ?? null); // empleadoId con la ficha abierta
  const dia = vista?.dia || diaLocal;
  const abierta = vista ? vista.abierta : abiertaLocal;
  const setDia = (d: string) => { setDiaLocal(d); onVista?.({ dia: d, abierta }); };
  const setAbierta = (id: number | null) => { setAbiertaLocal(id); onVista?.({ dia, abierta: id }); };
  const [verLinea, setVerLinea] = useState(true);
  // Escape cierra la ficha del dia.
  useEffect(() => {
    if (abierta == null) return;
    const alTeclear = (ev: KeyboardEvent) => { if (ev.key === "Escape") setAbierta(null); };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [abierta, dia]);

  const [y, m] = mes.split("-").map(Number);
  const primerDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
  const diasMes = new Date(y, m, 0).getDate();
  const mover = (n: number) => {
    const d = new Date(y, m - 1 + n, 1);
    setMes(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  };
  const porDia = useMemo(() => {
    const mapa = new Map<string, AsignacionDiaria[]>();
    asignaciones.forEach((a) => mapa.set(a.fecha, [...(mapa.get(a.fecha) || []), a]));
    return mapa;
  }, [asignaciones]);
  const delDia = porDia.get(dia) || [];
  const trabajoDe = (id?: number | null) => trabajos.find((t) => t.id === id);
  const nombreObra = (id: number) => {
    const t = trabajoDe(id);
    return t ? `${t.budgetNumber} · ${t.client}` : "Obra";
  };
  const tipoDe = (id?: number | null) => tipos.find((t) => t.id === id);
  // Si esta o no esta ese dia segun Asistencia (Personal: reloj, ausencias, vacaciones).
  const presenciaDe = (e: EmpleadoOrg) => presenciaDelDia(e.asistencia, dia, hoyIso);
  const ausentes = new Set(empleados.filter((e) => presenciaDe(e) === "no_esta").map((e) => e.name));

  // La asignacion del empleado ese dia (o una nueva, en fabrica, con los turnos de siempre).
  const asignacionDe = (e: EmpleadoOrg): AsignacionDiaria =>
    delDia.find((a) => a.empleadoId === e.id) || {
      id: 0,
      company: e.company,
      fecha: dia,
      empleadoId: e.id,
      empleado: e.name,
      lugar: "fabrica",
      turnos: turnosPorDefecto(dia),
      tareas: [],
    };
  const guardar = (a: AsignacionDiaria) => onGuardarAsignacion(a.id ? a : { ...a, id: nuevoId() });

  // Copiar el dia anterior con asignaciones: lugar, obra, turnos y tareas (sin las marcas de hecha).
  const copiarDiaAnterior = () => {
    const anteriores = Array.from(porDia.keys()).filter((f) => f < dia).sort();
    const desde = anteriores[anteriores.length - 1];
    if (!desde) return window.alert("No hay un día anterior con tareas cargadas.");
    const ya = new Set(delDia.map((a) => a.empleadoId));
    const delAnterior = (porDia.get(desde) || []).filter((a) => !ya.has(a.empleadoId));
    const empleadoDe = (id: number) => empleados.find((e) => e.id === id);
    const copiar = delAnterior.filter((a) => { const e = empleadoDe(a.empleadoId); return !e || presenciaDe(e) !== "no_esta"; });
    const salteados = delAnterior.filter((a) => !copiar.includes(a)).map((a) => a.empleado);
    if (salteados.length) window.alert(`No se copian ${salteados.join(", ")}: no están ese día según Asistencia.`);
    if (!copiar.length) return window.alert("Todos los empleados ya tienen el día armado.");
    if (!window.confirm(`¿Copiar ${copiar.length} ficha(s) del ${desde.split("-").reverse().join("/")} a este día?`)) return;
    copiar.forEach((a) =>
      onGuardarAsignacion({
        ...a,
        id: nuevoId(),
        fecha: dia,
        tareas: a.tareas.map((t) => ({ ...t, id: nuevoId(), hecha: false, hechaEn: undefined })),
      })
    );
  };

  // PDF del dia de un empleado, para pasarle las tareas.
  const pdfEmpleado = (a: AsignacionDiaria) => {
    const t = trabajoDe(a.jobId);
    const filas = [...a.tareas]
      .sort((x, z) => x.desde.localeCompare(z.desde))
      .map((tarea) => {
        const tipo = tipoDe(tarea.tipoTareaId);
        const pasos = (tipo?.pasos || []).filter(Boolean);
        return `<tr><td style="white-space:nowrap">${tarea.desde} – ${tarea.hasta}</td><td><b>${esc(tarea.descripcion || tipo?.nombre || "")}</b>${
          pasos.length ? `<ul style="margin:4px 0 0 16px;padding:0">${pasos.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>` : ""
        }${tarea.notas ? `<div style="color:#475569">${esc(tarea.notas)}</div>` : ""}</td><td style="width:70px;text-align:center">☐</td><td style="width:90px"></td></tr>`;
      })
      .join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tareas ${esc(a.empleado)} ${a.fecha}</title>
<style>body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:20px;margin:0}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #cbd5e1;padding:6px 8px;font-size:13px;vertical-align:top}th{background:#f1f5f9;text-align:left}.m{color:#475569;font-size:13px;margin-top:4px}</style></head><body>
<h1>${esc(a.empleado)} · ${fmtLargo(a.fecha)}</h1>
<div class="m">${a.lugar === "obra" ? `En obra: <b>${esc(t ? `${t.budgetNumber} · ${t.client}` : "Obra")}</b>${t?.direccion ? ` · ${esc(t.direccion)}` : ""}` : "En fábrica"}</div>
<div class="m">Turnos: ${a.turnos.map((tu) => `${esc(tu.nombre)} ${tu.desde}–${tu.hasta}`).join(" · ") || "—"}</div>
${a.notas ? `<div class="m">${esc(a.notas)}</div>` : ""}
<table><thead><tr><th>Horario</th><th>Tarea</th><th>Hecha</th><th>Hora fin</th></tr></thead><tbody>${filas || `<tr><td colspan="4">Sin tareas cargadas.</td></tr>`}</tbody></table>
<script>window.onload=function(){window.print()}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return window.alert("El navegador bloqueó la ventana: habilitá las ventanas emergentes para imprimir.");
    w.document.write(html);
    w.document.close();
  };

  return (
    <>
      <Panel
        span="full"
        title="Organización diaria"
        abierto
        actions={
          <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            <button type="button" style={btn()} onClick={() => mover(-1)}>◀</button>
            <strong style={{ minWidth: 120, textAlign: "center", textTransform: "capitalize" }}>{MESES[m - 1]} {y}</strong>
            <button type="button" style={btn()} onClick={() => mover(1)}>▶</button>
            <button type="button" style={btn()} onClick={() => { setMes(hoyIso.slice(0, 7)); setDiaLocal(hoyIso); setAbiertaLocal(null); onVista?.({ dia: hoyIso, abierta: null }); }}>Hoy</button>
          </span>
        }
      >
        {/* CALENDARIO Y GENTE LADO A LADO (Nicolas, 30/10/2026): la lista de empleados del dia elegido se ve junto al
            calendario; cada uno abre su ficha del dia en una VENTANA EMERGENTE. */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 14, alignItems: "start" }}>
        <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 12 }}>
          {DIAS.map((d) => (
            <div key={d} style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textAlign: "center" }}>{d}</div>
          ))}
          {Array.from({ length: primerDow }, (_, i) => <div key={`v${i}`} />)}
          {Array.from({ length: diasMes }, (_, i) => {
            const iso = `${mes}-${pad(i + 1)}`;
            const lista = porDia.get(iso) || [];
            const enObra = lista.filter((a) => a.lugar === "obra").length;
            const tareas = lista.reduce((acc, a) => acc + a.tareas.length, 0);
            const hechas = lista.reduce((acc, a) => acc + a.tareas.filter((t) => t.hecha).length, 0);
            const elegido = iso === dia;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => { setDiaLocal(iso); setAbiertaLocal(null); onVista?.({ dia: iso, abierta: null }); }}
                style={{
                  minHeight: 58, textAlign: "left", borderRadius: 6, padding: 4, cursor: "pointer",
                  border: elegido ? "2px solid #0f172a" : iso === hoyIso ? "2px solid #94a3b8" : "1px solid #e2e8f0",
                  background: (i + primerDow) % 7 >= 5 ? "#fef2f2" : "#fff",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{i + 1}</div>
                {lista.length > 0 && (
                  <div style={{ fontSize: 10.5, lineHeight: 1.3 }}>
                    <div style={{ color: COLOR_LUGAR.fabrica, fontWeight: 700 }}>🏭 {lista.length - enObra}</div>
                    {enObra > 0 && <div style={{ color: COLOR_LUGAR.obra, fontWeight: 700 }}>🏗 {enObra}</div>}
                    {tareas > 0 && <div style={{ color: hechas === tareas ? "#166534" : "#475569" }}>✓ {hechas}/{tareas}</div>}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        </div>
        <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ fontSize: 17, fontWeight: 800, textTransform: "capitalize" }}>{fmtLargo(dia)}</div>
          <span style={{ display: "inline-flex", gap: 6 }}>
            <button type="button" style={btn()} onClick={copiarDiaAnterior}>Copiar el día anterior</button>
            <button type="button" style={btn()} onClick={() => setVerLinea((v) => !v)}>{verLinea ? "Ocultar" : "Ver"} línea temporal</button>
          </span>
        </div>

        <div style={{ display: "grid", gap: 4 }}>
          {empleados.length === 0 && <div style={{ fontSize: 13, color: "#64748b" }}>No hay empleados activos en Personal.</div>}
          {empleados.map((e) => {
            const a = asignacionDe(e);
            const existe = !!a.id;
            const t = trabajoDe(a.jobId);
            const h = horasDelDia(a);
            const hechas = a.tareas.filter((x) => x.hecha).length;
            const pr = presenciaDe(e);
            const cp = categoriaPrincipal(e.categoriasInternas, categorias);
            return (
              <div
                key={e.id}
                onClick={() => setAbierta(e.id)}
                title="Abrir la ficha del día"
                style={{ border: "1px solid #e2e8f0", borderLeft: `4px solid ${existe ? COLOR_LUGAR[a.lugar] : "#cbd5e1"}`, borderRadius: 8, background: abierta === e.id ? "#f1f5f9" : "#fff", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, padding: "6px 8px", cursor: "pointer" }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    <strong>{e.name}</strong> <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{companyShort(e.company)}</span>
                    {pr !== "sin_dato" && (
                      <span title="Según Asistencia (Personal)" style={{ fontSize: 11.5, fontWeight: 700, marginLeft: 6, color: pr === "esta" ? "#15803d" : "#b91c1c" }}>{pr === "esta" ? "✓ está" : "✗ no está"}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11.5, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {cp ? <span style={{ color: "#0f766e" }}>{etiquetaCategoria(cp, categorias)}</span> : <span style={{ color: "#b45309" }}>sin categoría interna</span>}
                    {" · "}
                    {existe
                      ? `${a.lugar === "obra" ? `🏗 ${t ? `${t.budgetNumber} · ${t.client}` : "obra sin elegir"}` : "🏭 fábrica"} · ${h.total} h · ${a.tareas.length} tarea(s)${a.tareas.length ? ` (${hechas} hechas)` : ""}`
                      : "sin armar"}
                  </div>
                </div>
                <span style={{ display: "inline-flex", gap: 4, flexShrink: 0 }} onClick={(ev) => ev.stopPropagation()}>
                  {onAbrirFichaPersonal && <button type="button" style={btn()} title="Ficha de personal" onClick={() => onAbrirFichaPersonal(e.id)}>👤</button>}
                  <button type="button" style={btn()} onClick={() => setAbierta(e.id)}>{existe ? "✎ Ficha" : "+ Armar"}</button>
                </span>
              </div>
            );
          })}
        </div>
        </div>
        </div>

        {(() => {
          // FALTA GENTE (Nicolas, 28/10/2026): el tipo de mueble pide N personas y sus horas cuentan con ellas. Si ese dia hay
          // menos en la tarea del trabajo, se avisa con las horas que lleva para revalorizar a mano o decidir horas extras.
          const juntos = new Map<string, { jobId: number; clave: string; gente: Set<string> }>();
          delDia.forEach((a) =>
            a.tareas.forEach((x) => {
              const jobId = x.jobId ?? a.jobId;
              if (jobId == null || x.tipoTareaId == null) return;
              const clave = claveTarea(Number(x.tipoTareaId), tipos);
              const k = `${jobId}|${clave}`;
              const g = juntos.get(k) || { jobId, clave, gente: new Set<string>() };
              if (!ausentes.has(a.empleado)) g.gente.add(a.empleado);
              juntos.set(k, g);
            })
          );
          const fh = (n: number) => n.toLocaleString("es-AR", { maximumFractionDigits: 2 });
          const avisos = Array.from(juntos.values()).flatMap(({ jobId, clave, gente }) => {
            const n = necesidades?.get(jobId)?.get(clave);
            if (n && gente.size === 0) return [`${nombreObra(jobId)} · ${n.nombre}: no está ninguno de los asignados. Pide ${n.personas} personas y ${fh(n.horas)} h.`];
            const f = n ? faltaDeGente(n, gente.size) : null;
            if (!n || !f) return [];
            return [
              `${nombreObra(jobId)} · ${n.nombre}: los muebles piden ${n.personas} personas y hay ${gente.size} (${Array.from(gente).join(", ")}). Con ${n.personas} lleva ${fh(n.horas)} h (${fh(n.horasHombre)} horas-hombre); con ${gente.size} serían unas ${fh(f.horasConLaQueHay)} h. Revalorizá los horarios a mano o considerá horas extras.`,
            ];
          });
          // Asistencia: el que no esta y tiene tareas (hay que reasignarlas).
          const deAsistencia = empleados.flatMap((e) => {
            const pend = (delDia.find((x) => x.empleadoId === e.id)?.tareas || []).filter((x) => !x.hecha);
            return pend.length && presenciaDe(e) === "no_esta" ? [`${e.name} no está y tiene ${pend.length} tarea(s): reasignalas.`] : [];
          });
          avisos.push(...deAsistencia);
          return avisos.length ? (
            <div style={{ ...caja, marginBottom: 10, background: "#fffbeb", borderColor: "#fde68a" }}>
              <div style={{ ...titulo, color: "#b45309" }}>Avisos del día · gente y asistencia</div>
              {avisos.map((x) => <div key={x} style={{ fontSize: 12.5, color: "#92400e", marginBottom: 3 }}>⚠ {x}</div>)}
            </div>
          ) : null;
        })()}
        {verLinea && delDia.length > 0 && <LineaTemporal asignaciones={delDia} nombreObra={nombreObra} trabajoDe={trabajoDe} />}
      </Panel>

      {(() => {
        // LA FICHA DEL DIA EN VENTANA EMERGENTE (Nicolas, 30/10/2026), como el resto del sistema.
        const e = empleados.find((x) => x.id === abierta);
        if (!e) return null;
        const a = asignacionDe(e);
        const existe = !!a.id;
        const pr = presenciaDe(e);
        const cp = categoriaPrincipal(e.categoriasInternas, categorias);
        return (
          <div
            onClick={() => setAbierta(null)}
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.45)", zIndex: 70, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "40px 12px" }}
          >
            <div onClick={(ev) => ev.stopPropagation()} style={{ background: "#ffffff", borderRadius: 12, width: "min(980px, 100%)", padding: 14, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap", padding: "0 10px 10px" }}>
                <div>
                  <div style={{ fontSize: 19, fontWeight: 800 }}>{e.name} <span style={{ fontSize: 12.5, color: "#94a3b8", fontWeight: 600 }}>{companyShort(e.company)}</span></div>
                  <div style={{ fontSize: 12.5, color: "#64748b", textTransform: "capitalize" }}>
                    {fmtLargo(dia)}
                    {pr !== "sin_dato" && <span style={{ textTransform: "none", fontWeight: 700, marginLeft: 6, color: pr === "esta" ? "#15803d" : "#b91c1c" }}>{pr === "esta" ? "✓ está" : "✗ no está"}</span>}
                    <span style={{ textTransform: "none", marginLeft: 6, color: cp ? "#0f766e" : "#b45309" }}>{cp ? etiquetaCategoria(cp, categorias) : "sin categoría interna"}</span>
                  </div>
                </div>
                <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap" }}>
                  {onAbrirFichaPersonal && <button type="button" style={btn()} onClick={() => onAbrirFichaPersonal(e.id)}>👤 Ficha de personal</button>}
                  {existe && <button type="button" style={btn()} onClick={() => pdfEmpleado(a)}>🖨 PDF</button>}
                  <button type="button" style={btn()} onClick={() => setAbierta(null)}>✕ Cerrar</button>
                </span>
              </div>
              <FichaDelDia
                a={a}
                trabajos={trabajos}
                tipos={tipos}
                grupos={grupos}
                capacidades={tieneCapacidades(e.categoriasInternas, e.tareasDominadas) ? capacidadesPorTareaEntera(capacidadesDelEmpleado(e.categoriasInternas, categorias, e.tareasDominadas), tipos) : null}
                faltanPara={faltanPara}
                onGuardar={guardar}
                onBorrar={existe ? () => { if (window.confirm(`¿Borrar el día de ${e.name}?`)) { onBorrarAsignacion(a.id); setAbierta(null); } } : undefined}
                onAbrirTrabajo={onAbrirTrabajo}
                onRetrabajo={onRetrabajo}
                nuevoId={nuevoId}
              />
            </div>
          </div>
        );
      })()}

      {mostrarCatalogo && (
        <Catalogo grupos={grupos} tipos={tipos} maquinas={maquinas} onGuardarGrupo={onGuardarGrupo} onBorrarGrupo={onBorrarGrupo} onGuardarTipo={onGuardarTipo} onBorrarTipo={onBorrarTipo} nuevoId={nuevoId} />
      )}
    </>
  );
}

const esc = (s: string) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---- La ficha del dia de un empleado --------------------------------------------------------------
function FichaDelDia({
  a,
  trabajos,
  tipos,
  grupos,
  capacidades,
  faltanPara,
  onGuardar,
  onBorrar,
  onAbrirTrabajo,
  onRetrabajo,
  nuevoId,
}: {
  onRetrabajo?: (p: { jobId: number | null; tareaId: number | null; responsableId: number; horasTarea: number; fecha: string; descripcion: string }) => void;
  // Herramientas que faltan o no andan para un tipo de tarea (Mantenimiento).
  faltanPara?: (tipoId: number) => Faltante[];
  a: AsignacionDiaria;
  trabajos: TrabajoOrg[];
  tipos: TipoTarea[];
  grupos: GrupoTrabajo[];
  // Lo que el empleado domina, de la tarea mas nueva a la mas vieja. null = sin categorias cargadas (no
  // se restringe todavia).
  capacidades: Capacidad[] | null;
  onGuardar: (a: AsignacionDiaria) => void;
  onBorrar?: () => void;
  onAbrirTrabajo?: (jobId: number) => void;
  nuevoId: () => number;
}) {
  const set = (patch: Partial<AsignacionDiaria>) => onGuardar({ ...a, ...patch });
  const [menuTarea, setMenuTarea] = useState<null | { x: number; y: number; t: TareaDelDia }>(null);
  const retrabajo = (x: TareaDelDia) => {
    const desde = timeToMinutes(x.desde) ?? 0;
    const hasta = timeToMinutes(x.hasta) ?? desde;
    // Las horas de la tarea: lo que tardo de verdad si se marco hecha, si no lo planificado (sin el almuerzo).
    const real = minutosReales(x, a.fecha);
    const almuerzo = desde <= 13 * 60 + 30 && hasta >= 14 * 60 ? 30 : 0;
    const minutos = real != null ? real : Math.max(0, hasta - desde - almuerzo);
    onRetrabajo?.({
      jobId: x.jobId ?? a.jobId ?? null,
      tareaId: x.tipoTareaId ?? null,
      responsableId: a.empleadoId,
      horasTarea: Math.round((minutos / 60) * 100) / 100,
      fecha: a.fecha,
      descripcion: x.descripcion || tipos.find((tp) => tp.id === x.tipoTareaId)?.nombre || "",
    });
  };
  const setTurno = (id: string, patch: Partial<TurnoDia>) => set({ turnos: a.turnos.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const setTarea = (id: number, patch: Partial<TareaDelDia>) => set({ tareas: a.tareas.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  const t = trabajos.find((x) => x.id === a.jobId);
  const mapa = linkMapa(t?.direccion);
  const puede = (tipoId: number) => !capacidades || capacidades.some((c) => c.tareaId === tipoId);
  const fueraDeCategoria = a.tareas
    .filter((x) => x.tipoTareaId != null && !puede(Number(x.tipoTareaId)))
    .map((x) => `"${x.descripcion || tipos.find((tp) => tp.id === x.tipoTareaId)?.nombre || "tarea"}" está fuera de sus categorías internas`);
  // Tareas cuya maquina o herramienta falta o no anda (ver Mantenimiento).
  const sinHerramienta = a.tareas
    .filter((x) => x.tipoTareaId != null && !x.hecha)
    .flatMap((x) => (faltanPara ? faltanPara(Number(x.tipoTareaId)) : []).map((f) => `"${x.descripcion || "tarea"}" necesita ${f.nombre} (${f.motivo})`));
  const avisos = [...avisosDelDia(a), ...fueraDeCategoria, ...sinHerramienta];
  const h = horasDelDia(a);
  const tareas = [...a.tareas].sort((x, z) => x.desde.localeCompare(z.desde));
  const tiposActivos = tipos.filter((x) => x.activa !== false);
  // La proxima tarea arranca donde termino la anterior (o al empezar el primer turno).
  const siguienteHorario = () => {
    const ultima = tareas[tareas.length - 1];
    const desde = ultima?.hasta || a.turnos[0]?.desde || "07:30";
    const dm = timeToMinutes(desde) ?? 450;
    const hm = Math.min(dm + 60, 24 * 60 - 1);
    return { desde, hasta: `${pad(Math.floor(hm / 60))}:${pad(hm % 60)}` };
  };

  return (
    <div style={{ padding: "0 10px 10px", display: "grid", gap: 10 }}>
      <div style={caja}>
        <div style={titulo}>Dónde está</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {(["fabrica", "obra"] as LugarDelDia[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => set({ lugar: l, jobId: l === "fabrica" ? null : a.jobId })}
              style={{ ...btn(), background: a.lugar === l ? COLOR_LUGAR[l] : "#fff", color: a.lugar === l ? "#fff" : "#334155", borderColor: COLOR_LUGAR[l] }}
            >
              {l === "fabrica" ? "🏭 Fábrica" : "🏗 Obra"}
            </button>
          ))}
          {a.lugar === "obra" && (
            <select style={{ ...input, minWidth: 260 }} value={a.jobId ?? ""} onChange={(e) => set({ jobId: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— Elegí la obra (trabajo aprobado) —</option>
              {trabajos.map((x) => (
                <option key={x.id} value={x.id}>{x.budgetNumber} · {x.client}</option>
              ))}
            </select>
          )}
          {a.lugar === "obra" && t && (
            <>
              {mapa && <a href={mapa} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, fontWeight: 700 }}>📍 Ver en el mapa</a>}
              {onAbrirTrabajo && <button type="button" style={btn()} onClick={() => onAbrirTrabajo(t.id)}>Abrir la ficha del trabajo</button>}
            </>
          )}
        </div>
      </div>

      <div style={caja}>
        <div style={{ ...titulo, display: "flex", justifyContent: "space-between" }}>
          <span>Turnos · {h.total} h</span>
          <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 600, color: "#64748b" }}>
            {[h.normalHours && `${h.normalHours} normal`, h.extra50Hours && `${h.extra50Hours} al 50%`, h.extra100Hours && `${h.extra100Hours} al 100%`, (h.night50Hours || h.night100Hours) && `${h.night50Hours + h.night100Hours} nocturna`, h.holidayHours && `${h.holidayHours} feriado`].filter(Boolean).join(" · ")}
          </span>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {a.turnos.map((tu) => (
              <tr key={tu.id}>
                <td style={td}><input style={{ ...input, width: 110 }} value={tu.nombre} onChange={(e) => setTurno(tu.id, { nombre: e.target.value })} /></td>
                <td style={td}><input style={input} type="time" value={tu.desde} onChange={(e) => setTurno(tu.id, { desde: e.target.value })} /></td>
                <td style={td}><input style={input} type="time" value={tu.hasta} onChange={(e) => setTurno(tu.id, { hasta: e.target.value })} /></td>
                <td style={{ ...td, fontSize: 12, color: "#475569" }}>{comoSePaga(a.fecha, tu.desde, tu.hasta)}</td>
                <td style={{ ...td, textAlign: "right" }}>
                  <button type="button" style={btn(true)} onClick={() => set({ turnos: a.turnos.filter((x) => x.id !== tu.id) })}>🗑</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <button type="button" style={btn()} onClick={() => { const n = turnoExtraSiguiente(a.turnos); set({ turnos: [...a.turnos, { ...n, id: `${n.id}-${Date.now() % 100000}` }] }); }}>+ Turno extra</button>
          <button type="button" style={btn()} onClick={() => set({ turnos: turnosPorDefecto(a.fecha) })}>Volver a los turnos de siempre</button>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 4 }}>
          Se paga con la misma regla que la liquidación: L a V normal 07:30-17:00 (sin la media hora de almuerzo), después al 50% y desde las 21 nocturna; sábado al 50% hasta las 13 y al 100% después; domingo y feriado al 100%.
        </div>
      </div>

      <div style={caja}>
        <div style={titulo}>Tareas del día</div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>Desde</th>
              <th style={th}>Hasta</th>
              <th style={th}>Tipo de tarea</th>
              <th style={th}>Qué hace</th>
              <th style={th}>Hecha</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {tareas.length === 0 && (
              <tr><td style={{ ...td, color: "#94a3b8" }} colSpan={6}>Sin tareas. Agregá una abajo.</td></tr>
            )}
            {tareas.map((x) => {
              const real = minutosReales(x, a.fecha);
              const tipo = tipos.find((tp) => tp.id === x.tipoTareaId);
              return (
                <tr
                  key={x.id}
                  style={{ background: x.hecha ? "#f0fdf4" : undefined }}
                  onContextMenu={
                    onRetrabajo
                      ? (ev) => {
                          ev.preventDefault();
                          setMenuTarea({ x: ev.clientX, y: ev.clientY, t: x });
                        }
                      : undefined
                  }
                >
                  <td style={td}><input style={input} type="time" value={x.desde} onChange={(e) => setTarea(x.id, { desde: e.target.value })} /></td>
                  <td style={td}><input style={input} type="time" value={x.hasta} onChange={(e) => setTarea(x.id, { hasta: e.target.value })} /></td>
                  <td style={td}>
                    <select
                      style={{ ...input, maxWidth: 200 }}
                      value={x.tipoTareaId ?? ""}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const tp = tipos.find((z) => z.id === id);
                        setTarea(x.id, { tipoTareaId: id, descripcion: x.descripcion || tp?.nombre || "" });
                      }}
                    >
                      <option value="">— Elegí —</option>
                      {capacidades && (
                        <optgroup label="Lo que domina (las nuevas primero)">
                          {capacidades.map((c) => tiposActivos.find((tp) => tp.id === c.tareaId)).filter((tp): tp is TipoTarea => !!tp).map((tp) => (
                            <option key={`cap-${tp.id}`} value={tp.id}>{tp.nombre}</option>
                          ))}
                        </optgroup>
                      )}
                      {grupos.map((g) => {
                        const deGrupo = tiposActivos.filter((tp) => tp.grupoId === g.id && (!capacidades || !puede(tp.id)));
                        return deGrupo.length ? (
                          <optgroup key={g.id} label={capacidades ? `${g.nombre} · fuera de su categoría` : g.nombre}>
                            {deGrupo.map((tp) => <option key={tp.id} value={tp.id} disabled={!puede(tp.id)}>{tp.nombre}</option>)}
                          </optgroup>
                        ) : null;
                      })}
                      {tiposActivos.filter((tp) => (!tp.grupoId || !grupos.some((g) => g.id === tp.grupoId)) && (!capacidades || !puede(tp.id))).map((tp) => (
                        <option key={tp.id} value={tp.id} disabled={!puede(tp.id)}>{tp.nombre}</option>
                      ))}
                    </select>
                  </td>
                  <td style={td}>
                    <input style={{ ...input, width: "100%" }} value={x.descripcion} placeholder={tipo?.nombre || "Descripción"} onChange={(e) => setTarea(x.id, { descripcion: e.target.value })} />
                    {tipo?.pasos?.length ? <div style={{ fontSize: 11, color: "#64748b" }}>{tipo.pasos.join(" → ")}</div> : null}
                  </td>
                  <td style={{ ...td, whiteSpace: "nowrap", fontSize: 12 }}>
                    <label style={{ display: "inline-flex", gap: 4, alignItems: "center", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={!!x.hecha}
                        onChange={(e) => setTarea(x.id, { hecha: e.target.checked, hechaEn: e.target.checked ? new Date().toISOString() : undefined })}
                      />
                      {x.hecha && x.hechaEn
                        ? `${new Date(x.hechaEn).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}${real != null ? ` · ${Math.floor(real / 60)}h${pad(real % 60)}` : ""}${tipo?.horasEstimadas ? ` (estándar ${tipo.horasEstimadas} h)` : ""}`
                        : ""}
                    </label>
                  </td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button type="button" style={btn(true)} onClick={() => set({ tareas: a.tareas.filter((z) => z.id !== x.id) })}>🗑</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
          <button type="button" style={btn()} onClick={() => set({ tareas: [...a.tareas, { id: nuevoId(), descripcion: "", ...siguienteHorario() }] })}>+ Tarea</button>
          {onBorrar && <button type="button" style={btn(true)} onClick={onBorrar}>🗑 Borrar el día</button>}
        </div>
        {menuTarea && (
          <QuickMenu x={menuTarea.x} y={menuTarea.y} onClose={() => setMenuTarea(null)}>
            <QuickMenuTitle>{menuTarea.t.descripcion || "Tarea"}</QuickMenuTitle>
            <button type="button" style={quickMenuItem} onClick={() => { retrabajo(menuTarea.t); setMenuTarea(null); }}>Hubo que rehacerla: registrar retrabajo…</button>
          </QuickMenu>
        )}
        {avisos.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 12, color: "#b45309", fontWeight: 700 }}>{avisos.map((x) => <div key={x}>⚠ {x}</div>)}</div>
        )}
        <label style={{ display: "grid", gap: 3, fontSize: 12, color: "#475569", fontWeight: 600, marginTop: 8 }}>
          Notas del día
          <input style={{ ...input, width: "100%" }} value={a.notas || ""} onChange={(e) => set({ notas: e.target.value })} />
        </label>
      </div>
    </div>
  );
}

// ---- Linea temporal: cada lugar con su gente, de 07 a 23 -----------------------------------------
function LineaTemporal({
  asignaciones,
  nombreObra,
  trabajoDe,
}: {
  asignaciones: AsignacionDiaria[];
  nombreObra: (jobId: number) => string;
  trabajoDe: (id?: number | null) => TrabajoOrg | undefined;
}) {
  const franjas = franjasPorLugar(asignaciones, nombreObra);
  const lugares = genteJuntaPorLugar(franjas);
  const INI = 7 * 60;
  const FIN = 23 * 60;
  const pos = (hhmm: string) => (((timeToMinutes(hhmm) ?? INI) - INI) / (FIN - INI)) * 100;
  const horas = Array.from({ length: (FIN - INI) / 60 + 1 }, (_, i) => 7 + i);
  return (
    <div style={{ ...caja, marginBottom: 10 }}>
      <div style={titulo}>Línea temporal · dónde está cada uno</div>
      <div style={{ position: "relative", height: 16, marginLeft: 190, marginBottom: 4 }}>
        {horas.map((h) => (
          <span key={h} style={{ position: "absolute", left: `${((h * 60 - INI) / (FIN - INI)) * 100}%`, fontSize: 10, color: "#94a3b8", transform: "translateX(-50%)" }}>{h}</span>
        ))}
      </div>
      {lugares.map((l) => {
        const deLugar = franjas.filter((f) => f.lugarKey === l.lugarKey);
        const personas = Array.from(new Set(deLugar.map((f) => f.empleado)));
        const color = l.lugarKey === "fabrica" ? COLOR_LUGAR.fabrica : COLOR_LUGAR.obra;
        const jobId = l.lugarKey.startsWith("obra:") ? Number(l.lugarKey.slice(5)) : null;
        const mapa = jobId != null ? linkMapa(trabajoDe(jobId)?.direccion) : null;
        return (
          <div key={l.lugarKey} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color }}>
              {l.lugarKey === "fabrica" ? "🏭" : "🏗"} {l.lugarLabel} · {l.personas.length} persona(s){l.maximoJuntos > 1 ? ` · hasta ${l.maximoJuntos} juntas` : ""}
              {mapa && <a href={mapa} target="_blank" rel="noreferrer" style={{ marginLeft: 8, fontWeight: 600 }}>📍 mapa</a>}
            </div>
            {personas.map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", height: 18 }}>
                <div style={{ width: 190, fontSize: 12, color: "#334155", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p}</div>
                <div style={{ position: "relative", flex: 1, height: 12, background: "#eef2f7", borderRadius: 3 }}>
                  {deLugar.filter((f) => f.empleado === p).map((f, i) => (
                    <div
                      key={i}
                      title={`${p} · ${f.desde}-${f.hasta}`}
                      style={{ position: "absolute", left: `${Math.max(0, pos(f.desde))}%`, width: `${Math.max(0.5, pos(f.hasta) - pos(f.desde))}%`, top: 0, bottom: 0, background: color, borderRadius: 3, opacity: 0.85 }}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---- Catalogo: grupos de trabajo y tipos de tarea -------------------------------------------------
// El catalogo de grupos de trabajo y tareas, para dibujarlo donde haga falta (al fondo de Fabricacion).
export function CatalogoTareas(props: Parameters<typeof Catalogo>[0]) {
  return <Catalogo {...props} />;
}

function Catalogo({
  grupos,
  tipos,
  maquinas,
  stock = [],
  onGuardarGrupo,
  onBorrarGrupo,
  onGuardarTipo,
  onBorrarTipo,
  nuevoId,
}: {
  grupos: GrupoTrabajo[];
  tipos: TipoTarea[];
  maquinas: MaquinaStock[];
  // Articulos de Stock para los insumos de cada tarea (el grupo y el sugerido).
  stock?: Array<{ id: number; description: string; unit: string; unitPrice: number; group?: string }>;
  onGuardarGrupo: (g: GrupoTrabajo) => void;
  onBorrarGrupo: (id: number) => void;
  onGuardarTipo: (t: TipoTarea) => void;
  onBorrarTipo: (id: number) => void;
  nuevoId: () => number;
}) {
  const ordenados = [...grupos].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0) || a.nombre.localeCompare(b.nombre));
  // Una tarea puede estar en varios grupos (la lista de cada grupo); "sin grupo" = no esta en ninguno.
  const enAlgunGrupo = new Set(grupos.flatMap((g) => idsDeGrupo(g, tipos)));
  const sinGrupo = tipos.filter((t) => !enAlgunGrupo.has(t.id));
  const [herrDe, setHerrDe] = useState<number | null>(null);
  const [herrGrupo, setHerrGrupo] = useState<number | null>(null);
  const [insumosDe, setInsumosDe] = useState<number | null>(null);
  const [pegarEn, setPegarEn] = useState<GrupoTrabajo | null>(null);
  const [textoPegado, setTextoPegado] = useState("");
  const listaDe = (g: GrupoTrabajo) => idsDeGrupo(g, tipos);
  const moverEnGrupo = (g: GrupoTrabajo, id: number, d: -1 | 1) => {
    const ids = listaDe(g);
    const i = ids.indexOf(id);
    const j = i + d;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    onGuardarGrupo({ ...g, tareaIds: ids });
  };
  const otrosGruposDe = (t: TipoTarea, g: GrupoTrabajo) => grupos.filter((x) => x.id !== g.id && listaDe(x).includes(t.id)).map((x) => x.nombre);
  const tipoHerr = tipos.find((t) => t.id === herrDe);
  const grupoHerr = grupos.find((g) => g.id === herrGrupo);
  const objetivoHerr = grupoHerr
    ? { nombre: grupoHerr.nombre, ids: grupoHerr.herramientas || [], guardar: (ids: number[]) => onGuardarGrupo({ ...grupoHerr, herramientas: ids }) }
    : tipoHerr
    ? { nombre: tipoHerr.nombre, ids: tipoHerr.herramientas || [], guardar: (ids: number[]) => onGuardarTipo({ ...tipoHerr, herramientas: ids }) }
    : null;
  const cerrarHerr = () => {
    setHerrDe(null);
    setHerrGrupo(null);
  };
  const nombreMaq = (id: number) => maquinas.find((m) => m.id === id)?.description || "borrada de stock";
  const filaTipo = (t: TipoTarea, g: GrupoTrabajo | null, orden: number) => (
    <tr key={t.id} style={{ opacity: t.activa === false ? 0.5 : 1 }}>
      <td style={td}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {g && <span style={{ fontSize: 12, color: "#64748b", minWidth: 18, textAlign: "right" }}>{orden}.</span>}
          <input style={{ ...input, width: "100%" }} value={t.nombre} onChange={(e) => onGuardarTipo({ ...t, nombre: e.target.value })} />
        </span>
      </td>
      <td style={{ ...td, fontSize: 12, color: "#64748b" }}>
        {g ? (
          otrosGruposDe(t, g).length ? `También en: ${otrosGruposDe(t, g).join(", ")}` : "—"
        ) : (
          <select
            style={input}
            value=""
            onChange={(e) => {
              const destino = grupos.find((x) => x.id === Number(e.target.value));
              if (destino) onGuardarGrupo({ ...destino, tareaIds: [...listaDe(destino), t.id] });
            }}
          >
            <option value="">Sumar a una tarea…</option>
            {ordenados.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
          </select>
        )}
      </td>
      <td style={td}>
        <select style={input} value={t.unidad || "u"} onChange={(e) => onGuardarTipo({ ...t, unidad: e.target.value as UnidadTarea })}>
          {UNIDADES_TAREA.map((u) => <option key={u.value} value={u.value}>{u.label}</option>)}
        </select>
      </td>
      <td style={td}>
        <input
          style={{ ...input, width: 70 }}
          type="number"
          step="0.25"
          min="0"
          value={t.horasEstimadas ?? ""}
          onChange={(e) => onGuardarTipo({ ...t, horasEstimadas: e.target.value === "" ? undefined : Number(e.target.value) })}
        />
      </td>
      <td style={td}>
        <input
          style={{ ...input, width: 56 }}
          type="number"
          step="1"
          min="1"
          title="Personas a la vez. Con 2 o más: un especialista y ayudantes (el tiempo es el mismo; las horas-hombre se multiplican)"
          value={t.personas ?? 1}
          onChange={(e) => onGuardarTipo({ ...t, personas: Math.max(1, Math.round(Number(e.target.value) || 1)) === 1 ? undefined : Math.max(1, Math.round(Number(e.target.value) || 1)) })}
        />
      </td>
      <td style={td}>
        <button
          type="button"
          style={{ ...btn(), textAlign: "left", maxWidth: 220, whiteSpace: "normal" }}
          title="Máquinas y herramientas que hacen falta para esta tarea (salen de Stock)"
          onClick={() => setHerrDe(t.id)}
        >
          {(t.herramientas || []).length ? (t.herramientas || []).map(nombreMaq).join(", ") : "Herramientas…"}
        </button>
      </td>
      <td style={td}>
        <textarea
          style={{ ...input, width: "100%", minHeight: 34, fontFamily: "inherit", resize: "vertical" }}
          placeholder="Un paso por renglón"
          value={(t.pasos || []).join("\n")}
          onChange={(e) => onGuardarTipo({ ...t, pasos: e.target.value.split("\n") })}
        />
      </td>
      <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
        {g && (
          <>
            <button type="button" style={btn()} title="Subir en el grupo" onClick={() => moverEnGrupo(g, t.id, -1)}>↑</button>{" "}
            <button type="button" style={btn()} title="Bajar en el grupo" onClick={() => moverEnGrupo(g, t.id, 1)}>↓</button>{" "}
            <button type="button" style={btn()} title="Sacarlo de esta tarea (el paso sigue cargado)" onClick={() => onGuardarGrupo({ ...g, tareaIds: listaDe(g).filter((x) => x !== t.id) })}>Sacar</button>{" "}
          </>
        )}
        <button type="button" style={btn()} onClick={() => onGuardarTipo({ ...t, activa: t.activa === false })}>{t.activa === false ? "Activar" : "Pausar"}</button>{" "}
        <button type="button" style={btn(true)} onClick={() => window.confirm(`¿Borrar el tipo de tarea "${t.nombre}"?`) && onBorrarTipo(t.id)}>🗑</button>
      </td>
    </tr>
  );
  return (
    <Panel span="full" title="Tareas y su paso a paso">
      <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 8 }}>
        Se arma una vez y queda: cada tarea (Corte CNC, Pegado de cantos, Armado…) con su paso a paso, que siempre es el mismo, y las máquinas y herramientas que necesita. Cada paso lleva su unidad y sus horas por unidad. "Pegar paso a paso…" carga todos los pasos de una vez (1. … 2. … o uno por renglón); un paso que ya está escrito en otra tarea se llama con "+ Paso existente…" y es el mismo (mismo tiempo). Los tipos de mueble o trabajo eligen estas tareas desde su ficha.
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <ButtonLike onClick={() => onGuardarGrupo({ id: nuevoId(), nombre: "Tarea nueva", orden: grupos.length + 1 })}>+ Tarea</ButtonLike>
        <ButtonLike secondary onClick={() => onGuardarTipo({ id: nuevoId(), nombre: "Paso nuevo", grupoId: null, pasos: [], activa: true })}>+ Paso suelto</ButtonLike>
      </div>
      {[...ordenados.map((g) => ({ g: g as GrupoTrabajo | null, lista: tareasDeGrupo(g, tipos) })), ...(sinGrupo.length ? [{ g: null as GrupoTrabajo | null, lista: sinGrupo }] : [])].map(({ g, lista }) => (
        <div key={g ? g.id : "sin"} style={{ ...caja, marginBottom: 8 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
            {g ? (
              <>
                <input style={{ ...input, fontWeight: 800, minWidth: 200 }} value={g.nombre} onChange={(e) => onGuardarGrupo({ ...g, nombre: e.target.value })} />
                <input style={{ ...input, flex: 1, minWidth: 200 }} placeholder="Descripción de la tarea" value={g.descripcion || ""} onChange={(e) => onGuardarGrupo({ ...g, descripcion: e.target.value })} />
                <button
                  type="button"
                  style={{ ...btn(), maxWidth: 260, whiteSpace: "normal", textAlign: "left" }}
                  title="Máquinas y herramientas que hacen falta para esta tarea (salen de Stock)"
                  onClick={() => setHerrGrupo(g.id)}
                >
                  🛠 {(g.herramientas || []).length ? (g.herramientas || []).map(nombreMaq).join(", ") : "Máquinas y herramientas…"}
                </button>
                <button
                  type="button"
                  style={{ ...btn(), maxWidth: 260, whiteSpace: "normal", textAlign: "left" }}
                  title="Insumos que gasta la tarea (lija, cola, tornillos…): se suman a los materiales al presupuestar"
                  onClick={() => setInsumosDe(g.id)}
                >
                  🧴 {(g.insumos || []).length ? (g.insumos || []).map((x) => x.nombre || "insumo").join(", ") : "Insumos…"}
                </button>
                <button
                  type="button"
                  style={btn()}
                  onClick={() => {
                    const id = nuevoId();
                    onGuardarTipo({ id, nombre: "Paso nuevo", grupoId: g.id, pasos: [], activa: true });
                    onGuardarGrupo({ ...g, tareaIds: [...listaDe(g), id] });
                  }}
                >
                  + Paso
                </button>
                <button type="button" style={btn()} title="Pegar el paso a paso (1. … 2. … o uno por renglón): los que ya existen se llaman, los nuevos se crean" onClick={() => { setPegarEn(g); setTextoPegado(""); }}>Pegar paso a paso…</button>
                <select
                  style={{ ...input, maxWidth: 220 }}
                  value=""
                  title="Llamar un paso que ya está escrito (en otra tarea o suelto)"
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    if (id) onGuardarGrupo({ ...g, tareaIds: [...listaDe(g), id] });
                  }}
                >
                  <option value="">+ Paso existente…</option>
                  {[...tipos].filter((t) => t.activa !== false && !listaDe(g).includes(t.id)).sort((a, b) => a.nombre.localeCompare(b.nombre)).map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
                <button type="button" style={btn(true)} onClick={() => window.confirm(`¿Borrar la tarea "${g.nombre}"? Sus pasos siguen cargados (quedan sueltos).`) && onBorrarGrupo(g.id)}>🗑</button>
              </>
            ) : (
              <strong style={{ color: "#64748b" }}>Pasos sueltos (sin tarea)</strong>
            )}
          </div>
          {lista.length === 0 ? (
            <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin pasos todavía.</div>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={th}>Paso</th>
                  <th style={th}>También en</th>
                  <th style={th}>Unidad</th>
                  <th style={th}>Horas por unidad</th>
                  <th style={th} title="Personas a la vez: 2 o más = un especialista y ayudantes">Personas</th>
                  <th style={th}>Herramientas del paso</th>
                  <th style={th}>Detalle</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>{lista.map((t, i) => filaTipo(t, g, i + 1))}</tbody>
            </table>
          )}
        </div>
      ))}
      {pegarEn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }} onClick={() => setPegarEn(null)}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(640px, 100%)", padding: 18, display: "grid", gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Pegar el paso a paso de "{pegarEn.nombre}"</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>
              Pegá el paso a paso como lo tengas: "1. Limpieza del CNC 2. Control de presión…" o uno por renglón. Los pasos que ya existen se llaman (son el mismo paso); los nuevos se crean en esta tarea. Quedan en ese orden, al final.
            </div>
            <textarea
              autoFocus
              style={{ ...input, minHeight: 160, fontFamily: "inherit" }}
              value={textoPegado}
              onChange={(e) => setTextoPegado(e.target.value)}
              placeholder={"1. Limpieza del CNC\n2. Control de presión de aire\n3. …"}
            />
            {(() => {
              const prev = pegarTareasEnGrupo(pegarEn, tipos, textoPegado, () => -1);
              const total = prev.nuevas.length + prev.llamadas;
              return (
                <>
                  <div style={{ fontSize: 12.5, color: "#475569" }}>
                    {total ? `${prev.nuevas.length} nueva${prev.nuevas.length === 1 ? "" : "s"} · ${prev.llamadas} que ya existía${prev.llamadas === 1 ? "" : "n"}` : "Todavía no hay tareas para agregar."}
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
                    <ButtonLike secondary onClick={() => setPegarEn(null)}>Cancelar</ButtonLike>
                    <ButtonLike
                      disabled={!total}
                      onClick={() => {
                        const r = pegarTareasEnGrupo(pegarEn, tipos, textoPegado, nuevoId);
                        r.nuevas.forEach(onGuardarTipo);
                        onGuardarGrupo(r.grupo);
                        setPegarEn(null);
                      }}
                    >
                      Agregar {total || ""} tarea{total === 1 ? "" : "s"}
                    </ButtonLike>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {objetivoHerr && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }} onClick={cerrarHerr}>
          <div style={{ background: "#fff", borderRadius: 12, width: "min(560px, 100%)", padding: 18, display: "grid", gap: 8 }} onClick={(e) => e.stopPropagation()}>
            <strong style={{ fontSize: 15 }}>Máquinas y herramientas para "{objetivoHerr.nombre}"</strong>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>Tildá las máquinas y herramientas que hacen falta para hacer la tarea (valen para todo su paso a paso). Salen de Stock (Máquinas pesadas, Máquinas manuales y Herramientas); su estado se lleva en Mantenimiento.</div>
            {maquinas.length === 0 && <div style={{ fontSize: 12.5, color: "#b45309" }}>No hay máquinas ni herramientas en Stock todavía.</div>}
            {GRUPOS_MAQUINAS.map((g) => {
              const lista = maquinas.filter((m) => m.group === g);
              if (!lista.length) return null;
              return (
                <div key={g}>
                  <div style={{ fontSize: 11.5, fontWeight: 800, color: "#475569", textTransform: "uppercase", letterSpacing: 0.4 }}>{g}</div>
                  {lista.map((m) => {
                    const tiene = objetivoHerr.ids.includes(m.id);
                    return (
                      <label key={m.id} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, padding: "2px 0", cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={tiene}
                          onChange={(e) => objetivoHerr.guardar(e.target.checked ? [...objetivoHerr.ids, m.id] : objetivoHerr.ids.filter((x) => x !== m.id))}
                        />
                        {m.description} <span style={{ fontSize: 11.5, color: "#94a3b8" }}>{m.quantity} en stock</span>
                      </label>
                    );
                  })}
                </div>
              );
            })}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <ButtonLike onClick={cerrarHerr}>Listo</ButtonLike>
            </div>
          </div>
        </div>
      )}
      {(() => {
        const g = grupos.find((x) => x.id === insumosDe);
        if (!g) return null;
        const insumos = g.insumos || [];
        const unidad = tipos.find((t) => t.id === idsDeGrupo(g, tipos)[0])?.unidad || "u";
        const porCada = unidad === "u" ? "por mueble" : `por ${unidad === "m2" ? "m²" : unidad === "m3" ? "m³" : unidad} de la tarea`;
        const gruposStock = Array.from(new Set(stock.map((x) => x.group || "").filter(Boolean))).sort((a, b) => a.localeCompare(b));
        type Insumo = NonNullable<GrupoTrabajo["insumos"]>[number];
        const guardar = (lista: Insumo[]) => onGuardarGrupo({ ...g, insumos: lista });
        const cambiar = (id: number, cambios: Partial<Insumo>) => guardar(insumos.map((x) => (x.id === id ? { ...x, ...cambios } : x)));
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: 4700, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }} onClick={() => setInsumosDe(null)}>
            <div style={{ background: "#fff", borderRadius: 12, width: "min(860px, 100%)", padding: 18, display: "grid", gap: 8 }} onClick={(e) => e.stopPropagation()}>
              <strong style={{ fontSize: 15 }}>Insumos de "{g.nombre}"</strong>
              <div style={{ fontSize: 12.5, color: "#64748b" }}>
                Lo que gasta la tarea cada vez que se hace, <strong>{porCada}</strong> (la unidad de su paso a paso). Como los materiales del tipo de mueble, es un insumo genérico de un grupo de Stock:
                el artículo se elige al presupuestar ("Pasar materiales de los muebles") y el sugerido solo da un precio de referencia. De ahí llegan al checklist antes de producción.
              </div>
              {insumos.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "#94a3b8" }}>Sin insumos todavía.</div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={th}>Insumo</th>
                      <th style={th}>Grupo de Stock</th>
                      <th style={th}>Cantidad {porCada}</th>
                      <th style={th}>Unidad</th>
                      <th style={th}>Sugerido</th>
                      <th style={th}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {insumos.map((x) => (
                      <tr key={x.id}>
                        <td style={td}><input style={{ ...input, width: "100%" }} value={x.nombre || ""} placeholder="Lija 220" onChange={(e) => cambiar(x.id, { nombre: e.target.value })} /></td>
                        <td style={td}>
                          <select style={input} value={x.grupo || ""} onChange={(e) => cambiar(x.id, { grupo: e.target.value, stockItemId: undefined })}>
                            <option value="">—</option>
                            {[...gruposStock, ...(x.grupo && !gruposStock.includes(x.grupo) ? [x.grupo] : [])].map((gr) => <option key={gr} value={gr}>{gr}</option>)}
                          </select>
                        </td>
                        <td style={td}><input style={{ ...input, width: 80, textAlign: "right" }} type="number" min={0} step={0.01} value={x.cantidad} onChange={(e) => cambiar(x.id, { cantidad: Math.max(0, Number(e.target.value) || 0) })} /></td>
                        <td style={td}><input style={{ ...input, width: 60 }} value={x.unidad || ""} placeholder="u" onChange={(e) => cambiar(x.id, { unidad: e.target.value })} /></td>
                        <td style={td}>
                          <select style={{ ...input, maxWidth: 220 }} value={x.stockItemId ?? ""} onChange={(e) => cambiar(x.id, { stockItemId: e.target.value ? Number(e.target.value) : undefined })}>
                            <option value="">— ninguno —</option>
                            {stock.filter((it) => !x.grupo || it.group === x.grupo).map((it) => <option key={it.id} value={it.id}>{it.description}</option>)}
                          </select>
                        </td>
                        <td style={td}><button type="button" style={btn(true)} onClick={() => guardar(insumos.filter((y) => y.id !== x.id))}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                <ButtonLike secondary onClick={() => guardar([...insumos, { id: nuevoId(), nombre: "", unidad: "u", grupo: "", cantidad: 1 }])}>+ Insumo</ButtonLike>
                <select
                  style={{ ...input, maxWidth: 320 }}
                  value=""
                  title="Crear el insumo desde un artículo de Stock (toma su nombre, unidad y grupo)"
                  onChange={(e) => {
                    const it = stock.find((y) => y.id === Number(e.target.value));
                    if (it) guardar([...insumos, { id: nuevoId(), nombre: it.description, unidad: it.unit || "u", grupo: it.group || "", cantidad: 1, stockItemId: it.id }]);
                  }}
                >
                  <option value="">+ Desde un artículo de Stock…</option>
                  {[...stock].sort((a, b) => a.description.localeCompare(b.description)).map((it) => <option key={it.id} value={it.id}>{it.description}{it.group ? ` · ${it.group}` : ""}</option>)}
                </select>
                <span style={{ flex: 1 }} />
                <ButtonLike onClick={() => setInsumosDe(null)}>Listo</ButtonLike>
              </div>
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}
