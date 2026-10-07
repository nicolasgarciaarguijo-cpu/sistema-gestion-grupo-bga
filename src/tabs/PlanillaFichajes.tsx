import React, { useMemo, useState } from "react";
import { Panel, ButtonLike, QuickMenu, QuickMenuTitle, QuickMenuSep, quickMenuItem } from "../ui/primitives";
import { styles } from "../ui/styles";
import { inputCelda, focoCelda } from "../ui/planilla";
import {
  ESTADO_FICHAJE_LABEL,
  hojasExcelFichajes,
  planillaDeFichajes,
  type CeldaFichaje,
  type EstadoFichaje,
} from "../domain/planillaFichajes";
import { ensureScript } from "../lib/ocr";
import { SHEETJS_CDN } from "../lib/bankStatement";
import type { AttendanceRecord, AttendanceStatus, CompanyName, Employee } from "../domain/types";

// PLANILLA DE FICHAJES: el horario de todo el personal junto, debajo del calendario de Asistencia.
// Empleados x dias del mes, con la entrada y la salida editables. Lo que se corrige aca se escribe con
// el MISMO handler que el Presentismo de la ficha del empleado (y le pone candado al dia, como alla):
// las dos vistas son el mismo dato. Se exporta a Excel para trabajarlo por fuera.

const COLOR: Record<EstadoFichaje, { bg: string; fg: string }> = {
  en_horario: { bg: "#dcfce7", fg: "#166534" },
  tarde: { bg: "#fef3c7", fg: "#92400e" },
  sin_salida: { bg: "#fee2e2", fg: "#991b1b" },
  revisar: { bg: "#fee2e2", fg: "#991b1b" },
  ausente: { bg: "#fecaca", fg: "#7f1d1d" },
  vacaciones: { bg: "#dbeafe", fg: "#1e40af" },
  no_laborable: { bg: "#f1f5f9", fg: "#94a3b8" },
  sin_fichada: { bg: "#ffffff", fg: "#94a3b8" },
};

const ESTADOS_A_MANO: Array<{ status: AttendanceStatus; label: string }> = [
  { status: "presente", label: "Presente" },
  { status: "ausente_justificado", label: "Ausente justificado" },
  { status: "ausente_injustificado", label: "Ausente injustificado" },
  { status: "vacaciones", label: "Vacaciones" },
  { status: "feriado", label: "Feriado" },
];

