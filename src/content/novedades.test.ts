import { novedadesPendientes, ultimaNovedad, type TandaNovedades } from "./novedades";

const T: TandaNovedades[] = [
  { id: "2026-10-20", fecha: "", titulo: "B", items: [{ titulo: "x", que: "", como: "", tab: "compras" }] },
  { id: "2026-10-14", fecha: "", titulo: "A", items: [{ titulo: "y", que: "", como: "" }, { titulo: "z", que: "", como: "", tab: "personal" }] },
];

describe("novedades", () => {
  it("muestra solo lo no visto y de las solapas que la persona puede ver", () => {
    const soloPersonal = (tab?: string) => !tab || tab === "personal";
    expect(novedadesPendientes("", soloPersonal, T).map((t) => t.id)).toEqual(["2026-10-14"]);
    expect(novedadesPendientes("2026-10-14", () => true, T).map((t) => t.id)).toEqual(["2026-10-20"]);
    expect(novedadesPendientes("2026-10-20", () => true, T)).toEqual([]);
    expect(ultimaNovedad(T)).toBe("2026-10-20");
  });
});
