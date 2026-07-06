import { parseScaleFromRawText, detectMonths } from "./scaleParse";

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
