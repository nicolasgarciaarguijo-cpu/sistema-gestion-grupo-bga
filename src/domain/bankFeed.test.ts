import { alimentaElCalendario, MARCA_SOLO_CONSTATA } from "./bankFeed";

describe("el banco constata, no carga", () => {
  it("lo ya cargado (sin marca) sigue alimentando el calendario", () => {
    expect(alimentaElCalendario({})).toBe(true);
    expect(alimentaElCalendario({ soloConstata: false })).toBe(true);
  });

  it("lo que entra de ahora en más solo constata", () => {
    expect(alimentaElCalendario(MARCA_SOLO_CONSTATA)).toBe(false);
    expect(alimentaElCalendario({ soloConstata: true })).toBe(false);
  });

  it("sin movimiento no hay nada que alimentar", () => {
    expect(alimentaElCalendario(undefined)).toBe(false);
    expect(alimentaElCalendario(null)).toBe(false);
  });
});
