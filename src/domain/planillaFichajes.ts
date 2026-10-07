// PLANILLA DE FICHAJES (pedido de Nicolas, 2026-10-06): el horario de TODO el personal junto, para
// evaluarlo de un vistazo y exportarlo a Excel. No es un dato aparte: se lee de la asistencia de cada
// empleado (Employee.attendance) y lo que se corrige aca se escribe con el mismo handler que el
// Presentismo de la ficha (updateAttendanceRecord). Son la misma cosa vista de dos lados.
// Funciones puras y testeadas.
import { classifyFichada, computeMonthAttendance, dayHoursTotal, dayOfWeek } from "./attendance";
import type { AttendanceRecord } from "./types";

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export type EstadoFichaje =
  | "en_horario"
  | "tarde"
  | "sin_salida"
  | "revisar"
  | "ausente"
  | "vacaciones"
  | "no_laborable"
  | "sin_fichada";

export const ESTADO_FICHAJE_LABEL: Record<EstadoFichaje, string> = {
  en_horario: "En horario",
  tarde: "Tarde",
  sin_salida: "Sin salida",
  revisar: "Salida a revisar",
  ausente: "Ausente",
  vacaciones: "Vacaciones",
  no_laborable: "No laborable",
  sin_fichada: "Sin fichada",
};

export type CeldaFichaje = {
  date: string;
  dia: string; // "Lun 05"
  checkIn: string;
  checkOut: string;
  estado: EstadoFichaje;
  minutosTarde: number;
  detalle: string; // texto del semaforo (ej. "Tarde 07:42 (+12')", "Feriado: ...")
  horas: {
    normal: number;
    extra50: number;
    extra100: number;
    feriado: number;
    noct50: number;
    noct100: number;
    total: number;
  };
  bloqueado: boolean;
  notas: string;
  // Todas las pasadas del dia por el reloj (la entrada es la primera y la salida la ultima).
  pasadas: string[];
};

export type FilaFichajes = {
  employeeId: number;
  company: string;
  legajo: string;
  name: string;
  celdas: CeldaFichaje[];
  totales: { horas: number; tardes: number; ausentes: number; sinSalida: number; diasConFichada: number };
};

export function diasDelMes(month: string): string[] {
  const [y, m] = month.split("-").map(Number);
  if (!y || !m) return [];
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
}

function estadoDe(
  rec: AttendanceRecord | undefined,
  sem: { level: string; offKind?: string; lateMinutes: number; label: string } | undefined
): EstadoFichaje {
  const ficha = classifyFichada(rec?.checkIn, rec?.checkOut);
  if (rec?.status === "ausente_justificado" || rec?.status === "ausente_injustificado") return "ausente";
  if (rec?.status === "vacaciones" || sem?.offKind === "vacaciones") return "vacaciones";
  if (ficha === "sin_salida") return "sin_salida";
  if (ficha === "revisar") return "revisar";
  if (sem?.level === "yellow") return "tarde";
  if (sem?.level === "green") return "en_horario";
  if (sem?.level === "red") return "ausente";
  if (sem?.level === "off") return "no_laborable";
  return "sin_fichada";
}

