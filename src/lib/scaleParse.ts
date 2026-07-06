// Parser puro de escala salarial (CCT 335/75 madereros y similares) a partir del texto crudo extraido
// del PDF (los strings de los operadores de texto, unidos por espacio). El PDF trae los glifos partidos
// ("79 59 ,06" = 7959,06) y separadores "x-none"; aca se limpia y se estructura. Testeable sin navegador.

export type ParsedScaleRow = {
  month: string; // "YYYY-MM"
  category: string; // nombre del sistema (via aliases)
  baseHourly: number;
  nonRemHourly: number;
  vht: number;
};

export type ScaleParseResult = {
  rows: ParsedScaleRow[];
  months: string[];
  categories: string[];
  warnings: string[];
};

const MONTH_MAP: Record<string, string> = {
  ENERO: "01",
  FEBRERO: "02",
  MARZO: "03",
  ABRIL: "04",
  MAYO: "05",
  JUNIO: "06",
  JULIO: "07",
  AGOSTO: "08",
  SEPTIEMBRE: "09",
  OCTUBRE: "10",
  NOVIEMBRE: "11",
  DICIEMBRE: "12",
};

const parseNum = (s: string): number => Number(s.replace(/\./g, "").replace(",", "."));
const round2 = (n: number): number => Number(n.toFixed(2));

// Quita acentos y pasa a mayusculas, para comparar nombres de categoria de forma tolerante.
const deaccentUpper = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

// Texto "aplanado": sin espacios ni acentos, en mayusculas. Reúne los glifos partidos del PDF.
const flatten = (raw: string): string => deaccentUpper(raw.split("x-none").join(" ")).replace(/\s+/g, "");

// Detecta los meses de vigencia. Busca "MESES <lista> <anio>"; si no, junta los meses que aparezcan
// junto a un anio. Si el trimestre cruza de anio (mes que baja), incrementa el anio.
export function detectMonths(flat: string): string[] {
  const monthNames = Object.keys(MONTH_MAP);
  const seg = (() => {
    const m = flat.match(/MESES([A-Z,Y]+?)(20\d{2})/);
    if (m) return { text: m[1], year: Number(m[2]) };
    const m2 = flat.match(/ACUERDO([A-Z]+?)(20\d{2})/);
    if (m2) return { text: m2[1], year: Number(m2[2]) };
    return null;
  })();
  if (!seg) return [];
  const ordered = monthNames
    .map((name) => ({ name, i: seg.text.indexOf(name) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i);
  let year = seg.year;
  let prevMonth = 0;
  return ordered.map((x) => {
    const mm = Number(MONTH_MAP[x.name]);
    if (prevMonth && mm < prevMonth) year += 1; // cruza de anio
    prevMonth = mm;
    return `${year}-${MONTH_MAP[x.name]}`;
  });
}

// Parsea el texto crudo del PDF a filas de escala. `aliases` mapea el nombre de categoria del PDF
// (como aparece, con espacios) al nombre del sistema. Devuelve una fila por (categoria, mes).
export function parseScaleFromRawText(
  raw: string,
  aliases: Record<string, string>
): ScaleParseResult {
  const warnings: string[] = [];
  const flat = flatten(raw);

  const months = detectMonths(flat);
  if (months.length === 0) {
    return { rows: [], months: [], categories: [], warnings: ["No detecte meses de vigencia."] };
  }

  // Valores de V.H.T. y BASICO en orden de aparicion (uno por celda mes/categoria).
  const vht = Array.from(flat.matchAll(/V\.?H\.?T\.?(\d{3,6},\d{2})/g)).map((m) => parseNum(m[1]));
  const basico = Array.from(flat.matchAll(/BASICO(\d{3,6},\d{2})/g)).map((m) => parseNum(m[1]));

  // Categorias presentes, en orden de aparicion (posicion en el texto aplanado).
  const orderedCategories = Object.keys(aliases)
    .map((pdfName) => ({ pdfName, i: flat.indexOf(deaccentUpper(pdfName).replace(/\s+/g, "")) }))
    .filter((x) => x.i >= 0)
    .sort((a, b) => a.i - b.i)
    // dedup por nombre del sistema (varias claves pueden mapear al mismo)
    .filter((x, idx, arr) => arr.findIndex((y) => aliases[y.pdfName] === aliases[x.pdfName]) === idx)
    .map((x) => aliases[x.pdfName]);

  const catCount = orderedCategories.length;
  const monthCount = months.length;

  if (catCount === 0 || vht.length < catCount * monthCount) {
    warnings.push(
      `Estructura inesperada: ${catCount} categorias, ${months.length} meses, ${vht.length} valores V.H.T.`
    );
    return { rows: [], months, categories: orderedCategories, warnings };
  }

  const rows: ParsedScaleRow[] = [];
  for (let c = 0; c < catCount; c++) {
    const vhtGroup = vht.slice(c * monthCount, c * monthCount + monthCount);
    const basicoGroup = basico.slice(c * monthCount, c * monthCount + monthCount);
    const firstBasico = basicoGroup[0] ?? vhtGroup[0];
    for (let m = 0; m < monthCount; m++) {
      // Basico del mes = basico de referencia (primer mes) o V.H.T. del mes anterior (suma que se
      // incorpora). No remunerativo = V.H.T. - basico.
      const baseHourly = m === 0 ? firstBasico : vhtGroup[m - 1];
      const vhtValue = vhtGroup[m];
      rows.push({
        month: months[m],
        category: orderedCategories[c],
        baseHourly: round2(baseHourly),
        nonRemHourly: round2(Math.max(0, vhtValue - baseHourly)),
        vht: round2(vhtValue),
      });
    }
  }

  return { rows, months, categories: orderedCategories, warnings };
}
