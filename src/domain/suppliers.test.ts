import {
  findSupplierInText,
  normalizeText,
  reconcilePayment,
  reconcilePayments,
  supplierSearchTerms,
} from "./suppliers";
import type { CostEntry, Supplier } from "./types";

const prov = (over: Partial<Supplier> = {}): Supplier => ({
  id: 1,
  company: "General",
  name: "DAC Maderas S.A.",
  taxId: "30-71234567-9",
  aliases: "DAC MADERAS, DACMAD",
  active: true,
  notes: "",
  ...over,
});

const pago = (over: Partial<CostEntry> = {}): CostEntry => ({
  id: 100,
  company: "De raiz s.r.l" as any,
  date: "2026-06-10",
  group: "Materiales",
  description: "Pago proveedor",
  amount: 150000,
  administration: "blanco",
  source: "manual",
  supplier: "DAC Maderas S.A.",
  notes: "",
  origin: "banco",
  ...over,
});

describe("normalizeText", () => {
  it("ignora acentos, puntuacion y mayusculas", () => {
    expect(normalizeText("De Raíz S.R.L.")).toBe("de raiz s r l");
    expect(normalizeText("DAC  MADERAS")).toBe("dac maderas");
  });
});

describe("supplierSearchTerms", () => {
  it("descarta terminos cortos que darian falsos positivos", () => {
    const terms = supplierSearchTerms(prov({ name: "SA", aliases: "AB, FERRETERIA CENTRO" }));
    expect(terms).toEqual(["ferreteria centro"]);
  });
});

describe("findSupplierInText", () => {
  const suppliers = [
    prov(),
    prov({ id: 2, name: "Ferreteria Centro", taxId: "20-11111111-1", aliases: "" }),
  ];

  it("matchea por CUIT aunque el nombre no aparezca", () => {
    const r = findSupplierInText("PAGO PROVEEDORES 30712345679 REF 998", suppliers);
    expect(r?.id).toBe(1);
  });

  it("matchea por alias tal como lo escribe el banco", () => {
    expect(findSupplierInText("TRANSFERENCIA A DACMAD", suppliers)?.id).toBe(1);
  });

  it("gana el termino mas especifico, no el primero que aparece", () => {
    const conGenerico = [prov({ id: 3, name: "Centro", aliases: "" }), suppliers[1]];
    expect(findSupplierInText("PAGO A FERRETERIA CENTRO", conGenerico)?.id).toBe(2);
  });

  it("no inventa un proveedor si no hay coincidencia", () => {
    expect(findSupplierInText("IMP.DB/CR BANCARIOS", suppliers)).toBeNull();
  });

  it("ignora los proveedores dados de baja", () => {
    expect(findSupplierInText("TRANSFERENCIA A DACMAD", [prov({ active: false })])).toBeNull();
  });
});

describe("reconcilePayment", () => {
  const debitos = [
    { id: 1, date: "2026-06-12", amount: 150000, concept: "PAGO A DAC MADERAS" },
    { id: 2, date: "2026-06-12", amount: 999, concept: "COMISION" },
  ];

  it("concilia aunque el banco debite un par de dias despues", () => {
    const r = reconcilePayment(pago(), debitos);
    expect(r.status).toBe("conciliado");
    expect(r.bankEntryId).toBe(1);
    expect(r.diff).toBe(0);
  });

  it("avisa cuando el pago deberia estar en el banco y no esta", () => {
    const r = reconcilePayment(pago({ amount: 777777 }), debitos);
    expect(r.status).toBe("sin_movimiento");
  });

  it("no exige movimiento bancario si se pago en efectivo o en negro", () => {
    expect(reconcilePayment(pago({ origin: "efectivo" }), debitos).status).toBe("no_aplica");
    expect(reconcilePayment(pago({ administration: "negro" }), debitos).status).toBe("no_aplica");
  });

  it("respeta la vinculacion hecha a mano", () => {
    const r = reconcilePayment(pago({ amount: 140000, bankEntryId: 1 }), debitos);
    expect(r.status).toBe("conciliado");
    expect(r.bankEntryId).toBe(1);
    expect(r.diff).toBe(-10000);
    expect(r.detail).toMatch(/no coincide/);
  });

  it("no concilia contra un movimiento de otra fecha lejana", () => {
    const lejos = [{ id: 9, date: "2026-08-01", amount: 150000, concept: "PAGO" }];
    expect(reconcilePayment(pago(), lejos).status).toBe("sin_movimiento");
  });
});

describe("reconcilePayments", () => {
  it("un mismo debito no puede tapar dos pagos distintos", () => {
    const debitos = [{ id: 1, date: "2026-06-10", amount: 150000, concept: "PAGO" }];
    const r = reconcilePayments([pago({ id: 1 }), pago({ id: 2 })], debitos);
    expect(r.conciliados).toBe(1);
    expect(r.sinMovimiento).toBe(1);
    expect(r.montoSinMovimiento).toBe(150000);
  });

  it("los vinculados a mano reservan su movimiento antes que los automaticos", () => {
    const debitos = [{ id: 7, date: "2026-06-10", amount: 150000, concept: "PAGO" }];
    const r = reconcilePayments([pago({ id: 1 }), pago({ id: 2, bankEntryId: 7 })], debitos);
    const porPago = new Map(r.matches.map((m) => [m.paymentId, m]));
    expect(porPago.get(2)?.status).toBe("conciliado");
    expect(porPago.get(1)?.status).toBe("sin_movimiento");
  });

  it("devuelve los resultados en el orden en que entraron los pagos", () => {
    const r = reconcilePayments([pago({ id: 5 }), pago({ id: 3 })], []);
    expect(r.matches.map((m) => m.paymentId)).toEqual([5, 3]);
  });
});
