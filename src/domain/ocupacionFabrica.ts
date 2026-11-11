// OCUPACION DEL TALLER (Nicolas, 11/11/2026). Antes la ocupacion del tablero de Fabricacion salia de la mano de obra del
// presupuesto que estuviera abierto en el editor (cambiaba segun que presupuesto se mirara). Ahora sale de los TRABAJOS
// APROBADOS ABIERTOS contra la gente de De Raiz:
// - Las horas de cada trabajo (las de mano de obra de su presupuesto aprobado) se reparten parejas en los dias habiles
//   entre su inicio y su entrega; cuenta lo que cae en el mes.
// - Un trabajo atrasado (la entrega ya paso y no esta finalizado) carga todas sus horas en el mes actual: se deben.
// - Lo que cayo en meses anteriores se toma como hecho.
// - Disponible = las horas por mes de cada persona activa de De Raiz.
import { esHabil, sumarDias } from "./cronograma";

export type TrabajoParaOcupacion = { horas: number; inicio?: string; entrega?: string; finalizado: boolean };

export type OcupacionFabrica = {
  comprometidas: number; // horas que caen en el mes
  disponibles: number; // horas de la gente en el mes
  pct: number;
  trabajosAbiertos: number;
  trabajosSinHoras: number; // abiertos sin horas de mano de obra en el presupuesto: no suman
};

const habilesEntre = (desde: string, hasta: string) => {
  let n = 0;
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) if (esHabil(f)) n += 1;
  return n;
};

const finDeMes = (mes: string) => {
  const [a, m] = mes.split("-").map(Number);
  const d = new Date(a, m, 0);
  return `${mes}-${String(d.getDate()).padStart(2, "0")}`;
};

export function ocupacionDelMes(p: { trabajos: TrabajoParaOcupacion[]; horasPorPersona: number[]; hoy: string }): OcupacionFabrica {
  const mes = p.hoy.slice(0, 7);
  const desdeMes = `${mes}-01`;
  const hastaMes = finDeMes(mes);
  const abiertos = p.trabajos.filter((t) => !t.finalizado);
  let comprometidas = 0;
  let sinHoras = 0;
  abiertos.forEach((t) => {
    const horas = Number(t.horas || 0);
    if (!(horas > 0)) {
      sinHoras += 1;
      return;
    }
    const inicio = t.inicio || p.hoy;
    const entrega = t.entrega && t.entrega >= inicio ? t.entrega : inicio;
    if (entrega < desdeMes) {
      comprometidas += horas; // atrasado: se debe entero
      return;
    }
    if (inicio > hastaMes) return; // arranca mas adelante
    const total = Math.max(1, habilesEntre(inicio, entrega));
    const enMes = habilesEntre(inicio > desdeMes ? inicio : desdeMes, entrega < hastaMes ? entrega : hastaMes);
    comprometidas += (horas * enMes) / total;
  });
  const disponibles = p.horasPorPersona.reduce((acc, h) => acc + Math.max(0, Number(h || 0)), 0);
  return {
    comprometidas,
    disponibles,
    pct: disponibles > 0 ? (comprometidas / disponibles) * 100 : 0,
    trabajosAbiertos: abiertos.length,
    trabajosSinHoras: sinHoras,
  };
}
