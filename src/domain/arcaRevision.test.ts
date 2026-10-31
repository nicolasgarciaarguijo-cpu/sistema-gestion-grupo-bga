import { proveedorDeArca, accionPorDefecto, faltaDecidir, sugerenciaDe, type ProveedorR, type RenglonRevision } from "./arcaRevision";

const proveedores: ProveedorR[] = [
  { id: 1, name: "D A C Distribuidora Argentina", taxId: "30-11111111-1", grupoCosto: "variable|Materiales", currentAccount: true },
  { id: 2, name: "Herrajes Magliola SA", taxId: "" },
  { id: 3, name: "Lacapol", taxId: "30-22222222-2" },
  { id: 4, name: "Lacapol Norte", taxId: "30-33333333-3" },
];

describe("revision del listado de ARCA", () => {
  it("reconoce por CUIT y sugiere donde va", () => {
    const p = proveedorDeArca("DAC DISTRIBUIDORA", "30111111111", proveedores);
    expect(p).toEqual(expect.objectContaining({ estado: "reconocido", por: "cuit" }));
    expect(sugerenciaDe(p, (k) => String(k).split("|")[1])).toBe("va a D A C Distribuidora Argentina (cuenta corriente) · Materiales");
  });

  it("sin CUIT en el sistema reconoce por nombre (y se le completa el CUIT)", () => {
    const p = proveedorDeArca("HERRAJES MAGLIOLA S A", "30444444444", proveedores);
    expect(p).toEqual(expect.objectContaining({ estado: "reconocido", por: "nombre" }));
  });

  it("proveedor nuevo con nombres parecidos: no decide solo, para no duplicar", () => {
    const p = proveedorDeArca("LACAPOL SRL", "30999999999", proveedores);
    expect(p.estado).toBe("nuevo");
    expect(p.estado === "nuevo" && p.parecidos.map((x) => x.id)).toEqual([3, 4]);
    const r = { direccion: "recibidas" as const, proveedor: p, duplicadaDe: null };
    const acc = accionPorDefecto(r);
    expect(acc.cargar).toBe(false);
    expect(faltaDecidir({ ...(r as any), esNotaCredito: false, cargar: true, accionProveedor: acc.accionProveedor } as RenglonRevision)).toBe(true);
  });

  it("proveedor nuevo sin parecidos: se propone el alta; una duplicada no se carga", () => {
    expect(accionPorDefecto({ direccion: "recibidas", proveedor: proveedorDeArca("ZZZ SA", "30555555555", proveedores), duplicadaDe: null })).toEqual({ cargar: true, accionProveedor: { tipo: "alta" } });
    expect(accionPorDefecto({ direccion: "recibidas", proveedor: proveedorDeArca("DAC", "30111111111", proveedores), duplicadaDe: { id: 9, texto: "" } }).cargar).toBe(false);
  });
});
