// LECTOR DEL COMPROBANTE DE PAGO (Nicolas, 21/11/2026), para las secciones IVA y Sindicato:
//   "un lector de PDF para cargar el VEP de pago o la factura del sindicato; de ahi va a tomar el pago. O lo
//    cargamos a mano o con el lector. Despues siempre la edicion manual gana. Pero tambien nos sirve para
//    comprobar que no estamos cargando algo mal."
//
// Recibe las LINEAS del PDF (lib/pdfLineas) y devuelve lo que pudo leer. No carga nada: propone, y la ficha se
// abre con eso para revisar. Lo que reconoce, armado con comprobantes reales de De Raiz:
//   - VEP de ARCA (volante electronico de pago): numero, CUIT, periodo, importe.
//   - Transferencia del banco (Patagonia: "Importe a Transferir", "Fecha y Hora").
//   - ECHEQ ("Importe", "Fecha de pago").
//   - Planilla de la cuota sindical (legajo / remuneracion / cuota sindical / TOTAL): ademas del total, de ahi
//     sale el PORCENTAJE que cobra el sindicato (cuota / remuneracion).
// OJO: la boleta de USIMRA viene con una fuente que no se puede leer como texto (sale basura): `textoLegible`
// lo detecta para mandarla al OCR o cargarla a mano.

export type TipoComprobante = "vep" | "transferencia" | "echeq" | "planilla_sindicato" | "desconocido";

export type ComprobanteLeido = {
  tipo: TipoComprobante;
  legible: boolean;
  total: number;
  fecha: string; // yyyy-mm-dd, la del pago si figura
  periodo: string; // yyyy-mm que paga, si figura (en el PDF o en el nombre del archivo)
  cuit: string; // el del comprobante (el del beneficiario si hay uno)
  numero: string; // nro. de VEP / de operacion / de ECHEQ
  beneficiario: string;
  // Solo la planilla del sindicato: cuota / remuneracion de los renglones, en %.
  porcentaje: number;
  avisos: string[];
};

const sinAcentos = (s: string) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const norm = (s: string) => sinAcentos(s).toLowerCase();

const PALABRAS = /\b(importe|total|fecha|cuit|pago|periodo|cuota|remuneracion|transferencia|banco|vep|volante|operacion|concepto|titular|beneficiario|cuenta|vencimiento|impuesto|legajo|sindical)\b/g;

/** El texto es de verdad (y no los codigos de una fuente que no se puede leer). */
export function textoLegible(texto: string): boolean {
  const n = norm(texto);
  if (n.replace(/\s/g, "").length < 20) return false;
  return new Set(n.match(PALABRAS) || []).size >= 2;
}

const IMPORTE = /\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}/g;
const aNumero = (raw: string): number => {
  const s = raw.replace(/[^\d.,]/g, "");
  if (s.lastIndexOf(",") > s.lastIndexOf(".")) return Number(s.replace(/\./g, "").replace(",", "."));
  return Number(s.replace(/,/g, ""));
};
const importesDe = (linea: string): number[] => (linea.match(IMPORTE) || []).map(aNumero).filter((n) => n > 0);

