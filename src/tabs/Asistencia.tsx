import React, { useMemo, useState, useEffect, useCallback } from "react";
import { styles } from "../ui/styles";
import { Panel, ButtonLike } from "../ui/primitives";
import { supabase } from "../lib/supabase";
import {
  computeMonthAttendance,
  summarizeMonthAttendance,
  scheduleForDate,
  WORKSHOP_SCHEDULE,
  type AttendanceLevel,
  type DayAttendance,
} from "../domain/attendance";
import type { CompanyName, Employee } from "../domain/types";

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
const WEEKDAY_LABELS = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

const LEVEL_COLOR: Record<AttendanceLevel, string> = {
  green: "#16a34a",
  yellow: "#ca8a04",
  red: "#dc2626",
  off: "#2563eb",
  none: "#94a3b8",
};

const shiftMonth = (month: string, delta: number): string => {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const monthLabel = (month: string): string => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[(m || 1) - 1]} ${y}`;
};

// Grilla del mes en semanas (Lunes a Domingo). Cada celda = { key, day } o null (relleno).
const buildMonthGrid = (month: string): Array<Array<{ key: string; day: number } | null>> => {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, (m || 1) - 1, 1);
  const daysInMonth = new Date(y, m || 1, 0).getDate();
  const leadingBlanks = (first.getDay() + 6) % 7; // Lunes = 0
  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ key: `${month}-${String(day).padStart(2, "0")}`, day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<{ key: string; day: number } | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
};

// Empresa con reloj Dahua conectado hoy (De Raíz). Cuando se sume BGA, esto pasa a depender del filtro.
const SYNC_COMPANY = "De raiz s.r.l";

type DahuaSyncRow = {
  requested_at: string | null;
  last_run_at: string | null;
  last_status: string | null;
  last_message: string | null;
  last_count: number | null;
};

// Botón "Sincronizar asistencia" + estado. El botón NO lee el reloj (es de red local): deja un pedido
// en Supabase (RPC) y la PC de la oficina (watcher) lo ejecuta y reporta el resultado acá.
function SyncReloj() {
  const [row, setRow] = useState<DahuaSyncRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("dahua_sync")
      .select("requested_at,last_run_at,last_status,last_message,last_count")
      .eq("company", SYNC_COMPANY)
      .maybeSingle();
    if (data) setRow(data as DahuaSyncRow);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // refresca el estado cada 15s
    return () => clearInterval(t);
  }, [load]);

  const pedir = async () => {
    setBusy(true);
    setMsg("");
    const { error } = await supabase.rpc("request_attendance_sync", { p_company: SYNC_COMPANY });
    if (error) {
      setMsg("No se pudo pedir la sincronización: " + error.message);
    } else {
      setMsg(
        "Pedido enviado. La PC de la oficina lo procesa en 1–3 min (tiene que estar prendida y el reloj en red)."
      );
    }
    setBusy(false);
    load();
  };

  const pendiente =
    !!row?.requested_at && (!row?.last_run_at || row.requested_at > row.last_run_at);
  const st = row?.last_status || "";
  const color =
    st === "ok" ? "#16a34a" : st === "error" ? "#dc2626" : st === "running" ? "#ca8a04" : "#64748b";
  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "—";
  const estadoTxt =
    st === "ok"
      ? "OK"
      : st === "error"
      ? "Error"
      : st === "running"
      ? "Sincronizando…"
      : st === "nada"
      ? "Sin novedades"
      : "—";

  return (
    <Panel title="Sincronización con el reloj (Dahua)" span="full">
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <ButtonLike onClick={pedir} disabled={busy}>
          {busy ? "Enviando pedido…" : "Sincronizar asistencia ahora"}
        </ButtonLike>
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <div>
            <strong>Última sincronización:</strong> {fmt(row?.last_run_at || null)}{" "}
            <span style={{ color, fontWeight: 600 }}>· {estadoTxt}</span>
          </div>
          {row?.last_message && (
            <div style={{ color: "#64748b" }}>{row.last_message}</div>
          )}
          {pendiente && (
            <div style={{ color: "#ca8a04" }}>Pedido en cola — esperando a la PC de la oficina…</div>
          )}
        </div>
      </div>
      {msg && <div style={{ ...styles.noticeBox, marginTop: 10 }}>{msg}</div>}
      <div style={{ ...styles.noticeBox, marginTop: 10, fontSize: 12 }}>
        El botón deja un pedido; el reloj lo lee la PC de la oficina (es un equipo de red local). Requiere
        esa PC prendida y en la red del reloj. También corre solo cada mañana. Solo De Raíz por ahora.
      </div>
    </Panel>
  );
}

export function AsistenciaTab({
  employees,
  initialMonth,
  companyOptions,
  getCompanyMeta,
}: {
  employees: Employee[];
  initialMonth: string;
  companyOptions: Array<{ value: CompanyName; short?: string }>;
  getCompanyMeta: (company: CompanyName) => { short: string; primary: string };
}) {
  const [month, setMonth] = useState(initialMonth || "");
  const [companyFilter, setCompanyFilter] = useState<"all" | CompanyName>("all");

  const shownEmployees = useMemo(
    () => employees.filter((e) => companyFilter === "all" || e.company === companyFilter),
    [employees, companyFilter]
  );

  // Semaforo del mes por empleado, calculado una vez.
  const perEmployeeMonth = useMemo(
    () =>
      shownEmployees.map((e) => ({
        employee: e,
        days: computeMonthAttendance(e.attendance || [], month),
        summary: summarizeMonthAttendance(e.attendance || [], month),
      })),
    [shownEmployees, month]
  );

  const weeks = useMemo(() => buildMonthGrid(month), [month]);

  const dayCell = (cell: { key: string; day: number } | null, idx: number) => {
    if (!cell) return <div key={`blank-${idx}`} style={cellBlank} />;
    const sched = scheduleForDate(cell.key);
    const nonWorking = sched === null;
    // Chips de empleados con dato ese dia (present/late/ausente/vacaciones). Los "sin dato" no se listan.
    const chips: Array<{ name: string; d: DayAttendance }> = [];
    for (const row of perEmployeeMonth) {
      const d = row.days.get(cell.key);
      if (d) chips.push({ name: row.employee.name || row.employee.legajo || "?", d });
    }
    return (
      <div key={cell.key} style={{ ...cellBase, ...(nonWorking ? cellOff : {}) }}>
        <div style={cellHead}>
          <strong>{cell.day}</strong>
          {sched && <span style={cellSched}>{sched.entry}</span>}
          {nonWorking && <span style={{ ...cellSched, color: "#94a3b8" }}>—</span>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
          {chips.map((c, i) => (
            <span
              key={`${cell.key}-${i}`}
              title={c.d.label}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: LEVEL_COLOR[c.d.level],
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {c.name}
              {c.d.tolerated ? " ·" : ""}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={styles.column}>
      <SyncReloj />
      <Panel
        title="Asistencia — calendario del taller"
        span="full"
        actions={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ButtonLike secondary onClick={() => setMonth(shiftMonth(month, -1))}>
              ‹ Mes
            </ButtonLike>
            <strong style={{ minWidth: 130, textAlign: "center" }}>{monthLabel(month)}</strong>
            <ButtonLike secondary onClick={() => setMonth(shiftMonth(month, 1))}>
              Mes ›
            </ButtonLike>
          </div>
        }
      >
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            Empresa:
            <select
              style={{ ...styles.input, width: "auto" }}
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value === "all" ? "all" : (e.target.value as CompanyName))}
            >
              <option value="all">Todas</option>
              {companyOptions.map((c) => (
                <option key={c.value} value={c.value}>
                  {getCompanyMeta(c.value).short}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12 }}>
            <Legend color={LEVEL_COLOR.green} text="En horario" />
            <Legend color={LEVEL_COLOR.yellow} text="Tarde" />
            <Legend color={LEVEL_COLOR.red} text="Ausente" />
            <Legend color={LEVEL_COLOR.off} text="Vacaciones" />
            <span style={{ color: "#64748b" }}>· = llegó con tolerancia</span>
          </div>
        </div>

        <div style={{ ...styles.noticeBox, marginBottom: 10 }}>
          Horario del taller: L-V {WORKSHOP_SCHEDULE.entry}–{WORKSHOP_SCHEDULE.exitWeekday}, Sáb{" "}
          {WORKSHOP_SCHEDULE.entry}–{WORKSHOP_SCHEDULE.exitSaturday}. Tolerancia{" "}
          {WORKSHOP_SCHEDULE.toleranceMinutes} min, máx {WORKSHOP_SCHEDULE.toleranceMaxPerMonth} por mes
          (la 3.ª ya cuenta como tarde). Los horarios exactos se cargan/editan en la ficha de cada
          empleado, bloque Presentismo. Cuando conectemos el reloj Dahua, se completa solo.
        </div>

        {shownEmployees.length === 0 ? (
          <div style={styles.empty}>No hay empleados para mostrar en esta empresa.</div>
        ) : (
          <>
            <div style={weekHeaderRow}>
              {WEEKDAY_LABELS.map((w) => (
                <div key={w} style={weekHeaderCell}>
                  {w}
                </div>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={`week-${wi}`} style={weekRow}>
                {week.map((cell, di) => dayCell(cell, wi * 7 + di))}
              </div>
            ))}
          </>
        )}
      </Panel>

      {shownEmployees.length > 0 && (
        <Panel title={`Resumen del mes — ${monthLabel(month)}`} span="full">
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Empresa</th>
                  <th>Presentes</th>
                  <th>En horario</th>
                  <th>Tarde</th>
                  <th>Tolerancias usadas</th>
                  <th>Ausentes</th>
                </tr>
              </thead>
              <tbody>
                {perEmployeeMonth.map((row) => (
                  <tr key={row.employee.id}>
                    <td>{row.employee.name || row.employee.legajo}</td>
                    <td>{getCompanyMeta(row.employee.company).short}</td>
                    <td>{row.summary.present}</td>
                    <td style={{ color: LEVEL_COLOR.green, fontWeight: 600 }}>{row.summary.onTime}</td>
                    <td style={{ color: row.summary.late > 0 ? LEVEL_COLOR.yellow : undefined, fontWeight: 600 }}>
                      {row.summary.late}
                    </td>
                    <td>
                      {row.summary.toleratedLates}/{WORKSHOP_SCHEDULE.toleranceMaxPerMonth}
                    </td>
                    <td style={{ color: row.summary.absent > 0 ? LEVEL_COLOR.red : undefined, fontWeight: 600 }}>
                      {row.summary.absent}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 999, background: color, display: "inline-block" }} />
      <span style={{ color: "#334155" }}>{text}</span>
    </span>
  );
}

const weekHeaderRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};
const weekHeaderCell: React.CSSProperties = {
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 1,
  color: "#64748b",
  textAlign: "center",
  fontWeight: 700,
};
const weekRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(7, 1fr)",
  gap: 6,
  marginBottom: 6,
};
const cellBase: React.CSSProperties = {
  minHeight: 84,
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "5px 7px",
  background: "#fff",
};
const cellOff: React.CSSProperties = { background: "#f8fafc", borderStyle: "dashed" };
const cellBlank: React.CSSProperties = { minHeight: 84, borderRadius: 8, background: "transparent" };
const cellHead: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
  fontSize: 12,
  color: "#0f172a",
};
const cellSched: React.CSSProperties = { fontSize: 10, color: "#94a3b8" };
