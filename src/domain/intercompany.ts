// CUENTA CORRIENTE ENTRE LAS EMPRESAS DEL GRUPO.
//
// BGA y De Raiz se giran plata entre ellas. Esos movimientos NO son pagos a proveedor ni cobros de
// cliente: para el grupo no entro ni salio nada, solo cambio de bolsillo. Pero tampoco son gratis:
// cada giro termina cruzandose con una FACTURA entre las dos, o con una DEVOLUCION. Lo que no esta
// cruzado es lo que hay que definir.
//
// Que responde: cuanta plata le giro una a la otra, cuanto de eso quedo facturado, y cuanto falta
// (facturar o devolver).
//
// OJO (encontrado el 2026-07-19 con datos reales): si el CUIT de una empresa propia queda cargado
// como proveedor, sus giros se disfrazan de pagos. Por eso `isOwnCompanyTaxId` se usa para EXCLUIR
// las empresas del grupo del cotejo de proveedores.
//
// Puro: solo texto y aritmetica.

const digitsOf = (s: string): string => (s || "").replace(/\D/g, "");

export type GroupCompany = {
  company: string; // nombre interno de la empresa
  taxId: string;
};

// True si ese CUIT es de una empresa del grupo (no un tercero).
export function isOwnCompanyTaxId(taxId: string, companies: GroupCompany[]): boolean {
  const d = digitsOf(taxId);
  if (d.length < 11) return false;
  return (companies || []).some((c) => digitsOf(c.taxId) === d);
}

export type BankMovement = {
  id: number;
  company: string; // la empresa DUEÑA de la cuenta donde figura el movimiento
  date: string;
  amount: number;
  movementType: "credito" | "debito";
  text: string; // concepto + notas (ahi aparece el CUIT de la contraparte)
};

export type IntercompanyTransfer = {
  id: number;
  from: string; // quien puso la plata
  to: string; // quien la recibio
  date: string;
  amount: number;
  text: string;
  declaresInvoice: boolean; // el concepto dice "factura" (es lo que tipeo quien transfirio, NO prueba)
  // BLANCO o NEGRO (Nicolas, 14/11/2026): "necesito saber si el proximo prestamo implica plata en blanco
  // para balancear todas esas facturas o es mejor en negro por otra situacion". Solo lo BLANCO se puede
  // respaldar con una factura entre las dos; lo negro se devuelve o se compensa con otro movimiento negro.
  administration?: "blanco" | "negro"; // ausente = blanco (el banco siempre es blanco)
  // DE DONDE SALE el giro (2026-11-14). Con esto la cuenta corriente dice como se formo el saldo y se
  // puede sacar el panel aparte de "pagos cruzados": es una linea mas del estado de cuenta.
  origen?: "pase" | "banco" | "pagoCruzado" | "cuentaAjena";
};

export const ORIGEN_GIRO: Record<NonNullable<IntercompanyTransfer["origen"]>, string> = {
  pase: "pases entre empresas",
  banco: "giros vistos en el banco",
  pagoCruzado: "pagos de una empresa por la otra",
  cuentaAjena: "plata en la cuenta de la otra",
};

// Detecta los giros entre empresas del grupo mirando el CUIT de la contraparte en el texto.
// Solo se leen los DEBITOS: el credito del otro lado es el mismo giro visto desde la otra cuenta, y
// contarlo seria duplicar. (Si falta el extracto de una, el debito de la otra igual lo trae.)
export function detectIntercompanyTransfers(
  movements: BankMovement[],
  companies: GroupCompany[]
): IntercompanyTransfer[] {
  const out: IntercompanyTransfer[] = [];
  for (const mov of movements || []) {
    if (mov.movementType !== "debito") continue;
    const dig = digitsOf(mov.text);
    if (dig.length < 11) continue;
    for (const other of companies || []) {
      const otherDigits = digitsOf(other.taxId);
      if (otherDigits.length < 11) continue;
      if (other.company === mov.company) continue; // su propio CUIT: mover plata entre cuentas propias
      if (!dig.includes(otherDigits)) continue;
      out.push({
        origen: "banco",
        id: mov.id,
        from: mov.company,
        to: other.company,
        date: mov.date,
        amount: Number(mov.amount || 0),
        text: mov.text,
        declaresInvoice: /factura/i.test(mov.text || ""),
      });
      break;
    }
  }
  return out;
}

