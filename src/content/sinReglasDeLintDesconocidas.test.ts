import fs from "fs";
import path from "path";

// Entre el 17 y el 18/11/2026 NUEVE publicaciones seguidas fallaron en Vercel y nadie se entero: el sistema
// siguio mostrando la version vieja mientras creiamos que lo nuevo estaba subido. La causa: un comentario
// `eslint-disable... react-hooks/exhaustive-deps` en dos archivos. El build de Vercel no tiene esa regla, y un
// comentario que nombra una regla que no existe corta la compilacion ("Definition for rule ... was not found").
// Este test falla ACA, antes de subir, si alguien vuelve a escribirlo.
const archivos = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return archivos(p);
    return /\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name) ? [p] : [];
  });

describe("el codigo no nombra reglas de lint que Vercel no tiene", () => {
  it("ningun archivo desactiva react-hooks/exhaustive-deps", () => {
    const src = path.join(__dirname, "..");
    const culpables = archivos(src).filter((f) => /eslint-disable[^\n]*react-hooks\//.test(fs.readFileSync(f, "utf8")));
    expect(culpables.map((f) => path.relative(src, f))).toEqual([]);
  });
});
