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

  it("presupuestos y recibos (import/export)", () => {
    expect(classifyPath("Presupuestos/2026-06/3400.pdf").docType).toBe("presupuestos");
    expect(classifyPath("Recibos/2026-06/recibo-3389.pdf").docType).toBe("recibos");
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

  it("escalas dentro de Personal se clasifica como escalas (prioridad)", () => {
    expect(classifyPath("Personal/Escalas salariales/2026-06 a 09 Escala.pdf").docType).toBe("escalas");
    expect(classifyPath("Escalas/2026-06/x.pdf").docType).toBe("escalas");
  });

  it("subcarpetas de un trabajo: factura/pago/remito dejados por el usuario se ingresan", () => {
    // Trabajos aprobados / <cliente> / <N presup - proyecto> / <sub> / archivo
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Facturas/factura.pdf").docType
    ).toBe("facturas-emitidas");
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Pagos y tickets/ticket.jpg").docType
    ).toBe("recibos");
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Remitos/remito.pdf").docType
    ).toBe("remitos");
  });

  it("subcarpetas de un trabajo: los .html que genera el export NO se re-ingresan; planos van aparte", () => {
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Facturas/Factura A 1.html").docType
    ).toBeNull();
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Resumen del trabajo.html").docType
    ).toBeNull();
    // Planos se adjuntan al trabajo por su propio flujo, no como documento suelto.
    expect(
      classifyPath("Trabajos aprobados/Perez SA/P-1043 - Porton/Planos/plano.dwg").docType
    ).toBeNull();
  });

  it("facturacion y cobranzas por mes, y presentismo dentro de personal", () => {
    expect(classifyPath("Facturacion y cobranzas/2026-07/Resumen 2026-07.html").docType).toBe(
      "cobranzas"
    );
    expect(classifyPath("Facturas/2026/2026-07/Factura.pdf").docType).toBe("facturas-emitidas");
    expect(classifyPath("Personal/Ana Lopez/Presentismo/parte.pdf")).toEqual({
      docType: "personal",
      month: "",
      employee: "Ana Lopez",
      subArea: "Presentismo",
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

  // --- Estructura NUEVA: <carpeta>/<EMPRESA>/Ejercicio .../<AAAA-MM Mes>/... ---

  it("nueva: personal con empresa, ejercicio fiscal y mes con nombre", () => {
    expect(
      classifyPath(
        "Personal/DE RAIZ/MAXIMILIANO EZEQUIEL PACIFICO/Recibos/Ejercicio 2025-2026 (nov-oct)/2026-05 Mayo/2026-05_Sueldo.pdf"
      )
    ).toEqual({
      docType: "personal",
      company: "DE RAIZ",
      employee: "MAXIMILIANO EZEQUIEL PACIFICO",
      subArea: "Recibos",
      month: "2026-05",
    });
  });

  it("nueva: la documentacion cruda del empleado no tiene mes", () => {
    const r = classifyPath("Personal/BGA/JUAN PEREZ/Documentacion/contrato.pdf");
    expect(r.docType).toBe("personal");
    expect(r.company).toBe("BGA");
    expect(r.employee).toBe("JUAN PEREZ");
    expect(r.subArea).toBe("Documentacion");
    expect(r.month).toBe("");
  });

  it("nueva: detecta la empresa y el mes con nombre en otras carpetas", () => {
    const r = classifyPath("Compras/DE RAIZ/Ejercicio 2025-2026 (nov-oct)/2026-03 Marzo/factura.pdf");
    expect(r.docType).toBe("compras");
    expect(r.company).toBe("DE RAIZ");
    expect(r.month).toBe("2026-03");
  });

  it("nueva: GENERAL (la conjunta) se reconoce como empresa", () => {
    expect(classifyPath("Compras/General/Ejercicio 2025-2026 (nov-oct)/2026-03 Marzo/x.pdf").company).toBe("GENERAL");
  });

  it("nueva: la escala salarial va suelta POR EMPRESA (fuera de los empleados) y trae la empresa", () => {
    // La escala se carga aparte para tener los valores reales de calculo: no es de un empleado.
    // De Raíz se rige por convenio; BGA por acuerdo entre partes, pero puede cargar la suya.
    const r = classifyPath(
      "Personal/DE RAIZ/ESCALAS SALARIALES/Ejercicio 2025-2026 (nov-oct)/2026-06 a 09 Escala.pdf"
    );
    expect(r.docType).toBe("escalas");
    expect(r.company).toBe("DE RAIZ");
    expect(classifyPath("Personal/BGA/ESCALAS SALARIALES/UOM 2026.pdf").company).toBe("BGA");
  });

  it("la estructura VIEJA (sin empresa) sigue funcionando", () => {
    const r = classifyPath("Personal/ADALBERTO SORIA/Recibos/2026-05/recibo.pdf");
    expect(r.docType).toBe("personal");
    expect(r.employee).toBe("ADALBERTO SORIA");
    expect(r.subArea).toBe("Recibos");
    expect(r.month).toBe("2026-05");
    expect(r.company).toBeUndefined();
  });
});
