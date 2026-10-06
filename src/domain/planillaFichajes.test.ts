import { diasDelMes, hojasExcelFichajes, planillaDeFichajes } from "./planillaFichajes";
import type { AttendanceRecord } from "./types";

const rec = (date: string, over: Partial<AttendanceRecord> = {}): AttendanceRecord => ({
  date,
  status: "presente",
  normalHours: 0,
  extra50Hours: 0,
  extra100Hours: 0,
  attachmentName: "",
  notes: "",
  ...over,
});

// Octubre 2026: el 5 es lunes, el 10 sabado, el 12 feriado (Diversidad Cultural).
const emp = {
  id: 1,
  company: "De raiz s.r.l",
  legajo: "6",
  name: "ADALBERTO SORIA",
  attendance: [
    rec("2026-10-05", { checkIn: "07:28", checkOut: "17:05", normalHours: 9 }),
    rec("2026-10-06", { checkIn: "07:42", checkOut: "17:00", normalHours: 8.8 }),
    rec("2026-10-07", { checkIn: "07:20" }),
    rec("2026-10-08", { status: "ausente_injustificado" }),
    rec("2026-10-09", { checkIn: "07:33", checkOut: "17:00", normalHours: 9, locked: true, notes: "corregido" }),
  ],
};

describe("planillaDeFichajes", () => {
  const [fila] = planillaDeFichajes([emp], "2026-10");
  const dia = (d: string) => fila.celdas.find((c) => c.date === `2026-10-${d}`)!;

  it("una celda por dia del mes", () => {
    expect(diasDelMes("2026-10")).toHaveLength(31);
    expect(fila.celdas).toHaveLength(31);
    expect(dia("05").dia).toBe("Lun 05");
  });
  it("estado de cada dia con la misma regla del semaforo", () => {
    expect(dia("05").estado).toBe("en_horario");
    expect(dia("06").estado).toBe("tarde");
    expect(dia("06").minutosTarde).toBe(12);
    expect(dia("07").estado).toBe("sin_salida");
    expect(dia("08").estado).toBe("ausente");
    expect(dia("09").estado).toBe("en_horario"); // 07:33: dentro del margen de 5 minutos
    expect(dia("10").estado).toBe("no_laborable"); // sabado sin fichada
  });
  it("totales del mes", () => {
    expect(fila.totales).toEqual({ horas: 26.8, tardes: 1, ausentes: 1, sinSalida: 1, diasConFichada: 4 });
  });
  it("marca lo editado a mano (candado) y trae las notas", () => {
    expect(dia("09").bloqueado).toBe(true);
    expect(dia("09").notas).toBe("corregido");
  });
});

describe("hojasExcelFichajes", () => {
  const filas = planillaDeFichajes([emp], "2026-10");
  const { fichajes, grilla } = hojasExcelFichajes(filas, () => "De Raíz");
  it("hoja Fichajes: encabezado + una fila por persona y dia", () => {
    expect(fichajes[0][0]).toBe("Empresa");
    expect(fichajes).toHaveLength(1 + 31);
    const lunes = fichajes.find((r) => r[3] === "05/10/2026")!;
    expect(lunes.slice(0, 8)).toEqual(["De Raíz", "6", "ADALBERTO SORIA", "05/10/2026", "Lun", "07:28", "17:05", "En horario"]);
  });
  it("hoja Grilla: empleados x dias con entrada - salida y los totales", () => {
    expect(grilla[0].slice(0, 3)).toEqual(["Empresa", "Empleado", "Jue 01"]);
    const fila = grilla[1];
    expect(fila[2 + 4]).toBe("07:28 - 17:05"); // dia 5
    expect(fila[2 + 6]).toBe("07:20 - ?"); // dia 7, sin salida
    expect(fila[2 + 7]).toBe("AUSENTE"); // dia 8
    expect(fila.slice(-4)).toEqual([26.8, 1, 1, 1]);
  });
});
