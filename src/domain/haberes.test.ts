import { haberesDelMes, idHaberBlanco, leerIdHaber, sacarHaberesDuplicados } from "./haberes";
import { bloquesDeRecibos, leerBloqueRecibo, leerReciboDeEmpleado } from "./reciboOficial";

describe("haberesDelMes (que monto manda)", () => {
  const base = { fechaPorDefecto: "2026-10-06", netoLiquidado: 900000, negroAcordado: 200000 };
  it("sin nada cargado: blanco = neto liquidado, negro = acordado, 4to dia habil", () => {
    expect(haberesDelMes({ ...base, payroll: {} })).toEqual({
      fecha: "2026-10-06", blanco: 900000, negro: 200000, fuenteBlanco: "liquidación", fuenteNegro: "acordado en negro",
    });
  });
  it("el recibo oficial le gana a la liquidacion (es el gasto real)", () => {
    const h = haberesDelMes({ ...base, payroll: { reciboOficial: { neto: 912345.67 } } });
    expect(h.blanco).toBe(912345.67);
    expect(h.fuenteBlanco).toBe("recibo oficial");
  });
  it("lo corregido a mano le gana a todo, incluso un 0", () => {
    const h = haberesDelMes({ ...base, payroll: { haberesBlanco: 0, haberesNegro: 150000, haberesFecha: "2026-10-07", reciboOficial: { neto: 1 } } });
    expect(h).toMatchObject({ blanco: 0, negro: 150000, fecha: "2026-10-07", fuenteBlanco: "a mano", fuenteNegro: "a mano" });
  });
  it("null vuelve a lo automatico", () => {
    expect(haberesDelMes({ ...base, payroll: { haberesBlanco: null } }).fuenteBlanco).toBe("liquidación");
  });
});

describe("ids de los renglones automaticos", () => {
  it("ida y vuelta", () => {
    expect(leerIdHaber(idHaberBlanco(42, "2026-09"))).toEqual({ admin: "blanco", empId: 42, month: "2026-09" });
    expect(leerIdHaber("payroll-black-7-2026-10")).toEqual({ admin: "negro", empId: 7, month: "2026-10" });
    expect(leerIdHaber("bank-3")).toBeNull();
  });
});

// Texto real que saca lib/pdfExtract de un recibo de Napsis de De Raiz (dos empleados, cada uno por
// duplicado: original arriba, copia abajo).
const NAPSIS =
  "Courier New Courier New Legajo 00001   /   / Garcia Arguijo Gustavo C.U.I.L. 23-12548695-9 Fecha Ing. 02/01/2023 Apellido y Nombres Categoría Función Sector Deducciones DE RAIZ S.R.L. TRIUNVIRATO 3721  - () C.U.I.T.: 30-71769540-9 Período: Mensual 01/2023    $ 50.000,00 GTE SOCIO NO CCT RECIBO DE REMUNERACIONES ULTIMO DEPOSITO LIQUIDACION Fecha Período Banco CONCEPTO Unidades Cod Hab.C/Desc. Hab.S/Desc. " +
  "Legajo 00001   /   / Garcia Arguijo Gustavo C.U.I.L. 23-12548695-9 Fecha Ing. 02/01/2023 Período: Mensual 01/2023 Sueldo/Jrnal    $ 50.000,00 0010 SUELDO MENSUAL    31,00   50.000,00 Lugar y Fecha de Pago: Vicente Lopez, 06/02/2023   50.000,00   48.500,00 Son Pesos: Cuarenta y ocho mil quinientos TOTALES NETO Firma Empleador " +
  "Legajo 00002   /   / Ruiz Mansilla Lucas C.U.I.L. 20-33528827-1 Fecha Ing. 04/01/2023 Período: Mensual 01/2023   $ 100.000,00 GTE SOCIO NO CCT RECIBO DE REMUNERACIONES " +
  "Legajo 00002   /   / Ruiz Mansilla Lucas C.U.I.L. 20-33528827-1 Período: Mensual 01/2023 Lugar y Fecha de Pago: Vicente Lopez, 06/02/2023  100.000,00  100.000,00 Son Pesos: Cien mil Pesos TOTALES NETO";

