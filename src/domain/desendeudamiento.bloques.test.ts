import { bloqueDeDeuda, comprasDeConvenios, facturasEnConvenio, pagosDeCuotas } from "./desendeudamiento";

const base = { nextDueDate: "", remainingInstallments: 0, nextInstallmentAmount: 0, active: true, company: "BGA" };

describe("desendeudamiento · prestamos y cuentas corrientes", () => {
  it("los prestamos se reconocen por tipo o por nombre; el resto es cuenta corriente", () => {
    expect(bloqueDeDeuda({ concept: "Préstamo Banco Galicia" })).toBe("prestamo");
    expect(bloqueDeDeuda({ concept: "Equipo", tipo: "prestamo" })).toBe("prestamo");
    expect(bloqueDeDeuda({ concept: "Plan AFIP", tipo: "plan_pago" })).toBe("cuenta_corriente");
    expect(bloqueDeDeuda({ concept: "Préstamo", bloque: "cuenta_corriente" })).toBe("cuenta_corriente");
  });

  it("pagos de cuotas y facturas en convenio", () => {
    const deudas = [
      { ...base, id: 1, concept: "Préstamo", cuotas: [{ id: "a", numero: 1, fecha: "2026-10-01", monto: 10, pagoCostEntryId: 77 }] },
      { ...base, id: 2, concept: "DAC convenio", facturaIds: [5, 6], cuotas: [] },
    ];
    expect(pagosDeCuotas(deudas).get(77)?.id).toBe(1);
    expect(Array.from(facturasEnConvenio(deudas).keys())).toEqual([5, 6]);
  });

  it("el convenio sin facturas es una compra en la cuenta corriente del acreedor", () => {
    const deudas = [
      {
        ...base, id: 3, concept: "Plan de pago", acreedor: "AFIP", fechaInicio: "2026-09-01",
        cuotas: [
          { id: "a", numero: 1, fecha: "2026-10-10", monto: 100, pagoCostEntryId: 9 },
          { id: "b", numero: 2, fecha: "2026-11-10", monto: 100 },
        ],
      },
      { ...base, id: 4, concept: "Préstamo banco", cuotas: [{ id: "a", numero: 1, fecha: "2026-10-10", monto: 50 }] },
    ];
    expect(comprasDeConvenios(deudas as any, "2026-10-23")).toEqual([
      { deudaId: 3, company: "BGA", acreedor: "AFIP", fecha: "2026-09-01", total: 200, detalle: "Convenio · Plan de pago (2 cuotas)", saldada: false, ultimoPagoId: 9 },
    ]);
  });
});