export type CrossInvoice = {
  from: string; // la que emitio
  to: string; // la que la recibio
  date: string;
  amount: number;
};

export type IntercompanyPair = {
  from: string;
  to: string;
  transferred: number; // plata girada
  invoiced: number; // facturado en esa direccion
  pending: number; // girado - facturado: >0 falta facturar (o devolver); <0 se facturo de mas
  transfersCount: number;
  declaredWithInvoice: number; // monto de giros cuyo concepto dice "factura"
  withoutBacking: number; // monto de giros que no declaran factura
  blanco: number; // de lo girado, cuanto fue en blanco (se puede respaldar con factura)
  negro: number; // de lo girado, cuanto fue en negro (no se factura)
};

export type IntercompanySummary = {
  pairs: IntercompanyPair[];
  netByCompany: Record<string, number>; // >0 puso mas plata de la que recibio
  totalTransferred: number;
  totalPending: number;
};

export function summarizeIntercompany(input: {
  transfers: IntercompanyTransfer[];
  invoices?: CrossInvoice[];
}): IntercompanySummary {
  const pairs = new Map<string, IntercompanyPair>();
  const slot = (from: string, to: string): IntercompanyPair => {
    const key = `${from}>${to}`;
    if (!pairs.has(key)) {
      pairs.set(key, {
        from,
        to,
        transferred: 0,
        invoiced: 0,
        pending: 0,
        transfersCount: 0,
        declaredWithInvoice: 0,
        withoutBacking: 0,
        blanco: 0,
        negro: 0,
      });
    }
    return pairs.get(key)!;
  };

  for (const t of input.transfers || []) {
    const amount = Number(t.amount || 0);
    if (!(amount > 0)) continue;
    const p = slot(t.from, t.to);
    p.transferred += amount;
    p.transfersCount += 1;
    if (t.administration === "negro") p.negro += amount;
    else p.blanco += amount;
    if (t.declaresInvoice) p.declaredWithInvoice += amount;
    else p.withoutBacking += amount;
  }

  // La factura va en la direccion CONTRARIA al giro: si BGA le gira plata a De Raiz, es De Raiz la
  // que le factura a BGA. Por eso la factura de (De Raiz -> BGA) cruza el giro de (BGA -> De Raiz).
  for (const inv of input.invoices || []) {
    const amount = Number(inv.amount || 0);
    if (!(amount > 0)) continue;
    slot(inv.to, inv.from).invoiced += amount;
  }

  const netByCompany: Record<string, number> = {};
  for (const p of Array.from(pairs.values())) {
    p.pending = p.transferred - p.invoiced;
    netByCompany[p.from] = (netByCompany[p.from] || 0) + p.transferred;
    netByCompany[p.to] = (netByCompany[p.to] || 0) - p.transferred;
  }

  const list = Array.from(pairs.values()).sort((a, b) => b.transferred - a.transferred);
  return {
    pairs: list,
    netByCompany,
    totalTransferred: list.reduce((a, p) => a + p.transferred, 0),
    totalPending: list.reduce((a, p) => a + p.pending, 0),
  };
}