describe("reciboOficial (lectura del PDF del estudio)", () => {
  it("lee CUIL, nombre, periodo, fecha de pago, remunerativo y neto", () => {
    const [arriba, abajo] = bloquesDeRecibos(NAPSIS);
    expect(leerBloqueRecibo(arriba)).toMatchObject({ cuil: "23-12548695-9", nombre: "Garcia Arguijo Gustavo", periodo: "2023-01" });
    expect(leerBloqueRecibo(abajo)).toMatchObject({ fechaPago: "2023-02-06", remunerativo: 50000, neto: 48500 });
  });
  it("de un PDF con varios empleados elige el de la ficha por CUIL", () => {
    const r = leerReciboDeEmpleado(NAPSIS, { cuil: "20335288271", name: "Lucas Ruiz" });
    expect(r).toMatchObject({ coincide: true, neto: 100000, periodo: "2023-01", encontrados: 2 });
  });
  it("sin CUIL en la ficha, lo busca por nombre", () => {
    const r = leerReciboDeEmpleado(NAPSIS, { name: "GUSTAVO GARCIA ARGUIJO" });
    expect(r).toMatchObject({ coincide: true, neto: 48500 });
  });
  it("si el empleado no esta en el PDF no inventa un numero", () => {
    const r = leerReciboDeEmpleado(NAPSIS, { cuil: "20-11111111-1", name: "Otro Nombre" });
    expect(r.coincide).toBe(false);
    expect(r.neto).toBeUndefined();
  });
  it("con descuentos: el primero de la fila de totales es el remunerativo y el ultimo el neto", () => {
    // Fila real (Martinez, 01/2023): remunerativo, deducciones, no remunerativo, neto.
    const r = leerBloqueRecibo(
      "Legajo 00004 Martinez Matias C.U.I.L. 20-39430574-0 Lugar y Fecha de Pago: Vicente Lopez, 06/02/2023   97.893,84   16.641,96    9.161,12   90.413,00 Son Pesos: Noventa mil"
    );
    expect(r).toMatchObject({ remunerativo: 97893.84, neto: 90413 });
  });

  it("formato sin 'Son Pesos': toma el importe que sigue a NETO", () => {
    expect(leerBloqueRecibo("NETO A COBRAR $ 1.234.567,89").neto).toBe(1234567.89);
  });
});

describe("sacarHaberesDuplicados (la carga a mano le gana)", () => {
  const ck = "custom:haberes:NICOLAS GARCIA ARGUIJO";
  const auto = { id: "payroll-white-1-2026-08", date: "2026-09-04", company: "BGA", conceptKey: ck, administration: "blanco" };
  it("si ya se cargo a mano el sueldo blanco de ese mes, el automatico no se suma", () => {
    const mano = { id: "financial-9", date: "2026-09-04", company: "BGA", conceptKey: ck, administration: "blanco" };
    expect(sacarHaberesDuplicados([mano, auto]).map((e) => e.id)).toEqual(["financial-9"]);
  });
  it("una carga a mano en NEGRO no saca el sueldo BLANCO", () => {
    const mano = { id: "financial-9", date: "2026-09-05", company: "BGA", conceptKey: ck, administration: "negro" };
    expect(sacarHaberesDuplicados([mano, auto])).toHaveLength(2);
  });
  it("otro mes u otra empresa no cuenta", () => {
    const otroMes = { id: "financial-9", date: "2026-10-04", company: "BGA", conceptKey: ck, administration: "blanco" };
    const otraEmpresa = { id: "financial-8", date: "2026-09-04", company: "De raiz", conceptKey: ck, administration: "blanco" };
    expect(sacarHaberesDuplicados([otroMes, otraEmpresa, auto])).toHaveLength(3);
  });
});

