// VERIFICAR EL EXTRACTO. El banco constata, no carga (ver domain/calendarFeeds.ts): desde el
// 29/08/2026 el resumen ya no arma renglones en el Calendario. Su trabajo pasa a ser este —
// responder "¿lo que dice el sistema existe en el banco, y esta todo?".
//
// La verificacion de fondo es la CADENA DE SALDOS: en un extracto, el saldo de cada linea tiene que
// ser el saldo de la linea anterior mas o menos el movimiento. Si en algun renglon no da, ahi hay un
// movimiento que falta, uno cargado de mas, o un monto mal tipeado. Es la unica forma de saber que
// un resumen esta COMPLETO sin leerlo linea por linea.

export type MovimientoExtracto = {
  id: number;
  company: string;
  bank: string;
  currency?: "ARS" | "USD";
  date: string;
  concept: string;
  movementType: "credito" | "debito";
  amount: number;
  balance: number;
  conceptKey?: string;
};

export type LineaVerificada = MovimientoExtracto & {
  // Saldo que TENDRIA que tener segun la linea anterior. undefined en la primera (no hay con que).
  saldoEsperado?: number;
  // Cuanto se aparta del esperado. 0 = la cadena cierra.
  desvio: number;
  // true si el desvio es material: ahi falta (o sobra) un movimiento.
  rompe: boolean;
};

export type ResumenDeCuenta = {
  clave: string;
  company: string;
  bank: string;
  currency: "ARS" | "USD";
  lineas: LineaVerificada[];
  desde: string;
  hasta: string;
  saldoFinal: number;
  // Movimientos sin renglon asignado: plata que existe en el banco y no se sabe que es.
  sinClasificar: number;
  // Renglones donde la cadena de saldos no cierra.
  rupturas: number;
};

const TOL = 0.01;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Signo del movimiento sobre el saldo: un credito suma, un debito resta. */
export function signoDelMovimiento(m: Pick<MovimientoExtracto, "movementType" | "amount">): number {
  return (m.movementType === "credito" ? 1 : -1) * Math.abs(num(m.amount));
}

/**
 * Agrupa los movimientos por CUENTA (empresa + banco + moneda: una cuenta en dolares es otra cuenta)
 * y verifica la cadena de saldos de cada una.
 */
export function verificarExtractos(movs: MovimientoExtracto[]): ResumenDeCuenta[] {
  const grupos = new Map<string, MovimientoExtracto[]>();
  movs.forEach((m) => {
    if (!m || !m.date) return;
    const moneda = m.currency === "USD" ? "USD" : "ARS";
    const clave = `${m.company || ""}||${m.bank || "Banco"}||${moneda}`;
    const list = grupos.get(clave);
    if (list) list.push(m);
    else grupos.set(clave, [m]);
  });

  return Array.from(grupos.entries())
    .map(([clave, list]) => {
      const [company, bank, currency] = clave.split("||");
      // Orden del extracto: por fecha, y a igual fecha respetando como vino cargado (el banco no
      // numera las lineas, asi que el orden de carga es lo mas parecido al orden real).
      const orden = list
        .map((m, i) => ({ m, i }))
        .sort((a, b) => (a.m.date === b.m.date ? a.i - b.i : a.m.date < b.m.date ? -1 : 1))
        .map((x) => x.m);

      const lineas: LineaVerificada[] = orden.map((m, i) => {
        if (i === 0) return { ...m, desvio: 0, rompe: false };
        const saldoEsperado = num(orden[i - 1].balance) + signoDelMovimiento(m);
        const desvio = num(m.balance) - saldoEsperado;
        return { ...m, saldoEsperado, desvio, rompe: Math.abs(desvio) > TOL };
      });

      return {
        clave,
        company,
        bank,
        currency: currency as "ARS" | "USD",
        lineas,
        desde: orden[0]?.date || "",
        hasta: orden[orden.length - 1]?.date || "",
        saldoFinal: num(orden[orden.length - 1]?.balance),
        sinClasificar: orden.filter((m) => !m.conceptKey).length,
        rupturas: lineas.filter((l) => l.rompe).length,
      };
    })
    .sort((a, b) => a.clave.localeCompare(b.clave));
}

// ---- TARJETAS ---------------------------------------------------------------------------------
// La tarjeta no tiene cadena de saldos: tiene un TOTAL por cierre. La verificacion es otra pregunta,
// igual de concreta: ¿los consumos que cargamos suman el total del resumen? Si no suman, hay
// consumos sin itemizar -- y esos son justo los que no se pueden clasificar como costo.

export type ResumenTarjeta = {
  id: number;
  company: string;
  cardId: number;
  closingDate: string;
  totalArs: number;
  totalUsd: number;
};
export type ConsumoTarjeta = {
  statementId?: number;
  amount: number;
  currency: "ARS" | "USD";
  group?: string;
};

export type ResumenTarjetaVerificado = ResumenTarjeta & {
  itemizadoArs: number;
  itemizadoUsd: number;
  // Lo que falta itemizar (positivo) o lo que sobra (negativo).
  faltaArs: number;
  faltaUsd: number;
  consumos: number;
  // Consumos cargados sin grupo de costo: no se pueden usar para cotizar ni para los marcadores.
  sinGrupo: number;
  cierra: boolean;
};

export function verificarResumenesDeTarjeta(
  resumenes: ResumenTarjeta[],
  consumos: ConsumoTarjeta[]
): ResumenTarjetaVerificado[] {
  return resumenes
    .map((r) => {
      const propios = consumos.filter((c) => c.statementId === r.id);
      const itemizadoArs = propios.filter((c) => c.currency !== "USD").reduce((a, c) => a + num(c.amount), 0);
      const itemizadoUsd = propios.filter((c) => c.currency === "USD").reduce((a, c) => a + num(c.amount), 0);
      const faltaArs = num(r.totalArs) - itemizadoArs;
      const faltaUsd = num(r.totalUsd) - itemizadoUsd;
      return {
        ...r,
        itemizadoArs,
        itemizadoUsd,
        faltaArs,
        faltaUsd,
        consumos: propios.length,
        sinGrupo: propios.filter((c) => !String(c.group || "").trim()).length,
        cierra: Math.abs(faltaArs) <= TOL && Math.abs(faltaUsd) <= TOL,
      };
    })
    .sort((a, b) => (b.closingDate || "").localeCompare(a.closingDate || ""));
}
