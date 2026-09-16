// EL BOTON DEL RESUMEN DE MATERIALES TIENE QUE ESTAR EN PANTALLA. Pedido de Nicolas (2026-09-15):
// ver los materiales cotizados por subpresupuesto desde el detalle, y poder exportarlos para
// pasarselos a alguien. Se verifica dibujando la solapa de verdad: que el boton exista, que la
// lista salga con cantidad y descripcion, y que el export se dispare con el trabajo abierto.
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

import { AprobadosTab } from "./Aprobados";

const job = {
  id: 1,
  budgetId: 1,
  budgetNumber: "0001-00000123",
  revisionNumber: 1,
  isUpdate: false,
  company: "De raiz s.r.l",
  client: "CLIENTE SA",
  project: "PROYECTO X",
  executionStatus: "en_curso",
  approvalDate: "2026-09-01",
  startDate: "2026-09-02",
  deliveryDate: "2026-10-01",
  billedPct: 100,
  soldNetPrice: 1000,
  workFiles: [],
  invoices: [],
  payments: [],
  retentions: [],
  additionals: [],
  discounts: [],
  commissionPayments: [],
  snapshot: {
    budget: {},
    subBudgets: [
      {
        title: "Mesa",
        notes: "roble",
        materials: [{ description: "Tabla roble", qty: 4, unit: "m2", unitPrice: 123456 }],
        basicSupplies: [],
      },
      {
        title: "Puerta",
        quantity: 3,
        materials: [{ description: "Bisagra", qty: 2, unit: "u", unitPrice: 7777 }],
        basicSupplies: [],
      },
    ],
    materials: [],
    basicSupplies: [],
  },
};

const onMaterialsSummary = jest.fn();

const props = {
  jobSemaphoreSummary: { verde: 0, amarillo: 0, rojo: 0 },
  approvedJobsSummary: [job],
  companyApprovedSections: [],
  approvedJobsTimelineRows: [],
  selectedApprovedJobId: job.id,
  selectedApprovedJob: job,
  getCompanyMeta: () => ({ short: "DR", primary: "#7c4a21" }),
  companyOptions: [{ value: "De raiz s.r.l", short: "DR" }],
  getApprovedJobSourceLabel: () => "Presupuesto",
  getJobSemaphore: () => ({ level: "verde", label: "ok" }),
  issuedInvoices: [],
  today: "2026-09-15",
  canEmitFacturas: false,
  onMaterialsSummary,
};

const funcion = () => jest.fn();
const todasLasAcciones = {
  setSelectedApprovedJobId: funcion(),
  createDirectApprovedJob: funcion(),
  importLegacyApprovedJobs: funcion(),
  exportPrint: funcion(),
  updateApprovedJob: funcion(),
  updateIssuedInvoice: funcion(),
  loadBudgetFromSnapshot: funcion(),
  uploadApprovedJobWorkFiles: funcion(),
  removeApprovedJobWorkFile: funcion(),
  confirmApprovedJobPlanos: funcion(),
  addInvoice: funcion(),
  removeInvoice: funcion(),
  emitInvoiceAfip: funcion(),
  updateInvoice: funcion(),
  addPayment: funcion(),
  removePayment: funcion(),
  updatePayment: funcion(),
  addAdditional: funcion(),
  removeAdditional: funcion(),
  updateAdditional: funcion(),
  addDiscount: funcion(),
  removeDiscount: funcion(),
  updateDiscount: funcion(),
  addCommissionPayment: funcion(),
  removeCommissionPayment: funcion(),
  updateCommissionPayment: funcion(),
  addRetention: funcion(),
  removeRetention: funcion(),
  updateRetention: funcion(),
  uploadApprovedJobFile: funcion(),
  exportPaymentReceipt: funcion(),
  onClientSummary: funcion(),
};

let host: HTMLElement;
let root: ReturnType<typeof createRoot>;
const render = () => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => {
    root.render(<AprobadosTab {...({ ...props, ...todasLasAcciones } as any)} />);
  });
  return host;
};
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  jest.clearAllMocks();
});

const boton = (texto: string) =>
  Array.from(host.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto);

describe("resumen de materiales en el detalle del trabajo", () => {
  it("el boton esta en pantalla con el trabajo abierto", () => {
    render();
    expect(boton("Resumen de materiales")).toBeTruthy();
  });

  it("al abrirlo lista los materiales por subpresupuesto, con la cantidad escalada", () => {
    render();
    act(() => { boton("Resumen de materiales")!.click(); });
    const texto = host.textContent || "";
    expect(texto).toContain("Resumen de materiales cotizados");
    expect(texto).toContain("Tabla roble");
    expect(texto).toContain("Bisagra");
    expect(texto).toContain("Total del trabajo");
    expect(texto).toContain("(2 c/u)"); // 2 por unidad x 3 unidades = 6
    expect(texto).not.toContain("123.456"); // sin precios
    expect(boton("Ocultar materiales")).toBeTruthy();
  });

  // El boton de exportar se ve SIN tener que abrir el panel: escondido adentro no se encontraba.
  it("exporta desde la barra del detalle, con el resumen cerrado", () => {
    render();
    const exportar = boton("Exportar materiales (PDF)");
    expect(exportar).toBeTruthy();
    act(() => { exportar!.click(); });
    expect(onMaterialsSummary).toHaveBeenCalledWith(expect.objectContaining({ id: job.id }));
  });

  it("y tambien desde adentro del resumen abierto", () => {
    render();
    expect(boton("Exportar PDF")).toBeFalsy();
    act(() => { boton("Resumen de materiales")!.click(); });
    const exportar = boton("Exportar PDF");
    expect(exportar).toBeTruthy();
    act(() => { exportar!.click(); });
    expect(onMaterialsSummary).toHaveBeenCalledWith(expect.objectContaining({ id: job.id }));
  });
});