/** Una fila por empleado con una celda por dia del mes. */
export function planillaDeFichajes(
  employees: Array<{ id: number; company: string; legajo: string; name: string; attendance: AttendanceRecord[] }>,
  month: string
): FilaFichajes[] {
  const dias = diasDelMes(month);
  return employees.map((e) => {
    const porDia = new Map((e.attendance || []).filter((a) => a?.date?.startsWith(`${month}-`)).map((a) => [a.date, a]));
    const semaforo = computeMonthAttendance(e.attendance || [], month);
    const celdas = dias.map<CeldaFichaje>((date) => {
      const rec = porDia.get(date);
      const sem = semaforo.get(date);
      const n = (v: unknown) => Math.round(Number(v || 0) * 100) / 100;
      const horas = {
        normal: n(rec?.normalHours),
        extra50: n(rec?.extra50Hours),
        extra100: n(rec?.extra100Hours),
        feriado: n(rec?.holidayHours),
        noct50: n(rec?.night50Hours),
        noct100: n(rec?.night100Hours),
        total: n(rec ? dayHoursTotal(rec) : 0),
      };
      return {
        date,
        dia: `${DIAS[dayOfWeek(date)]} ${date.slice(8, 10)}`,
        checkIn: rec?.checkIn || "",
        checkOut: rec?.checkOut || "",
        estado: estadoDe(rec, sem),
        minutosTarde: sem?.level === "yellow" ? sem.lateMinutes : 0,
        detalle: sem?.label || "",
        horas,
        bloqueado: !!rec?.locked,
        notas: rec?.notes || "",
        pasadas: Array.isArray(rec?.fichadas) ? rec!.fichadas! : [],
      };
    });
    return {
      employeeId: e.id,
      company: e.company,
      legajo: e.legajo,
      name: e.name,
      celdas,
      totales: {
        horas: Math.round(celdas.reduce((a, c) => a + c.horas.total, 0) * 100) / 100,
        tardes: celdas.filter((c) => c.estado === "tarde").length,
        ausentes: celdas.filter((c) => c.estado === "ausente").length,
        sinSalida: celdas.filter((c) => c.estado === "sin_salida" || c.estado === "revisar").length,
        diasConFichada: celdas.filter((c) => !!c.checkIn || !!c.checkOut).length,
      },
    };
  });
}

/**
 * Las dos hojas del Excel, como matrices (array de filas):
 *  - "Fichajes": una fila por persona y dia, con estado y horas (para filtrar y trabajar por fuera).
 *  - "Grilla": empleados x dias con "entrada - salida", igual que la pantalla.
 */
export function hojasExcelFichajes(
  filas: FilaFichajes[],
  companyShort: (company: string) => string
): { fichajes: Array<Array<string | number>>; grilla: Array<Array<string | number>> } {
  const fichajes: Array<Array<string | number>> = [
    ["Empresa", "Legajo", "Empleado", "Fecha", "Día", "Entrada", "Salida", "Estado", "Min. tarde", "Normales", "Extra 50%", "Extra 100%", "Feriado", "Noct. 50%", "Noct. 100%", "Total horas", "Editado a mano", "Pasadas", "Todas las pasadas", "Notas"],
  ];
  filas.forEach((f) =>
    f.celdas.forEach((c) =>
      fichajes.push([
        companyShort(f.company),
        f.legajo,
        f.name,
        `${c.date.slice(8, 10)}/${c.date.slice(5, 7)}/${c.date.slice(0, 4)}`,
        c.dia.slice(0, 3),
        c.checkIn,
        c.checkOut,
        ESTADO_FICHAJE_LABEL[c.estado],
        c.minutosTarde || "",
        c.horas.normal || "",
        c.horas.extra50 || "",
        c.horas.extra100 || "",
        c.horas.feriado || "",
        c.horas.noct50 || "",
        c.horas.noct100 || "",
        c.horas.total || "",
        c.bloqueado ? "sí" : "",
        c.pasadas.length || "",
        c.pasadas.join(" · "),
        c.notas,
      ])
    )
  );
  const dias = filas[0]?.celdas.map((c) => c.dia) || [];
  const grilla: Array<Array<string | number>> = [
    ["Empresa", "Empleado", ...dias, "Total horas", "Tardes", "Ausencias", "Sin salida"],
  ];
  filas.forEach((f) =>
    grilla.push([
      companyShort(f.company),
      f.name,
      ...f.celdas.map((c) =>
        c.checkIn || c.checkOut
          ? `${c.checkIn || "?"} - ${c.checkOut || "?"}`
          : c.estado === "ausente"
          ? "AUSENTE"
          : c.estado === "vacaciones"
          ? "VAC"
          : ""
      ),
      f.totales.horas,
      f.totales.tardes,
      f.totales.ausentes,
      f.totales.sinSalida,
    ])
  );
  return { fichajes, grilla };
}
