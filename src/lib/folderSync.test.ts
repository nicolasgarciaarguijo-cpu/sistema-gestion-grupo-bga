import { classifyPath } from "./folderSync";

describe("classifyPath", () => {
  it("compras por mes", () => {
    expect(classifyPath("Compras/2026-03/factura.pdf")).toEqual({
      docType: "compras",
      month: "2026-03",
    });
  });

  it("acepta variantes de nombre (acentos/mayusculas)", () => {
    expect(classifyPath("Facturas emitidas/2026-01/A-347.pdf").docType).toBe("facturas-emitidas");
    expect(classifyPath("Documentación/2026-02/afip.pdf").docType).toBe("documentacion");
    expect(classifyPath("CAJA CHICA/2026-02/ticket.jpg").docType).toBe("caja-chica");
  });

  it("banco y cobranzas", () => {
    expect(classifyPath("Banco/2026-05/resumen.pdf").docType).toBe("banco");
    expect(classifyPath("Cobranzas/2026-05/recibo.pdf").docType).toBe("cobranzas");
  });

  it("personal: extrae empleado y subarea", () => {
    expect(classifyPath("Personal/Juan Perez/Documentacion/dni.pdf")).toEqual({
      docType: "personal",
      month: "",
      employee: "Juan Perez",
      subArea: "Documentacion",
    });
    expect(classifyPath("Personal/Ana Lopez/EPP/entrega.pdf")).toEqual({
      docType: "personal",
      month: "",
      employee: "Ana Lopez",
      subArea: "EPP",
    });
    expect(classifyPath("Personal/Ana Lopez/Recibos/2026-03/recibo.pdf")).toEqual({
      docType: "personal",
      month: "2026-03",
      employee: "Ana Lopez",
      subArea: "Recibos",
    });
  });

  it("carpeta desconocida = docType null", () => {
    expect(classifyPath("Otra cosa/archivo.pdf").docType).toBeNull();
  });

  it("sin mes = month vacio", () => {
    expect(classifyPath("Escalas/tabla.xlsx").month).toBe("");
  });

  it("acepta 'Escala salarial' (singular) en la raiz, sin mes", () => {
    expect(classifyPath("Escala salarial/UOM 2026-06.xlsx")).toEqual({
      docType: "escalas",
      month: "",
    });
  });
});
