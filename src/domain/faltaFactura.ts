// CONTEO DE BLANQUEO frente al IVA (Nicolas, 2026-10-15).
//
// "Si meto plata negra en el sistema (un prestamo, un aporte o un movimiento interno de la misma
// empresa), para considerarse blanqueada deberia pagar IVA por el monto depositado. Ese IVA, al final
// de cada ejercicio fiscal, deberia ser cero o el menor posible. Entonces llevo el conteo de esa
// diferencia para sacar plata blanca para pagar en negro, o comprar con efectivo negro, y balancear."
//
// Por EMPRESA y por EJERCICIO FISCAL (arranca de cero cada ejercicio):
//   SUBE el conteo (plata negra que entra al blanco = blanqueo):
//     - deposito de efectivo NEGRO en el banco (Movimientos internos);
//     - prestamo o aporte RECIBIDO en negro que entra a una cuenta de BANCO.
//   BAJA el conteo (lo que balancea):
//     - sacar plata blanca del banco a efectivo negro (Movimientos internos);
//     - plata blanca de una caja chica gastada sin factura (B→N);
//     - comprar CON factura pagando con efectivo negro: en caja chica (N→B) y facturas de compra
//       cuyo pago se cargo en negro.
// saldo > 0 -> falta la factura de ese monto: su IVA (monto x 21/121, el monto incluye IVA) se suma a
//              la posicion de IVA. Para dejarlo en cero: sacar plata blanca a negro o comprar con
//              factura y efectivo negro por el saldo.
// saldo < 0 -> margen: se puede blanquear hasta ese monto sin generar IVA.
// Puro y testeable.

export const ALICUOTA_IVA = 0.21;

export type TipoMovFisco =
  | "deposito_negro" // sube
  | "prestamo_negro" // sube
  | "blanco_a_negro" // baja
  | "caja_blanco_sin_factura" // baja
  | "caja_negro_con_factura" // baja
  | "factura_pagada_negro" // baja
  | "factura_regulariza" // baja: factura emitida para regularizar lo blanqueado
  | "regularizacion_manual"; // baja: regularizado sin factura (firmado)

export const SUBE: TipoMovFisco[] = ["deposito_negro", "prestamo_negro"];

export const ETIQUETA_MOV_FISCO: Record<TipoMovFisco, string> = {
  deposito_negro: "Depósitos de efectivo negro en el banco",
  prestamo_negro: "Préstamos y aportes en negro que entraron al banco",
  blanco_a_negro: "Plata blanca sacada del banco a efectivo negro",
  caja_blanco_sin_factura: "Caja chica: plata blanca gastada sin factura",
  caja_negro_con_factura: "Caja chica: compras con factura pagadas con plata negra",
  factura_pagada_negro: "Facturas de compra pagadas con efectivo negro",
  factura_regulariza: "Facturas emitidas que regularizan el blanqueo",
  regularizacion_manual: "Regularizaciones manuales (firmadas)",
};

export type MovFisco = { company: string; date: string; amount: number; tipo: TipoMovFisco };

export type ConteoBlanqueo = {
  desde: string;
  hasta: string;
  porTipo: Record<TipoMovFisco, number>;
  sube: number;
  baja: number;
  saldo: number; // sube - baja
  faltaFacturar: number; // max(0, saldo)
  ivaFaltante: number; // faltaFacturar x 21/121
  margen: number; // max(0, -saldo): se puede blanquear sin IVA
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function conteoBlanqueo(params: { company: string; desde: string; hasta: string; movimientos: MovFisco[] }): ConteoBlanqueo {
  const { company, desde, hasta } = params;
  const porTipo = {
    deposito_negro: 0,
    prestamo_negro: 0,
    blanco_a_negro: 0,
    caja_blanco_sin_factura: 0,
    caja_negro_con_factura: 0,
    factura_pagada_negro: 0,
    factura_regulariza: 0,
    regularizacion_manual: 0,
  } as Record<TipoMovFisco, number>;
  params.movimientos
    .filter((m) => m.company === company && !!m.date && m.date >= desde && m.date <= hasta)
    .forEach((m) => {
      porTipo[m.tipo] += Math.max(0, Number(m.amount || 0));
    });
  (Object.keys(porTipo) as TipoMovFisco[]).forEach((k) => (porTipo[k] = r2(porTipo[k])));
  const sube = r2(SUBE.reduce((a, k) => a + porTipo[k], 0));
  const baja = r2((Object.keys(porTipo) as TipoMovFisco[]).filter((k) => !SUBE.includes(k)).reduce((a, k) => a + porTipo[k], 0));
  const saldo = r2(sube - baja);
  const faltaFacturar = Math.max(0, saldo);
  return {
    desde,
    hasta,
    porTipo,
    sube,
    baja,
    saldo,
    faltaFacturar,
    ivaFaltante: r2((faltaFacturar * ALICUOTA_IVA) / (1 + ALICUOTA_IVA)),
    margen: Math.max(0, -saldo),
  };
}
