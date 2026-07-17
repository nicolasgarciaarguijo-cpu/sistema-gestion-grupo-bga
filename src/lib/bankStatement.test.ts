import {
  detectColumns,
  detectSeparator,
  normalizeHeader,
  parseDelimitedStatement,
  parsePdfStatementText,
  parseStatementDate,
  rowsToStatementEntries,
  splitDelimitedLine,
  suggestGroupForConcept,
} from "./bankStatement";

describe("normalizeHeader", () => {
  it("saca acentos y pasa a minusculas", () => {
    expect(normalizeHeader("  Débito  ")).toBe("debito");
    expect(normalizeHeader("DESCRIPCIÓN")).toBe("descripcion");
    expect(normalizeHeader("Crédito")).toBe("credito");
  });
});

describe("parseStatementDate", () => {
  it("acepta dd/mm/aaaa", () => {
    expect(parseStatementDate("05/11/2025")).toBe("2025-11-05");
  });

  it("acepta dd-mm-aa", () => {
    expect(parseStatementDate("05-11-25")).toBe("2025-11-05");
  });

  it("acepta ISO tal cual", () => {
    expect(parseStatementDate("2025-11-05")).toBe("2025-11-05");
  });

  it("rechaza fechas invalidas o vacias", () => {
    expect(parseStatementDate("")).toBe("");
    expect(parseStatementDate("35/13/2025")).toBe("");
    expect(parseStatementDate("saldo anterior")).toBe("");
  });
});

describe("splitDelimitedLine", () => {
  it("respeta comillas con el separador adentro", () => {
    expect(splitDelimitedLine('05/11/2025;"PAGO, ALQUILER";1.000,00', ";")).toEqual([
      "05/11/2025",
      "PAGO, ALQUILER",
      "1.000,00",
    ]);
  });

  it("maneja comillas escapadas", () => {
    expect(splitDelimitedLine('a;"di""jo";b', ";")).toEqual(["a", 'di"jo', "b"]);
  });
});

describe("detectSeparator", () => {
  it("detecta punto y coma, tab y coma", () => {
    expect(detectSeparator("a;b;c")).toBe(";");
    expect(detectSeparator("a\tb\tc")).toBe("\t");
    expect(detectSeparator("a,b,c")).toBe(",");
  });
});

describe("detectColumns", () => {
  it("encuentra el encabezado aunque haya filas de titulo arriba", () => {
    const rows = [
      ["BANCO EJEMPLO"],
      ["Extracto de cuenta"],
      ["Fecha", "Concepto", "Debito", "Credito", "Saldo"],
      ["05/11/2025", "ALQUILER", "1.000,00", "", "5.000,00"],
    ];
    const detected = detectColumns(rows);
    expect(detected?.headerIndex).toBe(2);
    expect(detected?.columns.date).toBe(0);
    expect(detected?.columns.concept).toBe(1);
    expect(detected?.columns.debit).toBe(2);
    expect(detected?.columns.credit).toBe(3);
    expect(detected?.columns.balance).toBe(4);
  });

  it("devuelve null si no hay fecha o concepto", () => {
    expect(detectColumns([["Cosa", "Otra"], ["1", "2"]])).toBeNull();
  });
});

describe("rowsToStatementEntries", () => {
  it("lee columnas separadas de debito y credito", () => {
    const rows = [
      ["Fecha", "Concepto", "Debito", "Credito", "Saldo"],
      ["05/11/2025", "ALQUILER NOV", "1.000,00", "", "4.000,00"],
      ["06/11/2025", "COBRO CLIENTE", "", "2.500,50", "6.500,50"],
    ];
    const entries = rowsToStatementEntries(rows);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: "2025-11-05",
      concept: "ALQUILER NOV",
      amount: 1000,
      movementType: "debito",
      balance: 4000,
    });
    expect(entries[1]).toMatchObject({
      date: "2025-11-06",
      amount: 2500.5,
      movementType: "credito",
    });
  });

  it("lee columna unica con signo: negativo = debito", () => {
    const rows = [
      ["Fecha", "Descripcion", "Importe"],
      ["05/11/2025", "LUZ", "-1.200,00"],
      ["06/11/2025", "DEPOSITO", "3.000,00"],
    ];
    const entries = rowsToStatementEntries(rows);
    expect(entries[0]).toMatchObject({ amount: 1200, movementType: "debito" });
    expect(entries[1]).toMatchObject({ amount: 3000, movementType: "credito" });
  });

  it("descarta filas sin fecha valida (saldos, totales, basura)", () => {
    const rows = [
      ["Fecha", "Concepto", "Importe"],
      ["Saldo anterior", "", "1.000,00"],
      ["05/11/2025", "ALQUILER", "-500,00"],
      ["", "", ""],
    ];
    expect(rowsToStatementEntries(rows)).toHaveLength(1);
  });

  it("devuelve vacio si no reconoce el encabezado", () => {
    expect(rowsToStatementEntries([["a", "b"], ["1", "2"]])).toEqual([]);
  });
});

describe("parseDelimitedStatement + rowsToStatementEntries", () => {
  it("procesa un CSV completo de punta a punta", () => {
    const csv = [
      "Fecha;Concepto;Debito;Credito;Saldo",
      "05/11/2025;ALQUILER GALPON;1.000,00;;4.000,00",
      "07/11/2025;TRANSFERENCIA RECIBIDA;;2.000,00;6.000,00",
    ].join("\n");
    const entries = rowsToStatementEntries(parseDelimitedStatement(csv));
    expect(entries).toHaveLength(2);
    expect(entries[0].concept).toBe("ALQUILER GALPON");
    expect(entries[0].movementType).toBe("debito");
    expect(entries[1].movementType).toBe("credito");
  });
});

describe("parsePdfStatementText", () => {
  it("saca movimientos de lineas fecha + concepto + importes", () => {
    const text = [
      "BANCO EJEMPLO - EXTRACTO",
      "05/11/2025 ALQUILER GALPON -1.000,00 4.000,00",
      "texto suelto que no es un movimiento",
      "07/11/2025 DEPOSITO 2.000,00 6.000,00",
    ].join("\n");
    const entries = parsePdfStatementText(text);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: "2025-11-05",
      amount: 1000,
      movementType: "debito",
      balance: 4000,
    });
    expect(entries[0].concept).toBe("ALQUILER GALPON");
    expect(entries[1]).toMatchObject({ date: "2025-11-07", movementType: "credito" });
  });

  it("no explota con texto sin movimientos", () => {
    expect(parsePdfStatementText("hola\nmundo")).toEqual([]);
  });
});

describe("suggestGroupForConcept", () => {
  const available = ["Administrativos", "Comerciales", "Financieros", "Edilicios", "Operativos"];

  it("sugiere por palabra clave, ignorando acentos y mayusculas", () => {
    expect(suggestGroupForConcept("PAGO ALQUILER GALPON", available)).toBe("Edilicios");
    expect(suggestGroupForConcept("EDENOR FACT 123", available)).toBe("Edilicios");
    expect(suggestGroupForConcept("COMISIÓN MANTENIMIENTO", available)).toBe("Financieros");
    expect(suggestGroupForConcept("YPF COMBUSTIBLE", available)).toBe("Operativos");
  });

  it("devuelve vacio si no reconoce nada (lo decide el usuario)", () => {
    expect(suggestGroupForConcept("XYZ 123", available)).toBe("");
  });

  it("no sugiere un grupo que no existe en el sistema", () => {
    expect(suggestGroupForConcept("PAGO ALQUILER", ["Administrativos"])).toBe("");
  });
});
