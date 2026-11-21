// OBLIGACIONES MENSUALES: IVA y SINDICATO (Nicolas, 21/11/2026). Las dos son "la misma historia": cada mes
// el sistema CALCULA cuanto hay que pagar, despues se carga la boleta real (el VEP del IVA, la boleta del
// sindicato) y se CRUZA una contra la otra. La boleta es una factura del proveedor en Compras (una sola
// ficha, la de siempre), con el periodo que paga. Y se resuelve de dos formas: se paga, o se saca un PLAN DE
// PAGO (una deuda de Desendeudamiento que incluye esa factura).
//
//   "en el bloque solo quiero informacion numerica de cuanto vamos teniendo y vamos pagando mes a mes"
//   "una vez que se carga el vep con su plazo, se reinicia el contador de iva por pagar"
//   "lo que quiero saber es si al cargar el vep esta pago o saque un plan, para ver la evolucion de cada uno
//    y saber la costumbre de nuestro accionar. Cada plan tiene sus intereses y quiero conocerlos."
//
// Puro. El App junta el calculo de cada mes, las facturas y las deudas.

const r2 = (n: number) => Math.round(n * 100) / 100;
const mesValido = (m?: string): boolean => /^\d{4}-\d{2}$/.test(String(m || ""));

export const mesAnteriorA = (iso: string): string => {
  const [y, m] = String(iso || "").slice(0, 7).split("-").map(Number);
  if (!y || !m) return "";
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

// El plan de pago donde quedo una boleta: la deuda de Desendeudamiento que la incluye.
export type PlanObligacion = {
  deudaId: number;
  concepto: string;
  capital: number; // lo que se debia: la suma de las facturas que entraron al plan
  total: number; // lo que se termina pagando: la suma de las cuotas
  interes: number; // total - capital (nunca negativo)
  cuotas: number;
  cuotasPagadas: number;
  pagado: number;
  pendiente: number;
};

/** El interes de un plan: lo que suman sus cuotas menos lo que se debia. Sin capital conocido, no se sabe. */
export function planDeObligacion(p: { deudaId: number; concepto: string; capital: number; total: number; cuotas: number; cuotasPagadas: number; pagado: number; pendiente: number }): PlanObligacion {
  const capital = r2(Number(p.capital || 0));
  const total = r2(Number(p.total || 0));
  return { ...p, capital, total, interes: capital > 0 ? r2(Math.max(0, total - capital)) : 0, pagado: r2(p.pagado), pendiente: r2(p.pendiente) };
}

// La boleta real del mes: una factura del proveedor cargada en Compras.
export type DocObligacion = {
  id: number;
  company: string;
  supplier: string;
  fecha: string;
  total: number;
  periodo?: string; // el mes que paga ("2026-10"); sin aclarar, el anterior al de la factura
  pagadaEl?: string;
  plan?: PlanObligacion;
};

export const periodoDelDoc = (d: Pick<DocObligacion, "periodo" | "fecha">): string => (mesValido(d.periodo) ? String(d.periodo) : mesAnteriorA(d.fecha));

// nada: no hay nada que pagar · en_curso: el mes todavia no cerro · sin_cargar: cerro y falta la boleta ·
// pendiente: boleta cargada, sin pagar y sin plan · pagado · plan: al menos una boleta fue a un plan.
export type ResolucionMes = "nada" | "en_curso" | "sin_cargar" | "pendiente" | "pagado" | "plan";

export type MesObligacion = {
  mes: string;
  calculado: number; // lo que el sistema dice que hay que pagar
  cargado: number; // lo que dicen las boletas cargadas
  pagado: number; // de eso, lo que ya se pago al contado
  enPlan: number; // lo que se mando a un plan de pago
  pendiente: number; // cargado, sin pagar y sin plan
  diferencia: number; // cargado - calculado (solo si hay boleta)
  resolucion: ResolucionMes;
  docs: DocObligacion[];
};

export type ObligacionMensual = {
  meses: MesObligacion[];
  // EL CONTADOR: lo calculado de los meses que todavia NO tienen boleta cargada. Cargar la boleta de un mes
  // lo saca de aca (se "reinicia"): desde ahi lo que importa es lo que dice la boleta.
  porPagar: number;
  pendiente: number; // boletas cargadas sin pagar y sin plan
  // La costumbre: en cuantos meses se pago al contado y en cuantos se saco un plan.
  costumbre: { pagados: number; enPlan: number; pendientes: number; sinCargar: number };
  planes: PlanObligacion[]; // sin repetir
  intereses: number; // los de todos los planes
  diferencia: number; // suma de (cargado - calculado) de los meses con boleta
};

export function obligacionMensual(params: { company: string; meses: Array<{ mes: string; calculado: number }>; docs: DocObligacion[]; hoy: string }): ObligacionMensual {
  const hoyMes = params.hoy.slice(0, 7);
  const docsPorMes = new Map<string, DocObligacion[]>();
  params.docs
    .filter((d) => d.company === params.company)
    .forEach((d) => {
      const mes = periodoDelDoc(d);
      if (!mes) return;
      docsPorMes.set(mes, [...(docsPorMes.get(mes) || []), d]);
    });
  const meses: MesObligacion[] = params.meses
    .slice()
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .map(({ mes, calculado }) => {
      const docs = (docsPorMes.get(mes) || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
      const suma = (f: (d: DocObligacion) => boolean) => r2(docs.filter(f).reduce((a, d) => a + Number(d.total || 0), 0));
      const cargado = suma(() => true);
      const enPlan = suma((d) => !!d.plan);
      const pagado = suma((d) => !d.plan && !!d.pagadaEl);
      const pendiente = r2(cargado - enPlan - pagado);
      const calc = r2(Math.max(0, Number(calculado || 0)));
      const resolucion: ResolucionMes = docs.length
        ? enPlan > 0
          ? "plan"
          : pendiente > 1
          ? "pendiente"
          : "pagado"
        : calc <= 1
        ? "nada"
        : mes >= hoyMes
        ? "en_curso"
        : "sin_cargar";
      return { mes, calculado: calc, cargado, pagado, enPlan, pendiente, diferencia: docs.length ? r2(cargado - calc) : 0, resolucion, docs };
    });
  const planes = new Map<number, PlanObligacion>();
  meses.forEach((m) => m.docs.forEach((d) => d.plan && planes.set(d.plan.deudaId, d.plan)));
  const cuenta = (r: ResolucionMes) => meses.filter((m) => m.resolucion === r).length;
  return {
    meses,
    porPagar: r2(meses.filter((m) => !m.docs.length && m.mes <= hoyMes).reduce((a, m) => a + m.calculado, 0)),
    pendiente: r2(meses.reduce((a, m) => a + m.pendiente, 0)),
    costumbre: { pagados: cuenta("pagado"), enPlan: cuenta("plan"), pendientes: cuenta("pendiente"), sinCargar: cuenta("sin_cargar") },
    planes: Array.from(planes.values()),
    intereses: r2(Array.from(planes.values()).reduce((a, p) => a + p.interes, 0)),
    diferencia: r2(meses.reduce((a, m) => a + m.diferencia, 0)),
  };
}

// SINDICATO: el aporte es un porcentaje sobre lo que cobran los trabajadores. El porcentaje se edita.
export const aporteSindical = (base: number, porcentaje: number): number => r2((Math.max(0, Number(base || 0)) * Math.max(0, Number(porcentaje || 0))) / 100);

const norm = (v?: string): string =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
// El proveedor es un sindicato: por el nombre (USIMRA, UOCRA, "Sindicato...").
export const esProveedorSindicato = (supplier?: string): boolean => /\b(usimra|uocra|uom|sindicato|sindical|gremio)\b/.test(norm(supplier));
