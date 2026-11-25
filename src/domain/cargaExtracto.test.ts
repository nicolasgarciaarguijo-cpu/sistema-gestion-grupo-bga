import { ordenCronologico, prepararCargaDeExtracto, type ExistenteDelExtracto, type LeidoDelExtracto } from "./cargaExtracto";
import { fichasDeExtracto } from "./fichaExtracto";
import { detectSeparator, rowsToStatementEntries } from "../lib/bankStatement";

// Nicolas, 25/11/2026: "necesito que me cargue la informacion que me cargaste cuando te comparti los extractos. La idea es
// poder, si quiero, cargarlos a diario para mantener el linkeo a diario y que reconozca los impuestos, comisiones y tasas".
const m = (date: string, concept: string, amount: number, movementType: "credito" | "debito", balance: number): LeidoDelExtracto => ({ date, concept, amount, movementType, balance });
// Como lo exporta el banco: del mas nuevo al mas viejo.
const archivo = [
  m("2026-11-17", "Impuesto ley 25.413 debito 0,6%", 6, "debito", 1394),
  m("2026-11-17", "Transferencia a proveedor", 1000, "debito", 1400),
  m("2026-11-16", "Impuesto ley 25.413 debito 0,6%", 6, "debito", 2400),
  m("2026-11-16", "Impuesto ley 25.413 debito 0,6%", 6, "debito", 2406),
  m("2026-11-16", "CREDITO POR TRANSFERENCIA", 1412, "credito", 2412),
];
const base = { company: "BGA", bank: "Santander", currency: "ARS" as const };
const yaCargado = (x: LeidoDelExtracto): ExistenteDelExtracto => ({ ...x, ...base });

describe("carga del extracto desde la app", () => {
  it("da vuelta el archivo: queda del más viejo al más nuevo", () => {
    expect(ordenCronologico(archivo).map((x) => x.balance)).toEqual([2412, 2406, 2400, 1400, 1394]);
    expect(ordenCronologico(archivo.slice().reverse()).map((x) => x.balance)).toEqual([2412, 2406, 2400, 1400, 1394]);
  });

  it("dos impuestos iguales del mismo día son dos movimientos, no uno repetido", () => {
    const r = prepararCargaDeExtracto({ leidos: archivo, existentes: [], ...base });
    expect(r.nuevos).toHaveLength(5);
    expect(r.repetidos).toBe(0);
  });

  it("reconoce los impuestos y comisiones y los deja marcados", () => {
    const r = prepararCargaDeExtracto({ leidos: archivo, existentes: [], ...base });
    expect(r.cargos).toEqual({ cantidad: 3, total: 18 });
    expect(r.nuevos.filter((x) => x.conceptKey).length).toBe(3);
    expect(r.nuevos.find((x) => x.concept === "Transferencia a proveedor")!.conceptKey).toBeUndefined();
  });

  it("cargar a diario: lo que ya estaba no se repite y lo nuevo encadena con el saldo anterior", () => {
    const ayer = prepararCargaDeExtracto({ leidos: archivo.slice(2), existentes: [], ...base });
    const existentes = ayer.nuevos.map(yaCargado);
    const hoy = prepararCargaDeExtracto({ leidos: archivo, existentes, ...base });
    expect(hoy.repetidos).toBe(3);
    expect(hoy.nuevos.map((x) => x.balance)).toEqual([1400, 1394]);
    expect(hoy.encadena).toBe(true);
    expect(hoy.mes).toBe("2026-11");
    // Agregado al final, la ficha arma la cadena de saldos sin cortes.
    const todos = [...existentes, ...hoy.nuevos.map(yaCargado)].map((x, i) => ({ ...x, id: i + 1 }));
    expect(fichasDeExtracto(todos as any, [], [])[0].cadenaCierra).toBe(true);
  });

  it("avisa cuando entre lo cargado y lo nuevo falta un tramo", () => {
    const existentes = [yaCargado(m("2026-11-10", "CREDITO", 500, "credito", 500))];
    expect(prepararCargaDeExtracto({ leidos: archivo, existentes, ...base }).encadena).toBe(false);
    expect(prepararCargaDeExtracto({ leidos: archivo, existentes: [], ...base }).encadena).toBeNull();
  });

  it("no mezcla cuentas: lo de otro banco u otra empresa no cuenta como repetido", () => {
    const otraEmpresa = archivo.map((x) => ({ ...x, company: "De Raiz", bank: "Santander", currency: "ARS" }));
    expect(prepararCargaDeExtracto({ leidos: archivo, existentes: otraEmpresa, ...base }).repetidos).toBe(0);
  });
});

describe("lectura del archivo del banco", () => {
  it("el .xls de Santander es texto separado por tabs aunque tenga comas en los importes", () => {
    const texto = "Últimos movimientos\nCuenta 123\n\nFecha\tSucursal\tConcepto\tImporte\tSaldo\n24/11/2026\t000\tImpuesto ley 25.413\t-18.758,00\t140.568,21\n";
    expect(detectSeparator(texto)).toBe("\t");
  });

  it("Patagonia: la referencia se suma a la descripción para reconocer el movimiento", () => {
    const rows = [
      ["Fecha", "Descripción", "Referencia", "Débitos", "Créditos", "Saldo"],
      ["11/11/2026", "TARJETA CREDITO VISA", "0001108711683", "237.990,80", "", "35.919,57"],
    ];
    expect(rowsToStatementEntries(rows)[0].concept).toBe("TARJETA CREDITO VISA 0001108711683");
  });

  it("el concepto queda sin espacios de más", () => {
    const rows = [
      ["Fecha", "Concepto", "Importe", "Saldo"],
      ["24/11/2026", "Impuesto   ley 25.413    debito", "-18,00", "100,00"],
    ];
    expect(rowsToStatementEntries(rows)[0].concept).toBe("Impuesto ley 25.413 debito");
  });
});
