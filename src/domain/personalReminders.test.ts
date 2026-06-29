import { buildPersonalReminders } from "./personalReminders";

// "hoy" fijo para tests deterministicos: 2026-06-15.
const todayMs = new Date(2026, 5, 15).getTime();
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const emp = (over: any = {}) => ({
  name: over.name ?? "Juan",
  company: over.company ?? "BGA",
  provisionItems: over.provisionItems ?? [],
  documents: over.documents ?? [],
});

describe("buildPersonalReminders", () => {
  it("incluye provisiones vencidas y por vencer (<=30d), ignora lejanas", () => {
    const r = buildPersonalReminders(
      [
        emp({
          provisionItems: [
            { kind: "EPP", stockCode: "casco", dueDate: iso(2026, 6, 1) }, // vencido
            { kind: "Examenes", stockCode: "preocup", dueDate: iso(2026, 6, 20) }, // pronto
            { kind: "Insumos", stockCode: "guantes", dueDate: iso(2026, 12, 1) }, // lejano (ignorar)
          ],
        }),
      ],
      { todayMs }
    );
    expect(r).toHaveLength(2);
    expect(r[0].state).toBe("vencido");
    expect(r[0].label).toBe("EPP: casco");
  });

  it("documentos: faltante (sin adjunto), vencido y por vencer", () => {
    const r = buildPersonalReminders(
      [
        emp({
          documents: [
            { name: "ART", attachmentName: "", dueDate: "" }, // faltante
            { name: "Apto fisico", attachmentName: "apto.pdf", dueDate: iso(2026, 6, 5) }, // vencido
            { name: "Contrato", attachmentName: "c.pdf", dueDate: iso(2027, 1, 1) }, // vigente lejano
          ],
        }),
      ],
      { todayMs }
    );
    // faltante + vencido (el vigente lejano se ignora)
    expect(r).toHaveLength(2);
    expect(r.some((x) => x.state === "faltante" && x.label === "ART")).toBe(true);
    expect(r.some((x) => x.state === "vencido" && x.label === "Apto fisico")).toBe(true);
  });

  it("ordena: faltantes/vencidos primero, luego por dias restantes", () => {
    const r = buildPersonalReminders(
      [
        emp({
          documents: [{ name: "DNI", attachmentName: "", dueDate: "" }],
          provisionItems: [
            { kind: "EPP", stockCode: "a", dueDate: iso(2026, 6, 25) }, // +10d
            { kind: "EPP", stockCode: "b", dueDate: iso(2026, 6, 1) }, // vencido
          ],
        }),
      ],
      { todayMs }
    );
    expect(r[0].state).toBe("faltante");
    expect(r[r.length - 1].daysLeft).toBeGreaterThan(0); // el por-vencer queda ultimo
  });

  it("usa el resolutor de nombre de provision si se provee", () => {
    const r = buildPersonalReminders(
      [emp({ provisionItems: [{ kind: "EPP", stockCode: "casco", dueDate: iso(2026, 6, 1) }] })],
      { todayMs, resolveProvisionName: () => "Casco de seguridad" }
    );
    expect(r[0].label).toBe("EPP: Casco de seguridad");
  });
});