// PASES CARGADOS ENTRE EMPRESAS (Nicolas, 05/11/2026: "generaria un debe y haber entre empresas que debemos registrar para
// saber finalmente como estamos"). Cada pase que cruza de empresa es un giro, en cualquier cuenta y color.
export function girosDePases(
  pases: ReadonlyArray<{ id: number; company: unknown; companyDestino?: unknown; date: string; amount: number; currency?: string; description?: string; color?: string }>,
  moneda: "ARS" | "USD"
): IntercompanyTransfer[] {
  return pases
    .filter((t) => !!t.companyDestino && t.companyDestino !== t.company && (t.currency === "USD" ? "USD" : "ARS") === moneda && Number(t.amount) > 0)
    .map((t) => ({
      id: t.id,
      from: String(t.company),
      to: String(t.companyDestino),
      date: t.date,
      amount: Number(t.amount),
      text: `Pase cargado${t.description ? ` · ${t.description}` : ""}`,
      declaresInvoice: /factura/i.test(t.description || ""),
      administration: t.color === "negro" ? "negro" : "blanco",
      origen: "pase" as const,
    }));
}

// PAGOS POR LA OTRA EMPRESA (Nicolas, 12/11/2026: "poder usar plata desde la caja chica de De Raiz para pagar algo de BGA, y
// que eso se acumule en los prestamos entre empresas para saber como sigue la cuenta entre ambas"). Un gasto o una factura de una
// empresa que pago la otra (con su banco, su efectivo o su caja chica) es un prestamo: la que pago le presto a la otra.
export function girosDePagosCruzados(
  pagos: ReadonlyArray<{ id: number; empresaPaga: unknown; empresaGasto: unknown; date: string; amount: number; detalle?: string; administration?: string }>
): IntercompanyTransfer[] {
  return pagos
    .filter((p) => !!p.empresaPaga && !!p.empresaGasto && String(p.empresaPaga) !== String(p.empresaGasto) && Number(p.amount) > 0)
    .map((p) => ({
      id: p.id,
      from: String(p.empresaPaga),
      to: String(p.empresaGasto),
      date: p.date,
      amount: Number(p.amount),
      text: `Pagó un gasto de la otra empresa${p.detalle ? ` · ${p.detalle}` : ""}`,
      declaresInvoice: false,
      administration: p.administration === "negro" ? "negro" : "blanco",
      origen: "pagoCruzado" as const,
    }));
}

// COBRO (o cualquier plata) EN LA CUENTA DE LA OTRA EMPRESA (Nicolas, 14/11/2026: "el cobro cruzado que
// si figure en cuenta corriente"). Si la plata ENTRA en una cuenta de la otra empresa, la dueña de la
// cuenta recibió plata ajena: le debe ese monto. Si SALE de una cuenta de la otra empresa, esa empresa
// puso la plata: la otra le debe. Es el espejo del pago cruzado.
export function girosDePlataEnCuentaAjena(
  movimientos: ReadonlyArray<{
    refId: string;
    company: unknown; // la empresa del movimiento (de quien es el cobro o el gasto)
    cuentaCompany: unknown; // la empresa DUEÑA de la cuenta donde quedó la plata
    sentido: "entra" | "sale" | "pase";
    date: string;
    amount: number;
    detalle?: string;
    origen?: string;
    color?: string;
  }>
): IntercompanyTransfer[] {
  let n = 0;
  return movimientos
    .filter(
      (m) =>
        !!m.company &&
        !!m.cuentaCompany &&
        String(m.company) !== String(m.cuentaCompany) &&
        (m.sentido === "entra" || m.sentido === "sale") &&
        Number(m.amount) > 0
    )
    .map((m) => {
      // "entra": la plata quedó en la cuenta de la otra (from = la empresa del cobro, to = la de la cuenta).
      // "sale": la pagó la cuenta de la otra (from = la empresa de la cuenta, to = la del movimiento).
      const entra = m.sentido === "entra";
      n += 1;
      return {
        id: n,
        from: String(entra ? m.company : m.cuentaCompany),
        to: String(entra ? m.cuentaCompany : m.company),
        date: m.date,
        amount: Number(m.amount),
        text: `${entra ? "Cobro" : "Pago"} en la cuenta de la otra empresa${m.origen ? ` · ${m.origen}` : ""}${m.detalle ? ` · ${m.detalle}` : ""}`,
        declaresInvoice: false,
        administration: (m.color === "negro" ? "negro" : "blanco") as "blanco" | "negro",
        origen: "cuentaAjena" as const,
      };
    });
}

