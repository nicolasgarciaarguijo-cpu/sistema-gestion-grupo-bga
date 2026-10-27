import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReciboBlancoDocument } from "./ReciboDocuments";

// Fuera de convenio (Nicolas, 2026-10-27): el recibo blanco tiene que mostrar el sueldo acordado, si no la grilla no
// cierra con el neto.
const recibo = (summary: Record<string, number>) =>
  renderToStaticMarkup(
    <ReciboBlancoDocument
      employee={{ name: "Socia", legajo: "1", cuil: "", category: "Socio gerente", seniorityYears: 0 }}
      company={{ name: "De Raíz", taxId: "30-1" }}
      summary={summary}
      config={{ unionPct: 0, insurancePct: 0 }}
      monthKey="2026-10"
    />
  );

describe("recibo blanco fuera de convenio", () => {
  it("sin cargas: renglón 'sin aportes' y los anticipos", () => {
    const html = recibo({ agreedWhiteFlat: 800000, anticipos: 50000, net: 750000 });
    expect(html).toContain("SUELDO ACORDADO SIN APORTES");
    expect(html).toContain("ANTICIPOS");
    expect(html).toContain("Sin aportes");
  });

  it("con cargas: renglón de sueldo acordado en el remunerativo", () => {
    const html = recibo({ agreedWhiteCharged: 800000, grossRem: 800000, totalGross: 800000, net: 640000 });
    expect(html).toContain("SUELDO ACORDADO");
    expect(html).not.toContain("SIN APORTES");
    expect(html).not.toContain("Sin aportes");
  });
});
