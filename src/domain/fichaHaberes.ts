// FICHA DE PAGO DE HABERES (Nicolas, 2026-10-16): "Personal no se vincula mas con el cash flow. Armamos una
// ficha de pago, como la de pago a proveedores, donde cargo el recibo, elijo de donde sale la plata, el monto
// y la fecha, para que figure en el cash flow. Cada persona vinculada a SU empresa (no se duplica). Cada
// persona abre un renglon en EGRESOS · Haberes y su ficha, con los recibos oficiales, los comprobantes de
// pago y los pagos, con todos los criterios de la ficha de proveedores y el vinculo con Pagos programados."
//
// Igual que con un proveedor:
//   - lo que CORRESPONDE pagar cada periodo (el recibo oficial en blanco, o la liquidacion; el acordado en
//     negro; el viatico fijo) es como la factura: registro, no mueve plata;
//   - el PAGO es lo unico que va al cash flow (un gasto con su cuenta, circuito y firmante);
//   - la diferencia es la cuenta corriente de la persona: le debemos o queda a favor;
//   - lo que falta pagar baja a Pagos programados (4to dia habil del mes siguiente).
// Cada ficha es de UNA persona en UNA empresa (el empleado de la nomina): la misma persona en las dos
// empresas son dos fichas y dos renglones distintos. Puro y testeable.

export type CorrespondeHaber = {
  periodo: string; // yyyy-mm
  blanco: number; // recibo oficial (si esta) o liquidacion
  negro: number; // acordado en negro (premio/acuerdo, temporal, fuera de convenio)
  viaticoBlanco: number;
  viaticoNegro: number;
  conRecibo: boolean; // hay recibo oficial cargado para el blanco
  fechaPrevista: string; // 4to dia habil del mes siguiente
};

export type PagoHaber = {
  id: number;
  periodo?: string; // a que periodo corresponde (ausente = el mes anterior a la fecha)
  date: string;
  amount: number;
  administration: "blanco" | "negro";
};

export type PeriodoFicha = CorrespondeHaber & {
  corresponde: number; // total que corresponde (blanco + negro + viaticos)
  correspondeBlanco: number;
  correspondeNegro: number;
  pagadoBlanco: number;
  pagadoNegro: number;
  pagado: number;
  saldo: number; // corresponde - pagado: >0 le debemos, <0 a favor
  estado: "pagado" | "parcial" | "pendiente" | "a_favor" | "sin_cargo";
  pagos: PagoHaber[];
  pagoBlancoSinRecibo: boolean; // se pago blanco y no esta el recibo oficial
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// Periodo de un pago sin periodo elegido: el sueldo se paga a mes vencido, asi que el del mes anterior.
export const periodoDePago = (fecha: string): string => {
  const m = /^(\d{4})-(\d{2})/.exec(fecha || "");
  if (!m) return "";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  return mo === 1 ? `${y - 1}-12` : `${y}-${String(mo - 1).padStart(2, "0")}`;
};

export function fichaDeHaberes(corresponde: CorrespondeHaber[], pagos: PagoHaber[]): {
  periodos: PeriodoFicha[];
  totalCorresponde: number;
  totalPagado: number;
  saldo: number;
} {
  const porPeriodo = new Map<string, PagoHaber[]>();
  pagos.forEach((p) => {
    const per = p.periodo || periodoDePago(p.date);
    if (!per) return;
    if (!porPeriodo.has(per)) porPeriodo.set(per, []);
    porPeriodo.get(per)!.push(p);
  });
  const periodos = new Set<string>([...corresponde.map((c) => c.periodo), ...Array.from(porPeriodo.keys())]);
  const out: PeriodoFicha[] = Array.from(periodos)
    .sort((a, b) => b.localeCompare(a))
    .map((per) => {
      const c = corresponde.find((x) => x.periodo === per) || {
        periodo: per, blanco: 0, negro: 0, viaticoBlanco: 0, viaticoNegro: 0, conRecibo: false, fechaPrevista: "",
      };
      const ps = (porPeriodo.get(per) || []).slice().sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      const correspondeBlanco = r2(Number(c.blanco || 0) + Number(c.viaticoBlanco || 0));
      const correspondeNegro = r2(Number(c.negro || 0) + Number(c.viaticoNegro || 0));
      const pagadoBlanco = r2(ps.filter((p) => p.administration !== "negro").reduce((a, p) => a + Number(p.amount || 0), 0));
      const pagadoNegro = r2(ps.filter((p) => p.administration === "negro").reduce((a, p) => a + Number(p.amount || 0), 0));
      const corr = r2(correspondeBlanco + correspondeNegro);
      const pagado = r2(pagadoBlanco + pagadoNegro);
      const saldo = r2(corr - pagado);
      const estado: PeriodoFicha["estado"] =
        corr <= 0.5 && pagado <= 0.5 ? "sin_cargo" : saldo < -1 ? "a_favor" : Math.abs(saldo) <= 1 ? "pagado" : pagado > 0.5 ? "parcial" : "pendiente";
      return {
        ...c,
        corresponde: corr,
        correspondeBlanco,
        correspondeNegro,
        pagadoBlanco,
        pagadoNegro,
        pagado,
        saldo,
        estado,
        pagos: ps,
        pagoBlancoSinRecibo: pagadoBlanco > 0.5 && !c.conRecibo,
      };
    });
  const totalCorresponde = r2(out.reduce((a, p) => a + p.corresponde, 0));
  const totalPagado = r2(out.reduce((a, p) => a + p.pagado, 0));
  return { periodos: out, totalCorresponde, totalPagado, saldo: r2(totalCorresponde - totalPagado) };
}

// Lo que falta pagar va a Pagos programados: un item por persona y periodo con saldo pendiente.
export function haberesPorPagar(
  empleado: { id: number; company: string; name: string },
  periodos: PeriodoFicha[],
  desde: string // periodo minimo (yyyy-mm): no se reclama lo de ejercicios viejos
): Array<{ clave: string; company: string; titulo: string; periodo: string; fecha: string; monto: number; administration: "blanco" | "negro" }> {
  return periodos
    .filter((p) => p.periodo >= desde && p.saldo > 1 && !!p.fechaPrevista)
    .map((p) => {
      const faltaBlanco = Math.max(0, p.correspondeBlanco - p.pagadoBlanco);
      return {
        clave: `haber:${empleado.id}:${p.periodo}`,
        company: empleado.company,
        titulo: `Haberes · ${empleado.name} · ${p.periodo.slice(5, 7)}/${p.periodo.slice(0, 4)}`,
        periodo: p.periodo,
        fecha: p.fechaPrevista,
        monto: r2(p.saldo),
        administration: (faltaBlanco > 1 ? "blanco" : "negro") as "blanco" | "negro",
      };
    });
}

// El renglon de la persona en EGRESOS · Haberes: unico por empleado (no por nombre), asi la misma persona en
// las dos empresas no se pisa. El titulo sigue siendo el nombre.
export const renglonHaberes = (nombre: string) => `custom:haberes:${String(nombre || "").trim()}`;
