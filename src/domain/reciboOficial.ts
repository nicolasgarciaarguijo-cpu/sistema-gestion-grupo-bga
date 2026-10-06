// RECIBO OFICIAL: lo que el sistema lee del recibo de sueldo que hace el estudio contable (PDF), para
// asentar el gasto REAL en blanco de cada empleado (pedido de Nicolas, 2026-10-06).
//
// Trabaja sobre el texto crudo que saca lib/pdfExtract (los strings de los operadores de texto del PDF,
// unidos por espacio). Formato verificado con los recibos de Napsis de De Raiz:
//   "Legajo 00001 ... Garcia Arguijo Gustavo C.U.I.L. 23-12548695-9 ... Período: Mensual 01/2023 ...
//    Lugar y Fecha de Pago: Vicente Lopez, 06/02/2023   50.000,00   50.000,00 Son Pesos: Cincuenta mil..."
// El NETO es el ultimo importe antes de "Son Pesos" (el monto que despues se escribe en letras). El
// recibo sale por duplicado (original y copia) y un PDF puede traer a varios empleados: se parte en
// bloques por "Legajo" y se elige el del empleado por CUIL (o por nombre).
// Si algo no se puede leer, se devuelve vacio y el usuario lo completa a mano: nunca se inventa un numero.

export type ReciboLeido = {
  cuil?: string;
  nombre?: string;
  periodo?: string; // "yyyy-mm"
  fechaPago?: string; // "yyyy-mm-dd"
  neto?: number;
  remunerativo?: number; // Hab. C/Desc. (total sujeto a descuentos)
};

const IMPORTE = /\d{1,3}(?:\.\d{3})*,\d{2}/g;
const aNumero = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const soloDigitos = (s?: string) => (s || "").replace(/\D/g, "");
const normalizar = (s?: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Lee UN recibo (un bloque de texto de un solo empleado). */
export function leerBloqueRecibo(texto: string): ReciboLeido {
  const out: ReciboLeido = {};
  const cuil = /C\.?U\.?I\.?L\.?\s*:?\s*(\d{2}-?\d{8}-?\d)/i.exec(texto);
  if (cuil) out.cuil = cuil[1];
  // El nombre va entre el numero de legajo (y sus barras de fecha vacias) y "C.U.I.L.".
  const nombre = /Legajo\s+\d+[\s/]*([A-Za-zÁÉÍÓÚÑáéíóúñ' .]+?)\s+C\.?U\.?I\.?L/i.exec(texto);
  if (nombre) out.nombre = nombre[1].trim();
  const periodo = /Per[ií]odo\s*:?\s*(?:Mensual|Quincenal|Jornal)?\s*(\d{1,2})\/(\d{4})/i.exec(texto);
  if (periodo) out.periodo = `${periodo[2]}-${periodo[1].padStart(2, "0")}`;
  const pago = /Fecha\s+de\s+Pago\s*:?[^0-9]*(\d{1,2})\/(\d{1,2})\/(\d{4})/i.exec(texto);
  if (pago) out.fechaPago = `${pago[3]}-${pago[2].padStart(2, "0")}-${pago[1].padStart(2, "0")}`;
  // FILA DE TOTALES: entre la fecha de pago y "Son Pesos" van, en orden, remunerativo (Hab. C/Desc.),
  // deducciones, no remunerativo (Hab. S/Desc.) y NETO; las columnas en cero no se imprimen. Entonces:
  // el PRIMERO es el remunerativo y el ULTIMO es el neto. Si no esta "Son Pesos", el importe que sigue
  // a "NETO".
  const sonPesos = texto.search(/Son\s+Pesos/i);
  if (sonPesos > 0) {
    const antes = texto.slice(Math.max(0, sonPesos - 300), sonPesos);
    const trasFecha = /Fecha\s+de\s+Pago[^0-9]*\d{1,2}\/\d{1,2}\/\d{4}([\s\S]*)$/i.exec(antes);
    const tira = (trasFecha ? trasFecha[1] : antes).match(IMPORTE);
    if (tira && tira.length) {
      out.neto = aNumero(tira[tira.length - 1]);
      if (tira.length >= 2) out.remunerativo = aNumero(tira[0]);
    }
  }
  if (out.neto === undefined) {
    const m = /NETO(?:\s+A\s+COBRAR)?\s*:?\s*\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2})/i.exec(texto);
    if (m) out.neto = aNumero(m[1]);
  }
  return out;
}

/** Parte el texto en un bloque por recibo (cada "Legajo NNN" que cambia de CUIL o de numero). */
export function bloquesDeRecibos(texto: string): string[] {
  const cortes: number[] = [];
  const re = /Legajo\s+\d+/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) cortes.push(m.index);
  if (cortes.length === 0) return [texto];
  return cortes.map((ini, i) => texto.slice(ini, i + 1 < cortes.length ? cortes[i + 1] : texto.length));
}

/**
 * Lee el recibo de UN empleado de un PDF que puede traer a varios. Busca por CUIL y, si no hay, por
 * nombre (todas las palabras del nombre de la ficha tienen que estar). Si el PDF es de un solo
 * empleado, lo devuelve aunque no coincida (se avisa con `coincide: false`).
 */
export function leerReciboDeEmpleado(
  texto: string,
  empleado: { cuil?: string; name: string }
): ReciboLeido & { coincide: boolean; encontrados: number } {
  const leidos = bloquesDeRecibos(texto)
    .map(leerBloqueRecibo)
    // Un bloque sin neto es la mitad de arriba del recibo (el "Son Pesos" esta en el bloque siguiente
    // del mismo legajo): se completa con el siguiente que tenga el mismo CUIL.
    .reduce<ReciboLeido[]>((acc, r) => {
      const prev = acc[acc.length - 1];
      if (prev && prev.neto === undefined && (!r.cuil || r.cuil === prev.cuil)) {
        acc[acc.length - 1] = { ...prev, ...Object.fromEntries(Object.entries(r).filter(([, v]) => v !== undefined)) };
        return acc;
      }
      acc.push(r);
      return acc;
    }, []);
  const distintos = new Set(leidos.map((r) => soloDigitos(r.cuil) || r.nombre || "")).size;
  const cuil = soloDigitos(empleado.cuil);
  const palabras = normalizar(empleado.name).split(" ").filter((w) => w.length > 2);
  const porCuil = cuil ? leidos.find((r) => soloDigitos(r.cuil) === cuil && r.neto !== undefined) : undefined;
  const porNombre =
    porCuil ||
    leidos.find((r) => {
      const n = normalizar(r.nombre || "");
      return r.neto !== undefined && palabras.length > 0 && palabras.every((w) => n.includes(w));
    });
  if (porNombre) return { ...porNombre, coincide: true, encontrados: distintos };
  if (distintos <= 1 && leidos[0]) return { ...leidos[0], coincide: false, encontrados: distintos };
  return { coincide: false, encontrados: distintos };
}