const DIAS_MISMO_GIRO = 5;
const diasEntre = (a: string, b: string) => Math.abs(Date.parse(`${a}T12:00:00Z`) - Date.parse(`${b}T12:00:00Z`)) / 86400000;

// Los giros de los pases mas los del extracto, sin contar dos veces el mismo: un debito del banco con igual sentido y monto,
// a pocos dias de un pase, es ese pase visto desde el banco. Cada pase tapa un solo debito.
export function unirGiros(dePases: IntercompanyTransfer[], delBanco: IntercompanyTransfer[]): IntercompanyTransfer[] {
  const libres = [...dePases];
  const soloBanco = delBanco.filter((b) => {
    const i = libres.findIndex((p) => p.from === b.from && p.to === b.to && Math.abs(p.amount - b.amount) < 0.01 && diasEntre(p.date, b.date) <= DIAS_MISMO_GIRO);
    if (i < 0) return true;
    libres.splice(i, 1);
    return false;
  });
  return [...dePases, ...soloBanco];
}

// CADA EJERCICIO ARRANCA EN CERO (Nicolas, 05/11/2026: "si tomamos la decision de cerrar el año todo queda guardado en el ejercicio
// anterior; si quiero consultar puedo hacerlo, pero este año arranca en cero"). Cada giro o factura va al ejercicio de la empresa
// que lo origino: lo posterior a su ultimo cierre es el corriente; lo de ese cierre, el anterior. Sin cierre, todo es corriente.
export function repartirPorEjercicio<T extends { from: string; date: string }>(
  items: T[],
  ultimoCierreDe: (company: string) => { startIso: string; endIso: string } | null
): { corriente: T[]; anterior: T[] } {
  const corriente: T[] = [];
  const anterior: T[] = [];
  items.forEach((x) => {
    const c = ultimoCierreDe(x.from);
    const d = String(x.date || "").slice(0, 10);
    if (!c || d > c.endIso) corriente.push(x);
    else if (d >= c.startIso) anterior.push(x);
  });
  return { corriente, anterior };
}

// COMO ESTAMOS entre cada par de empresas: lo que A giro y no se cruzo con una factura de B, contra lo de B hacia A.
export type PosicionEntreEmpresas = {
  deudor: string;
  acreedor: string;
  saldo: number;
  // El mismo saldo partido en blanco y negro, en la direccion del saldo (lo que el DEUDOR debe). Puede
  // dar negativo en una de las dos: le debe en blanco y le sobra en negro, por ejemplo.
  blanco: number;
  negro: number;
  facturado: number; // lo que ya se cruzo con facturas entre las dos (siempre blanco)
};

export function posicionEntreEmpresas(pairs: IntercompanyPair[]): PosicionEntreEmpresas[] {
  const out: PosicionEntreEmpresas[] = [];
  const vistos = new Set<string>();
  const r2 = (n: number) => Math.round(n * 100) / 100;
  pairs.forEach((p) => {
    if (vistos.has(`${p.from}>${p.to}`)) return;
    vistos.add(`${p.to}>${p.from}`);
    const vuelta = pairs.find((q) => q.from === p.to && q.to === p.from);
    const saldo = r2(p.pending - (vuelta?.pending || 0));
    // La factura cancela plata BLANCA: se descuenta de lo girado en blanco en esa direccion.
    const blanco = r2(p.blanco - p.invoiced - ((vuelta?.blanco || 0) - (vuelta?.invoiced || 0)));
    const negro = r2(p.negro - (vuelta?.negro || 0));
    const facturado = r2(p.invoiced + (vuelta?.invoiced || 0));
    if (Math.abs(saldo) < 0.01 && Math.abs(blanco) < 0.01 && Math.abs(negro) < 0.01) return;
    out.push(
      saldo > 0
        ? { deudor: p.to, acreedor: p.from, saldo, blanco, negro, facturado }
        : { deudor: p.from, acreedor: p.to, saldo: -saldo, blanco: -blanco, negro: -negro, facturado }
    );
  });
  return out;
}
