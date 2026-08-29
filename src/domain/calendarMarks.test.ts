import { setCalendarMark, setCalendarNote, markHex, markLabel, CalendarMark } from "./calendarMarks";

const base = { key: "egresos|alquiler|2026-08-29", date: "2026-08-29", label: "Alquiler", createdBy: "Nico", createdAt: "2026-08-29T10:00:00Z", id: 1 };

describe("setCalendarMark", () => {
  it("pone un color en una celda que no tenia", () => {
    const r = setCalendarMark([], { ...base, color: "naranja" });
    expect(r).toHaveLength(1);
    expect(r[0].color).toBe("naranja");
  });

  it("el mismo color dos veces lo saca", () => {
    const uno = setCalendarMark([], { ...base, color: "naranja" });
    expect(setCalendarMark(uno, { ...base, color: "naranja", id: 2 })).toEqual([]);
  });

  it("otro color reemplaza y no deja dos marcadores en la misma celda", () => {
    const uno = setCalendarMark([], { ...base, color: "naranja" });
    const dos = setCalendarMark(uno, { ...base, color: "magenta", id: 2 });
    expect(dos).toHaveLength(1);
    expect(dos[0].color).toBe("magenta");
  });

  it("color vacio saca el marcador", () => {
    const uno = setCalendarMark([], { ...base, color: "magenta" });
    expect(setCalendarMark(uno, { ...base, color: "", id: 2 })).toEqual([]);
  });

  it("no toca las otras celdas", () => {
    const otra: CalendarMark = { ...base, id: 9, key: "egresos|sueldos|2026-08-29", color: "naranja" };
    const r = setCalendarMark([otra], { ...base, color: "magenta", id: 2 });
    expect(r).toHaveLength(2);
    expect(r.find((m) => m.key === otra.key)?.color).toBe("naranja");
  });

  it("un color que no existe en la leyenda no se guarda", () => {
    expect(setCalendarMark([], { ...base, color: "fucsia" })).toEqual([]);
  });

  it("la leyenda y el color van siempre juntos", () => {
    expect(markHex("naranja")).toBe("#ea580c");
    expect(markLabel("magenta")).toBe("Pago estimado");
    expect(markHex("fucsia")).toBeUndefined();
  });
});


describe("setCalendarNote", () => {
  const b = { key: "egresos|alquiler|2026-08-29", date: "2026-08-29", label: "Alquiler", createdBy: "Nico", createdAt: "x", id: 1 };

  it("escribe una nota en una celda", () => {
    const r = setCalendarNote([], { ...b, text: "  lo pagó Gustavo  " });
    expect(r).toHaveLength(1);
    expect(r[0].text).toBe("lo pagó Gustavo");
  });

  it("volver a escribir reemplaza, no acumula", () => {
    const uno = setCalendarNote([], { ...b, text: "primera" });
    const dos = setCalendarNote(uno, { ...b, text: "segunda", id: 2 });
    expect(dos).toHaveLength(1);
    expect(dos[0].text).toBe("segunda");
  });

  it("texto vacío borra la nota", () => {
    const uno = setCalendarNote([], { ...b, text: "algo" });
    expect(setCalendarNote(uno, { ...b, text: "   ", id: 2 })).toEqual([]);
  });

  it("no toca las notas de otras celdas", () => {
    const otra = setCalendarNote([], { ...b, key: "egresos|sueldos|2026-08-29", text: "otra" });
    const r = setCalendarNote(otra, { ...b, text: "esta", id: 2 });
    expect(r).toHaveLength(2);
  });
});
