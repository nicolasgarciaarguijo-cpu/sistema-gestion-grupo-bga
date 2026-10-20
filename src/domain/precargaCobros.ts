// PRECARGA DE COBROS DE UN TRABAJO (Nicolas, 2026-10-20): "en la parte de cobranzas que existan las
// opciones de precarga para anticipo blanco y negro segun lo acordado, y para saldo despues".
//
// Lo acordado: el % de anticipo y el % que se factura. El circuito BLANCO es la parte facturada del neto
// (mas sus adicionales blancos) con su IVA; el NEGRO, el resto. El anticipo de cada circuito es el % de
// anticipo sobre su parte del neto (el blanco con IVA). El SALDO de cada circuito es lo que falta cobrar
// de el, sin contar lo cobrado ni lo que ya esta programado (para no programarlo dos veces).
// Puro: el App le pasa los numeros del trabajo y crea los cobros estimados.

export type DatosPrecarga = {
  neto: number; // neto acordado (sin IVA)
  facturadoPct: number; // % del neto que va facturado (blanco)
  anticipoPct: number;
  adicionalesBlancos: number; // neto
  ivaPct?: number; // 21 por defecto
  valorACobrar: number; // total a cobrar del trabajo (blanco con IVA + negro)
  cobradoBlanco: number; // incluye retenciones (son credito fiscal del circuito blanco)
  cobradoNegro: number;
  programadoBlanco: number; // cobros estimados / inamovibles ya cargados
  programadoNegro: number;
};

export type Precarga = { anticipoBlanco: number; anticipoNegro: number; saldoBlanco: number; saldoNegro: number };

const r2 = (n: number) => Math.round(n * 100) / 100;

export function precargaCobros(d: DatosPrecarga): Precarga {
  const iva = 1 + Number(d.ivaPct ?? 21) / 100;
  const b = Math.min(100, Math.max(0, Number(d.facturadoPct || 0))) / 100;
  const a = Math.min(100, Math.max(0, Number(d.anticipoPct || 0))) / 100;
  const neto = Number(d.neto || 0);
  const totalBlanco = (neto * b + Number(d.adicionalesBlancos || 0)) * iva;
  const totalNegro = Math.max(0, Number(d.valorACobrar || 0) - totalBlanco);
  return {
    anticipoBlanco: r2(neto * b * a * iva),
    anticipoNegro: r2(neto * (1 - b) * a),
    saldoBlanco: r2(Math.max(0, totalBlanco - Number(d.cobradoBlanco || 0) - Number(d.programadoBlanco || 0))),
    saldoNegro: r2(Math.max(0, totalNegro - Number(d.cobradoNegro || 0) - Number(d.programadoNegro || 0))),
  };
}
