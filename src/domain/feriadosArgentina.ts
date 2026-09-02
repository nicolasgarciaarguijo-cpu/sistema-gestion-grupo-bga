// FERIADOS ARGENTINOS.
//
// Pedido de Nicolas (2026-08-29): que los feriados, sabados y domingos se vean de un vistazo en el
// Calendario anual, para no cargar un pago en un dia en que el banco no opera.
//
// Se calculan, no se listan a mano: una tabla cargada a dedo se vence en enero. Lo unico que no se
// puede calcular son los "puentes" que el gobierno declara cada año por decreto; esos se agregan
// aparte cuando se conocen (ver FERIADOS_PUENTE).

export type Feriado = { iso: string; nombre: string };

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

/** Domingo de Pascua (algoritmo de Meeus/Jones/Butcher, calendario gregoriano). */
export function domingoDePascua(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, mes - 1, dia));
}

const sumarDias = (base: Date, dias: number) => {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
};
const aIso = (d: Date) => iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());

/**
 * Feriados TRASLADABLES (ley 27.399): si caen martes o miercoles se pasan al lunes anterior; si
 * caen jueves o viernes, al lunes siguiente. Si caen sabado, domingo o lunes, no se mueven.
 */
function trasladar(y: number, m: number, d: number): string {
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const dow = fecha.getUTCDay(); // 0 domingo … 6 sabado
  if (dow === 2 || dow === 3) return aIso(sumarDias(fecha, dow === 2 ? -1 : -2));
  if (dow === 4 || dow === 5) return aIso(sumarDias(fecha, dow === 4 ? 4 : 3));
  return aIso(fecha);
}

// Puentes turisticos: los declara el gobierno por decreto, año por año. No hay forma de calcularlos.
export const FERIADOS_PUENTE: Feriado[] = [];

export function feriadosDelAnio(year: number): Feriado[] {
  const pascua = domingoDePascua(year);
  const lista: Feriado[] = [
    { iso: iso(year, 1, 1), nombre: "Año Nuevo" },
    { iso: aIso(sumarDias(pascua, -48)), nombre: "Carnaval" },
    { iso: aIso(sumarDias(pascua, -47)), nombre: "Carnaval" },
    { iso: iso(year, 3, 24), nombre: "Día de la Memoria" },
    { iso: aIso(sumarDias(pascua, -2)), nombre: "Viernes Santo" },
    { iso: iso(year, 4, 2), nombre: "Malvinas" },
    { iso: iso(year, 5, 1), nombre: "Día del Trabajador" },
    { iso: iso(year, 5, 25), nombre: "Revolución de Mayo" },
    { iso: iso(year, 6, 20), nombre: "Paso a la Inmortalidad de Belgrano" },
    { iso: iso(year, 7, 9), nombre: "Día de la Independencia" },
    { iso: trasladar(year, 8, 17), nombre: "Paso a la Inmortalidad de San Martín" },
    { iso: trasladar(year, 10, 12), nombre: "Diversidad Cultural" },
    { iso: trasladar(year, 11, 20), nombre: "Soberanía Nacional" },
    { iso: iso(year, 12, 8), nombre: "Inmaculada Concepción" },
    { iso: iso(year, 12, 25), nombre: "Navidad" },
  ];
  return lista.concat(FERIADOS_PUENTE.filter((f) => f.iso.startsWith(String(year))));
}

/** Mapa fecha -> nombre para los años que toque el ejercicio (que arranca en noviembre). */
export function mapaDeFeriados(years: number[]): Map<string, string> {
  const m = new Map<string, string>();
  years.forEach((y) => feriadosDelAnio(y).forEach((f) => m.set(f.iso, f.nombre)));
  return m;
}

/** true si la fecha cae sabado o domingo. Se parsea a mano: new Date("2026-08-29") es UTC. */
export function esFinDeSemana(isoDate: string): boolean {
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow === 0 || dow === 6;
}

// Cache por año de las fechas de feriado (Set de iso), para no recalcular en loops (liquidación).
const feriadoSetCache = new Map<number, Set<string>>();

/** true si la fecha ISO (yyyy-mm-dd) es feriado nacional (incluye puentes cargados). */
export function esFeriado(isoDate: string): boolean {
  const year = Number((isoDate || "").slice(0, 4));
  if (!year) return false;
  let set = feriadoSetCache.get(year);
  if (!set) {
    set = new Set(feriadosDelAnio(year).map((f) => f.iso));
    feriadoSetCache.set(year, set);
  }
  return set.has(isoDate.slice(0, 10));
}