const pad = (n: number | string) => String(n).padStart(2, "0");
// Una fecha en la linea: dd/mm/aaaa (o con - o .) o aaaa-mm-dd.
function fechaDe(linea: string): string {
  const iso = linea.match(/\b(20\d{2})-(\d{2})-(\d{2})\b/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const m = linea.match(/\b(\d{1,2})[/.-](\d{1,2})[/.-](20\d{2})\b/);
  if (m && Number(m[2]) >= 1 && Number(m[2]) <= 12 && Number(m[1]) >= 1 && Number(m[1]) <= 31) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  return "";
}
// Un periodo aaaa-mm en un texto: "2026-08", "202608", "08/2026", "12.2024", "12,2024".
export function periodoDe(texto: string): string {
  const t = String(texto || "");
  const a = t.match(/\b(20\d{2})[-/ ]?(0[1-9]|1[0-2])\b/);
  if (a) return `${a[1]}-${a[2]}`;
  const b = t.match(/\b(0?[1-9]|1[0-2])[-/.,](20\d{2})\b/);
  if (b) return `${b[2]}-${pad(b[1])}`;
  return "";
}
const cuitDe = (linea: string): string => {
  const m = linea.match(/\b(\d{2})-?(\d{8})-?(\d)\b/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : "";
};
// Lo que sigue a la etiqueta en la misma linea.
const valorDe = (linea: string, etiqueta: RegExp): string => {
  const m = norm(linea).match(etiqueta);
  if (!m || m.index == null) return "";
  return linea.slice(m.index + m[0].length).replace(/^[\s:.\-]+/, "").trim();
};

const vacio = (): ComprobanteLeido => ({ tipo: "desconocido", legible: false, total: 0, fecha: "", periodo: "", cuit: "", numero: "", beneficiario: "", porcentaje: 0, avisos: [] });

export function leerComprobante(lineas: string[], nombreArchivo = ""): ComprobanteLeido {
  const out = vacio();
  const texto = lineas.join("\n");
  out.legible = textoLegible(texto);
  // El periodo del nombre del archivo vale aunque el PDF no se pueda leer ("2024-12 Usimra CABA.pdf").
  const periodoDelNombre = periodoDe(nombreArchivo.replace(/\.pdf$/i, ""));
  if (!out.legible) {
    out.periodo = periodoDelNombre;
    out.avisos.push("El PDF no trae texto que se pueda leer (pasa con la boleta de USIMRA): completá el importe a mano.");
    return out;
  }
  const n = norm(texto);
  const filas = lineas.map((l) => ({ l, n: norm(l) }));

  // ---- de que es ----
  const esPlanilla = /cuota sindical/.test(n) && /remuneracion/.test(n);
  out.tipo = esPlanilla
    ? "planilla_sindicato"
    : /\bvep\b|volante electronico/.test(n)
    ? "vep"
    : /\becheq\b/.test(n)
    ? "echeq"
    : /transferencia/.test(n)
    ? "transferencia"
    : "desconocido";

  // ---- importe: la etiqueta mas especifica gana; nunca "el numero mas grande" ----
  const ETIQUETAS: RegExp[] = [
    /importe total a pagar/,
    /total a pagar/,
    /importe a transferir/,
    /importe pagado/,
    /importe total/,
    /\bimporte\b/,
    /\btotal\b/,
  ];
  for (const et of ETIQUETAS) {
    const fila = filas.find((f) => et.test(f.n) && !/subtotal/.test(f.n) && importesDe(f.l).length > 0);
    if (fila) {
      const imps = importesDe(fila.l);
      out.total = imps[imps.length - 1];
      break;
    }
  }

  // ---- la planilla del sindicato: el porcentaje sale de sus renglones (cuota / remuneracion) ----
  if (esPlanilla) {
    const pcts = filas
      .map((f) => importesDe(f.l))
      .filter((imps) => imps.length >= 2 && imps[imps.length - 2] > imps[imps.length - 1])
      .map((imps) => (imps[imps.length - 1] / imps[imps.length - 2]) * 100);
    if (pcts.length) {
      const medio = pcts.slice().sort((a, b) => a - b)[Math.floor(pcts.length / 2)];
      out.porcentaje = Math.round(medio * 100) / 100;
    }
  }

  // ---- fecha: la del pago antes que cualquier otra ----
  const FECHAS: RegExp[] = [/fecha de pago/, /fecha y hora/, /fecha de la operacion/, /fecha de generacion|fecha generacion/, /\bfecha\b/];
  for (const et of FECHAS) {
    const fila = filas.find((f) => et.test(f.n) && !!fechaDe(f.l));
    if (fila) {
      out.fecha = fechaDe(fila.l);
      break;
    }
  }

  // ---- periodo: el que dice el PDF; si no, el del nombre del archivo ----
  const filaPeriodo = filas.find((f) => /periodo/.test(f.n) && !!periodoDe(valorDe(f.l, /periodo( fiscal)?/)));
  out.periodo = (filaPeriodo ? periodoDe(valorDe(filaPeriodo.l, /periodo( fiscal)?/)) : "") || periodoDelNombre;

  // ---- numero ----
  const filaNumero =
    filas.find((f) => /(nro|numero|n°|nº)\.?\s*(de\s*)?vep/.test(f.n)) ||
    filas.find((f) => /echeq nro/.test(f.n)) ||
    filas.find((f) => /operacion (nro|numero)/.test(f.n));
  if (filaNumero) out.numero = (filaNumero.l.match(/\d[\d.\-]{3,}/g) || []).pop() || "";

  // ---- a quien: el beneficiario (o el segundo titular de una transferencia: el primero es el que paga) ----
  const filaBenef = filas.find((f) => /^\s*beneficiario\b/.test(f.n));
  const titulares = filas.filter((f) => /^\s*titular\b/.test(f.n));
  out.beneficiario = filaBenef ? valorDe(filaBenef.l, /beneficiario/) : titulares.length > 1 ? valorDe(titulares[1].l, /titular/) : "";
  const filaCuitBenef = filas.find((f) => /documento beneficiario|cuit\/cuil\/cdi/.test(f.n) && !!cuitDe(f.l));
  const filaCuit = filaCuitBenef || filas.find((f) => /\bcuit\b/.test(f.n) && !!cuitDe(f.l));
  out.cuit = filaCuit ? cuitDe(filaCuit.l) : "";

  if (!(out.total > 0)) out.avisos.push("No encontré el importe en el PDF: completalo a mano.");
  if (!out.periodo) out.avisos.push("El PDF no dice qué período paga: queda el mes de la ficha.");
  return out;
}

// EL CONTROL: el lector tambien sirve para comprobar que lo cargado esta bien.
export type ControlLectura = { coincide: boolean; texto: string };
export function controlarContraCargado(leido: Pick<ComprobanteLeido, "total">, cargado: number, money: (n: number) => string): ControlLectura | null {
  if (!(leido.total > 0)) return null;
  const dif = Math.round((leido.total - Number(cargado || 0)) * 100) / 100;
  if (Math.abs(dif) <= 1) return { coincide: true, texto: `El PDF dice ${money(leido.total)}: coincide con lo cargado.` };
  return { coincide: false, texto: `El PDF dice ${money(leido.total)} y lo cargado es ${money(cargado)}: hay ${money(Math.abs(dif))} de diferencia. Lo cargado no se cambió: revisalo en la ficha.` };
}
