// DETALLE DE LA COMPOSICION SALARIAL. El bloque de abajo del recibo: cuanto cuesta cada concepto y
// cuanto pone el empleador y cuanto el trabajador.
//
// Sacado del recibo real de De Raiz (Carmona, 07/2026) y verificado contra el, peso por peso. No es
// una lista de descuentos mas: AGRUPA de otra manera que la grilla de conceptos, y esa es la gracia
// -- muestra el costo TOTAL de cada cosa, no solo la parte que se le descuenta al empleado.
//
//   SINDICAL          = aporte sindical (3%) + seguro de vida y sepelio (1,5%). Todo del trabajador.
//   SEGURIDAD SOCIAL  = jubilacion del trabajador (11%) + la parte patronal (16,41%).
//   OBRA SOCIAL       = 3% del trabajador + 6% del empleador.
//   INSSJP            = ley 19.032 del trabajador (3%) + 1,59% del empleador.
//   ART               = solo empleador.
//   SCVO              = seguro colectivo de vida obligatorio, monto fijo, solo empleador.
//
// El 18% de contribucion jubilatoria del recibo NO es todo "seguridad social": se parte en 16,41 de
// seguridad social y 1,59 de INSSJP. Sumados dan los 18 que figuran arriba.

export const CONTRIB_PATRONAL_SEG_SOCIAL_PCT = 16.41;
export const CONTRIB_PATRONAL_INSSJP_PCT = 1.59;

export type LineaComposicion = {
  clave: string;
  label: string;
  empleador: number;
  trabajador: number;
  total: number;
};

export type ComposicionSalarial = {
  lineas: LineaComposicion[];
  totalEmpleador: number;
  totalTrabajador: number;
  costoTotalEmpleador: number;
  netoDelTrabajador: number;
  // Reparto del costo total (lo de la torta del recibo), en % con dos decimales.
  reparto: Array<{ label: string; pct: number }>;
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export function componerRecibo(input: {
  // Aportes del TRABAJADOR (ya calculados por la liquidacion).
  jubilacion: number;
  ley19032: number;
  obraSocial: number;
  sindicato: number;
  seguroVidaSepelio: number;
  // Contribuciones del EMPLEADOR.
  contribJubilacion: number; // el 18% completo: acá se parte
  contribObraSocial: number;
  art: number;
  scvo: number;
  // Para el reparto de la torta.
  neto: number;
}): ComposicionSalarial {
  const patronalTotal = num(input.contribJubilacion);
  const escala = CONTRIB_PATRONAL_SEG_SOCIAL_PCT + CONTRIB_PATRONAL_INSSJP_PCT; // 18
  const patronalSegSocial = r2((patronalTotal * CONTRIB_PATRONAL_SEG_SOCIAL_PCT) / escala);
  const patronalInssjp = r2(patronalTotal - patronalSegSocial);

  const armar = (clave: string, label: string, empleador: number, trabajador: number): LineaComposicion => ({
    clave, label, empleador: r2(empleador), trabajador: r2(trabajador), total: r2(empleador + trabajador),
  });

  const lineas: LineaComposicion[] = [
    armar("sindical", "Total Costo Sindical", 0, num(input.sindicato) + num(input.seguroVidaSepelio)),
    armar("segSocial", "Total Seguridad Social", patronalSegSocial, num(input.jubilacion)),
    armar("obraSocial", "Total Obra Social", num(input.contribObraSocial), num(input.obraSocial)),
    armar("inssjp", "Total Costo INSSJP", patronalInssjp, num(input.ley19032)),
    armar("art", "Total costo ART", num(input.art), 0),
    armar("scvo", "Total Costo SCVO", num(input.scvo), 0),
  ];

  const totalEmpleador = r2(lineas.reduce((a, l) => a + l.empleador, 0));
  const totalTrabajador = r2(lineas.reduce((a, l) => a + l.trabajador, 0));
  const neto = num(input.neto);
  // El costo total es lo que sale del bolsillo de la empresa: el neto que se lleva el empleado mas
  // TODO lo que se paga por el (lo que el aporta ya esta adentro de su bruto).
  const costoTotalEmpleador = r2(neto + totalEmpleador + totalTrabajador);

  const pct = (n: number) => (costoTotalEmpleador > 0 ? Math.round((n / costoTotalEmpleador) * 10000) / 100 : 0);
  return {
    lineas,
    totalEmpleador,
    totalTrabajador,
    costoTotalEmpleador,
    netoDelTrabajador: neto,
    reparto: [
      ...lineas.map((l) => ({ label: l.label.replace(/^Total (costo |Costo )?/i, ""), pct: pct(l.total) })),
      { label: "Sueldo neto", pct: pct(neto) },
    ],
  };
}
