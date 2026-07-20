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
