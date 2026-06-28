import { getPettyCashAdministration, getFundSemaphore } from "./pettyCash";

describe("getPettyCashAdministration", () => {
  it("es 'blanco' si hay numero de factura", () => {
    expect(getPettyCashAdministration({ invoiceNumber: "0001-123", attachmentName: "" })).toBe("blanco");
  });
  it("es 'blanco' si hay adjunto aunque no haya factura", () => {
    expect(getPettyCashAdministration({ invoiceNumber: "", attachmentName: "ticket.pdf" })).toBe("blanco");
  });
  it("es 'negro' si no hay ni factura ni adjunto", () => {
    expect(getPettyCashAdministration({ invoiceNumber: "", attachmentName: "" })).toBe("negro");
  });
  it("ignora espacios en blanco", () => {
    expect(getPettyCashAdministration({ invoiceNumber: "   ", attachmentName: "  " })).toBe("negro");
  });
});

describe("getFundSemaphore", () => {
  it("rojo cuando el saldo esta agotado", () => {
    expect(getFundSemaphore(0, 1000).level).toBe("rojo");
    expect(getFundSemaphore(-50, 1000).level).toBe("rojo");
  });
  it("amarillo cuando el saldo es menor al 20% de lo asignado", () => {
    expect(getFundSemaphore(150, 1000).level).toBe("amarillo");
  });
  it("verde cuando hay saldo holgado", () => {
    expect(getFundSemaphore(800, 1000).level).toBe("verde");
  });
});