export function PlanillaFichajes({
  employees,
  month,
  monthLabel,
  getCompanyMeta,
  onUpdateAttendance,
}: {
  employees: Employee[];
  month: string;
  monthLabel: string;
  getCompanyMeta: (company: CompanyName) => { short: string; primary: string };
  onUpdateAttendance: (employeeId: number, date: string, field: keyof AttendanceRecord, value: string | number | boolean) => void;
}) {
  const filas = useMemo(
    () =>
      planillaDeFichajes(
        employees
          .slice()
          .sort((a, b) => a.company.localeCompare(b.company) || a.name.localeCompare(b.name)),
        month
      ),
    [employees, month]
  );
  const [menu, setMenu] = useState<null | { x: number; y: number; employeeId: number; name: string; celda: CeldaFichaje }>(null);
  const [exportando, setExportando] = useState(false);
  // El dia abierto: todas las pasadas por el reloj de esa persona ese dia.
  const [diaAbierto, setDiaAbierto] = useState<null | { name: string; celda: CeldaFichaje }>(null);

  const exportar = async () => {
    setExportando(true);
    try {
      await ensureScript(SHEETJS_CDN);
      const XLSX = (window as any).XLSX;
      if (!XLSX?.utils) throw new Error("No se pudo cargar el generador de Excel.");
      const { fichajes, grilla } = hojasExcelFichajes(filas, (c) => getCompanyMeta(c as CompanyName).short);
      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.aoa_to_sheet(fichajes);
      ws1["!cols"] = [8, 7, 26, 11, 5, 7, 7, 15, 8, 9, 9, 9, 8, 9, 9, 10, 8, 30].map((wch) => ({ wch }));
      ws1["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: fichajes.length - 1, c: fichajes[0].length - 1 } }) };
      XLSX.utils.book_append_sheet(wb, ws1, "Fichajes");
      const ws2 = XLSX.utils.aoa_to_sheet(grilla);
      ws2["!cols"] = [{ wch: 8 }, { wch: 26 }, ...grilla[0].slice(2).map(() => ({ wch: 13 }))];
      XLSX.utils.book_append_sheet(wb, ws2, "Grilla");
      const buffer: ArrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Fichajes ${month}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (err: any) {
      window.alert("No pude armar el Excel: " + (err?.message || String(err)));
    }
    setExportando(false);
  };

  if (filas.length === 0) return null;
  const dias = filas[0].celdas;
  const esFinde = (c: CeldaFichaje) => c.dia.startsWith("Sáb") || c.dia.startsWith("Dom");

  const thDia: React.CSSProperties = {
    position: "sticky", top: 0, zIndex: 3, background: "#f8fafc", fontSize: 11, color: "#475569",
    padding: "4px 2px", borderBottom: "1px solid #e2e8f0", textAlign: "center", minWidth: 62, whiteSpace: "nowrap",
  };
  const thNombre: React.CSSProperties = {
    position: "sticky", left: 0, top: 0, zIndex: 5, background: "#f1f5f9", textAlign: "left",
    padding: "4px 8px", borderBottom: "1px solid #e2e8f0", minWidth: 170,
  };
  const tdNombreFila: React.CSSProperties = {
    position: "sticky", left: 0, zIndex: 2, background: "#fff", padding: "4px 8px",
    borderBottom: "1px solid #f1f5f9", fontWeight: 600, fontSize: 12.5, minWidth: 170,
  };
  const inputHora: React.CSSProperties = { ...inputCelda, padding: "1px 2px", fontSize: 11, height: 20, textAlign: "center" };

  return (
    <Panel
      title={`Planilla de fichajes — ${monthLabel}`}
      span="full"
      actions={
        <ButtonLike onClick={exportar} disabled={exportando}>
          {exportando ? "Armando el Excel…" : "Exportar a Excel"}
        </ButtonLike>
      }
    >
      <div style={{ ...styles.muted, marginBottom: 8 }}>
        Entrada y salida de todo el personal, día por día. Lo que corregís acá se corrige también en la ficha
        de cada empleado (Presentismo) y al revés: es el mismo dato. Las horas se recalculan solas y el día
        queda con candado (editado a mano). Click derecho sobre un día para marcar ausencia, vacaciones o
        feriado.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8, fontSize: 11 }}>
        {(["en_horario", "tarde", "sin_salida", "ausente", "vacaciones", "no_laborable"] as EstadoFichaje[]).map((e) => (
          <span key={e} style={{ background: COLOR[e].bg, color: COLOR[e].fg, borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
            {ESTADO_FICHAJE_LABEL[e]}
          </span>
        ))}
      </div>
      <div style={{ overflow: "auto", maxHeight: "70vh", border: "1px solid #e2e8f0", borderRadius: 8 }}>
        <table className="planilla" style={{ borderCollapse: "separate", borderSpacing: 0, fontSize: 12 }}>
          <thead>
            <tr>
              <th style={thNombre}>Empleado</th>
              {dias.map((d) => (
                <th key={d.date} style={{ ...thDia, background: esFinde(d) ? "#fee2e2" : thDia.background }}>
                  {d.dia}
                </th>
              ))}
              <th style={{ ...thDia, minWidth: 54 }}>Horas</th>
              <th style={{ ...thDia, minWidth: 48 }}>Tardes</th>
              <th style={{ ...thDia, minWidth: 48 }}>Aus.</th>
              <th style={{ ...thDia, minWidth: 54 }}>Sin salida</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => {
              const meta = getCompanyMeta(f.company as CompanyName);
              return (
                <tr key={f.employeeId}>
                  <td style={{ ...tdNombreFila, boxShadow: `inset 4px 0 0 ${meta.primary}` }} title={`${f.name} · legajo ${f.legajo} · ${meta.short}`}>
                    {f.name}
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 400 }}>
                      {meta.short} · leg. {f.legajo || "—"}
                    </div>
                  </td>
                  {f.celdas.map((c) => {
                    const col = COLOR[c.estado];
                    return (
                      <td
                        key={c.date}
                        onContextMenu={(ev) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenu({ x: ev.clientX, y: ev.clientY, employeeId: f.employeeId, name: f.name, celda: c });
                        }}
                        title={[
                          `${f.name} · ${c.dia}`,
                          ESTADO_FICHAJE_LABEL[c.estado] + (c.detalle ? ` — ${c.detalle}` : ""),
                          c.horas.total ? `Horas: ${c.horas.total}` : "",
                          c.bloqueado ? "Editado a mano (candado)" : "",
                          c.pasadas.length ? `${c.pasadas.length} pasada${c.pasadas.length === 1 ? "" : "s"} por el reloj: ${c.pasadas.join(" · ")}` : "",
                          c.notas,
                        ].filter(Boolean).join("\n")}
                        style={{
                          background: col.bg,
                          padding: "2px 3px",
                          borderBottom: "1px solid #fff",
                          borderRight: "1px solid #fff",
                          verticalAlign: "top",
                          position: "relative",
                          outline: c.bloqueado ? "1px dashed #64748b" : undefined,
                          outlineOffset: -2,
                        }}
                      >
                        {/* PILL de pasadas: cuantas veces paso por el reloj ese dia. Solo MARCA (se abre con
                            click derecho). En ambar cuando son mas de 2: ahi conviene abrir el dia. */}
                        {c.pasadas.length > 0 && (
                          <span
                            style={{
                              position: "absolute",
                              top: 1,
                              right: 1,
                              minWidth: 13,
                              height: 13,
                              lineHeight: "13px",
                              padding: "0 3px",
                              borderRadius: 999,
                              fontSize: 9,
                              fontWeight: 800,
                              textAlign: "center",
                              background: c.pasadas.length > 2 ? "#f59e0b" : "#e2e8f0",
                              color: c.pasadas.length > 2 ? "#fff" : "#64748b",
                              zIndex: 1,
                            }}
                          >
                            {c.pasadas.length}
                          </span>
                        )}
                        {c.estado === "ausente" || c.estado === "vacaciones" ? (
                          <div style={{ fontSize: 10, fontWeight: 700, color: col.fg, textAlign: "center", padding: "10px 0" }}>
                            {c.estado === "ausente" ? "AUS" : "VAC"}
                          </div>
                        ) : (
                          <>
                            <input
                              type="time"
                              style={{ ...inputHora, color: c.estado === "tarde" ? "#92400e" : undefined, fontWeight: c.estado === "tarde" ? 700 : 400 }}
                              value={c.checkIn}
                              onChange={(e) => onUpdateAttendance(f.employeeId, c.date, "checkIn", e.target.value)}
                              {...focoCelda}
                            />
                            <input
                              type="time"
                              style={{ ...inputHora, marginTop: 2, color: c.estado === "sin_salida" ? "#991b1b" : undefined }}
                              value={c.checkOut}
                              onChange={(e) => onUpdateAttendance(f.employeeId, c.date, "checkOut", e.target.value)}
                              {...focoCelda}
                            />
                          </>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: "right", padding: "4px 6px", fontWeight: 700 }}>{f.totales.horas || "·"}</td>
                  <td style={{ textAlign: "right", padding: "4px 6px", color: f.totales.tardes ? "#92400e" : "#cbd5e1", fontWeight: 700 }}>
                    {f.totales.tardes || "·"}
                  </td>
                  <td style={{ textAlign: "right", padding: "4px 6px", color: f.totales.ausentes ? "#991b1b" : "#cbd5e1", fontWeight: 700 }}>
                    {f.totales.ausentes || "·"}
                  </td>
                  <td style={{ textAlign: "right", padding: "4px 6px", color: f.totales.sinSalida ? "#991b1b" : "#cbd5e1", fontWeight: 700 }}>
                    {f.totales.sinSalida || "·"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {menu && (
        <QuickMenu x={menu.x} y={menu.y} onClose={() => setMenu(null)}>
          <QuickMenuTitle>
            {menu.name} · {menu.celda.dia}
          </QuickMenuTitle>
          {menu.celda.pasadas.length > 0 && (
            <>
              <button
                style={{ ...quickMenuItem, fontWeight: 700 }}
                onClick={() => {
                  setDiaAbierto({ name: menu.name, celda: menu.celda });
                  setMenu(null);
                }}
              >
                Ver las {menu.celda.pasadas.length} pasada{menu.celda.pasadas.length === 1 ? "" : "s"} del día…
              </button>
              <QuickMenuSep />
            </>
          )}
          {ESTADOS_A_MANO.map((e) => (
            <button
              key={e.status}
              style={quickMenuItem}
              onClick={() => {
                onUpdateAttendance(menu.employeeId, menu.celda.date, "status", e.status);
                setMenu(null);
              }}
            >
              Marcar {e.label.toLowerCase()}
            </button>
          ))}
          <QuickMenuSep />
          <button
            style={quickMenuItem}
            onClick={() => {
              const n = window.prompt(`Nota del día (${menu.name}, ${menu.celda.dia}):`, menu.celda.notas);
              if (n !== null) onUpdateAttendance(menu.employeeId, menu.celda.date, "notes", n);
              setMenu(null);
            }}
          >
            Nota del día…
          </button>
          {(menu.celda.checkIn || menu.celda.checkOut) && (
            <button
              style={{ ...quickMenuItem, color: "#b91c1c" }}
              onClick={() => {
                onUpdateAttendance(menu.employeeId, menu.celda.date, "checkIn", "");
                onUpdateAttendance(menu.employeeId, menu.celda.date, "checkOut", "");
                setMenu(null);
              }}
            >
              Borrar entrada y salida
            </button>
          )}
        </QuickMenu>
      )}
      {diaAbierto && (
        <div
          onClick={() => setDiaAbierto(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(15,23,42,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 10, padding: 16, minWidth: 280, maxWidth: 380, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}
          >
            <div style={{ fontWeight: 800 }}>{diaAbierto.name}</div>
            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>
              {diaAbierto.celda.dia} · {diaAbierto.celda.pasadas.length} pasada{diaAbierto.celda.pasadas.length === 1 ? "" : "s"} por el reloj
            </div>
            <ol style={{ margin: 0, paddingLeft: 22, fontSize: 14, lineHeight: 1.8 }}>
              {diaAbierto.celda.pasadas.map((h, i, arr) => (
                <li key={`${h}-${i}`}>
                  <strong>{h}</strong>
                  <span style={{ color: "#64748b", fontSize: 12 }}>
                    {i === 0 ? " · entrada" : i === arr.length - 1 ? " · salida" : " · pasada intermedia"}
                  </span>
                </li>
              ))}
            </ol>
            {(diaAbierto.celda.checkIn !== diaAbierto.celda.pasadas[0] ||
              (diaAbierto.celda.pasadas.length > 1 &&
                diaAbierto.celda.checkOut !== diaAbierto.celda.pasadas[diaAbierto.celda.pasadas.length - 1])) && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#b45309" }}>
                La entrada/salida del día ({diaAbierto.celda.checkIn || "?"} - {diaAbierto.celda.checkOut || "?"}) se corrigió a mano
                y no coincide con la primera y la última pasada.
              </div>
            )}
            <div style={{ textAlign: "right", marginTop: 12 }}>
              <ButtonLike secondary onClick={() => setDiaAbierto(null)}>
                Cerrar
              </ButtonLike>
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}
