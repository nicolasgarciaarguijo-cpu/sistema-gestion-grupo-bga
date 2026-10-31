import { controlarResumen, cuotasEsperadas } from "./controlTarjetas";
import { impuestosDeExtractos, impuestosDeResumenes } from "./impuestosBancarios";

const resumenes = [
  { id: 10, company: "BGA", cardId: 1, closingDate: "2026-09-25", dueDate: "2026-10-06", totalArs: 0 },
  { id: 11, company: "BGA", cardId: 1, closingDate: "2026-10-25", dueDate: "2026-11-05", totalArs: 0 },
];

describe("impuestos del extracto y del resumen", () => {
  it("junta impuestos, comisiones e intereses por banco y mes (por renglon o por texto)", () => {
    const g = impuestosDeExtractos([
      { id: 1, company: "BGA", bank: "Galicia", date: "2026-10-03", movementType: "debito", concept: "IMP LEY 25413", amount: 1000, conceptKey: "b_imp_debitos" },
      { id: 2, company: "BGA", bank: "Galicia", date: "2026-10-15", movementType: "debito", concept: "COMISION MANT. CUENTA", amount: 500 },
      { id: 3, company: "BGA", bank: "Galicia", date: "2026-10-16", movementType: "debito", concept: "TRANSF A DAC", amount: 90000, conceptKey: "prov:x" },
      { id: 4, company: "BGA", bank: "Galicia", date: "2026-10-20", movementType: "credito", concept: "IMP devolucion", amount: 10 },
      { id: 5, company: "BGA", bank: "Santander", date: "2026-10-04", movementType: "debito", concept: "PERCEPCION IIBB", amount: 300 },
    ]);
    expect(g.map((x) => [x.titulo, x.total, x.fecha])).toEqual([
      ["Comisiones, tasas e intereses (cuenta) · Galicia · octubre 2026", 1500, "2026-10-15"],
      ["Comisiones, tasas e intereses (cuenta) · Santander · octubre 2026", 300, "2026-10-04"],
    ]);
    expect(g[0].porCategoria).toEqual({ impuestos: 1000, comisiones: 500, intereses: 0 });
  });

  it("los cargos del resumen de tarjeta, con el vencimiento", () => {
    const g = impuestosDeResumenes(
      [resumenes[1]],
      [
        { id: 1, company: "BGA", cardId: 1, statementId: 11, date: "2026-10-20", description: "IMPUESTO DE SELLOS", amount: 120, currency: "ARS" },
        { id: 2, company: "BGA", cardId: 1, statementId: 11, date: "2026-10-12", description: "MERCADOLIBRE", amount: 5000, currency: "ARS" },
      ],
      [{ id: 1, name: "Visa Santander", bank: "Santander" }]
    );
    expect(g).toHaveLength(1);
    expect(g[0]).toMatchObject({ total: 120, fecha: "2026-11-05", banco: "Santander", titulo: "Comisiones, tasas e intereses (tarjeta) · Visa Santander · octubre 2026" });
  });
});

describe("control del resumen de tarjeta", () => {
  const compras = [
    { id: 100, company: "BGA", tarjetaId: 1, date: "2026-09-10", amount: 3000, cuotas: 3, description: "Herrajes", supplier: "Ferreteria" },
    { id: 101, company: "BGA", tarjetaId: 1, date: "2026-10-12", amount: 5000, description: "Compra", supplier: "MercadoLibre" },
    { id: 102, company: "BGA", tarjetaId: 1, date: "2026-10-14", amount: 700, description: "Sin aparecer", supplier: "X" },
  ];

  it("cada cuota cae en su resumen y se paga el dia del vencimiento", () => {
    const q = cuotasEsperadas(compras, resumenes);
    const herrajes = q.filter((x) => x.compraId === 100);
    expect(herrajes.map((x) => [x.cuota, x.monto, x.statementId, x.dueDate])).toEqual([
      [1, 1000, 10, "2026-10-06"],
      [2, 1000, 11, "2026-11-05"],
      [3, 1000, null, null], // todavia no hay resumen: queda en la tarjeta
    ]);
  });

  it("tilda lo que esta, marca lo que falta en el sistema y lo cargado que no aparece", () => {
    const q = cuotasEsperadas(compras, resumenes);
    const c = controlarResumen(
      { ...resumenes[1], totalArs: 6120 },
      [
        { id: 1, cardId: 1, statementId: 11, date: "2026-09-10", description: "FERRETERIA C.02/03", amount: 1000, currency: "ARS" },
        { id: 2, cardId: 1, statementId: 11, date: "2026-10-12", description: "MERCADOLIBRE", amount: 5000, currency: "ARS" },
        { id: 3, cardId: 1, statementId: 11, date: "2026-10-18", description: "NETFLIX", amount: 0, currency: "ARS" },
        { id: 4, cardId: 1, statementId: 11, date: "2026-10-20", description: "IMPUESTO DE SELLOS", amount: 120, currency: "ARS" },
      ],
      q
    );
    expect(c.renglones.map((r) => r.estado)).toEqual(["ok", "ok", "falta", "cargo"]);
    expect(c.noAparecen.map((x) => x.compraId)).toEqual([102]);
    expect(c.totalSistema).toBe(6820);
    expect(c.cierra).toBe(false);
  });
});
