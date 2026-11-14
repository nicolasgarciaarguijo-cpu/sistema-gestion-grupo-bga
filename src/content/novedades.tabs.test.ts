import fs from "fs";
import path from "path";
import { NOVEDADES } from "./novedades";

// 14/11/2026: una novedad con una solapa que NO existe no la ve NADIE que no sea admin
// (App.puedeVerNovedad pide que la clave esté entre las solapas permitidas, y los permisos salen de la
// tabla app_tabs, que tiene las mismas claves que TAB_OPTIONS). Habían quedado tres novedades con las
// claves inventadas "tarjetas", "balance" y "movimientos-internos": Nicolás las veía por ser admin y
// Lucas y Joaquín no. Este test no deja que vuelva a pasar.
const solapasDelSistema = (): string[] => {
  const app = fs.readFileSync(path.join(__dirname, "..", "App.tsx"), "utf8");
  const ini = app.indexOf("const TAB_OPTIONS");
  const fin = app.indexOf("];", ini);
  expect(ini).toBeGreaterThan(0);
  return Array.from(app.slice(ini, fin).matchAll(/key:\s*"([^"]+)"/g)).map((m) => m[1]);
};

describe("las novedades apuntan a solapas que existen", () => {
  it("cada tab de una novedad es una solapa del sistema", () => {
    const solapas = solapasDelSistema();
    expect(solapas.length).toBeGreaterThan(10);
    const malas = NOVEDADES.flatMap((t) =>
      t.items.filter((i) => i.tab && !solapas.includes(i.tab)).map((i) => `${t.id}: ${i.tab} (${i.titulo})`)
    );
    expect(malas).toEqual([]);
  });

  it("no hay dos tandas con el mismo id", () => {
    const ids = NOVEDADES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
