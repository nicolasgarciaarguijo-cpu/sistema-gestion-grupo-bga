import { parseScaleFromRawText, parseScaleFromLines, detectMonths } from "./scaleParse";

const aliases: Record<string, string> = {
  "OFICIAL MULTIPLE": "Oficial multiple",
  "OFICIAL ESPECIALIZADO": "Oficial especializado",
  "OFICIAL GENERAL": "Oficial general",
  "MEDIO OFICIAL": "Medio oficial",
  AYUDANTE: "Ayudante",
  "OPERARIO ACT. INDUSTRIAL": "Operario act. industrial",
};

// Texto crudo simulando el PDF real (CCT 335/75): glifos con espacios, separadores x-none, encabezado
// con los meses y dos categorias con su BASICO/S.N.R./V.H.T. por mes.
const rawText = `
x-none CA TEG ORIA x-none V .H.T. a l 31 /05 /2026
BASICO 79 59 ,06 BASICO 79 59 ,06 BASICO 82 61 ,50 BASICO 82 61 ,50
S. N.R. 1,90 % 151,22 S. N.R. 1,90 % 156,97
V. H.T. 81 10 ,28 V. H.T. 82 61 ,50 V. H.T. 84 18 ,47 V. H.T. 85 75 ,44
BASICO 71 91 ,02 BASICO 71 91 ,02 BASICO 74 64 ,28 BASICO 74 64 ,28
S. N.R. 1,90 % 136,63 S. N.R. 1,90 % 141,82
V. H.T. 73 27 ,65 V. H.T. 74 64 ,28 V. H.T. 76 06 ,10 V. H.T. 77 47 ,92
ACT UAL IZACION PARA MESES JUNIO , JULIO , AGOSTO Y SEPTIEMBRE 2026
OFI CIAL MULTIPLE OFI CIAL ESPECIALIZADO
`;

describe("detectMonths", () => {
  it("detecta los 4 meses del trimestre", () => {
    const flat = rawText.split("x-none").join(" ").toUpperCase().replace(/\s+/g, "");
    expect(detectMonths(flat)).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });
});

describe("parseScaleFromRawText", () => {
  const result = parseScaleFromRawText(rawText, aliases);

  it("genera una fila por categoria y mes (2 x 4 = 8)", () => {
    expect(result.rows).toHaveLength(8);
    expect(result.months).toEqual(["2026-06", "2026-07", "2026-08", "2026-09"]);
  });

  it("Oficial multiple: V.H.T. correctos por mes", () => {
    const om = result.rows.filter((r) => r.category === "Oficial multiple");
    expect(om.map((r) => r.vht)).toEqual([8110.28, 8261.5, 8418.47, 8575.44]);
  });

  it("basico del mes = V.H.T. del mes anterior (o referencia el primer mes)", () => {
    const om = result.rows.filter((r) => r.category === "Oficial multiple");
    expect(om[0].baseHourly).toBe(7959.06); // referencia al 31/05
    expect(om[1].baseHourly).toBe(8110.28); // = V.H.T. de junio
    expect(om[0].nonRemHourly).toBe(151.22); // 8110,28 - 7959,06
  });

  it("Oficial especializado tambien se mapea y ordena bien", () => {
    const oe = result.rows.filter((r) => r.category === "Oficial especializado");
    expect(oe.map((r) => r.vht)).toEqual([7327.65, 7464.28, 7606.1, 7747.92]);
  });
});

describe("parseScaleFromLines (escala por renglones, pdf.js)", () => {
  // Los renglones reales de "USIMRA 2026-10 a 2027-01 Escala.pdf" como los arma lib/pdfLineas.
  const lineas = [
    "ACTUALIZACION PARA MESES OCTUBRE, NOVIEMBRE, DICIEMBRE Y ENERO",
    "V.H.T.  OCTUBRE  NOVIEMBRE  DICIEMBRE  ENERO",
    "CATEGORIA  al  2026  2026  2026  2027",
    "30/09/2026",
    "1,80%  1,80%  1,80%  1,80%",
    "1-OFICIAL MULTIPLE  8575,44  BASICO  8729,80  BASICO  8884,16  BASICO  9044,07  BASICO  9203,99",
    "2-OFICIAL",
    "7747,92  BASICO  7887,38  BASICO  8026,85  BASICO  8171,33  BASICO  8315,81",
    "ESPECIALIZADO",
    "3-OFICIAL GENERAL  7204,22  BASICO  7333,90  BASICO  7463,57  BASICO  7597,92  BASICO  7732,26",
    "4-MEDIO OFICIAL  6584,48  BASICO  6703,00  BASICO  6821,52  BASICO  6944,31  BASICO  7067,10",
    "5-AYUDANTE  6332,49  BASICO  6446,47  BASICO  6560,46  BASICO  6678,55  BASICO  6796,64",
    "6-OPERARIO ACT.",
    "6245,21  BASICO  6357,62  BASICO  6470,04  BASICO  6586,50  BASICO  6702,96",
    "INDUSTRIAL",
    "ANTIGÜEDAD: 1% por año de antigüedad.",
  ];
  const conOperario = { ...aliases, "OPERARIO ACT INDUSTRIAL": "Operario act. industrial" };

  it("lee las 6 categorias x 4 meses, con el anio que cruza a enero", () => {
    const r = parseScaleFromLines(lineas, conOperario);
    expect(r.months).toEqual(["2026-10", "2026-11", "2026-12", "2027-01"]);
    expect(r.categories).toEqual([
      "Oficial multiple",
      "Oficial especializado",
      "Oficial general",
      "Medio oficial",
      "Ayudante",
      "Operario act. industrial",
    ]);
    expect(r.rows).toHaveLength(24);
  });

  it("cada mes es todo BASICO (sin no remunerativo) y no confunde el V.H.T. del cierre anterior", () => {
    const r = parseScaleFromLines(lineas, conOperario);
    const fila = (c: string, m: string) => r.rows.find((x) => x.category === c && x.month === m);
    expect(fila("Oficial multiple", "2026-10")).toEqual({ month: "2026-10", category: "Oficial multiple", baseHourly: 8729.8, nonRemHourly: 0, vht: 8729.8 });
    expect(fila("Oficial especializado", "2027-01")?.vht).toBe(8315.81);
    expect(fila("Ayudante", "2026-10")?.vht).toBe(6446.47);
    expect(fila("Operario act. industrial", "2026-12")?.vht).toBe(6586.5);
  });

  it("sin tabla reconocible no inventa filas", () => {
    expect(parseScaleFromLines(["hola", "OCTUBRE NOVIEMBRE", "2026 2026"], aliases).rows).toEqual([]);
  });
});
