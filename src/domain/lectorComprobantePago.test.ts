import { controlarContraCargado, leerComprobante, periodoDe, textoLegible } from "./lectorComprobantePago";

// Los textos son los de comprobantes reales de De Raiz (sindicato maderero, diciembre 2024), tal como los
// devuelve el lector de PDF: una linea por renglon.
const TRANSFERENCIA = [
  "Transferencia Terceros otros Bancos",
  "Operación Nro.         31037228",
  "Control Nro.             10-343-177-6626",
  "Estado                   Ejecutada con éxito",
  "Datos de la operación",
  "Fecha y Hora             13/01/2025 - 14:58",
  "Cuenta origen            CC $ 041-419997078-000",
  "Titular                  DE RAIZ SRL",
  "CBU/CVU destino          XXXXXXXXXXXXXXXXXX4898",
  "Titular                  UNION OBREROS IND MADERERA S M",
  "CUIT/CUIL/CDI            30506505212",
  "Banco                    BANCO DE LA NACION ARGENTINA",
  "Importe a Transferir     $ 460.334,95",
  "Concepto                 Cuota",
  "Referencia               CUOTASINDICAL",
];
const ECHEQ = [
  "ECHEQ - Emisión",
  "Operación nro.           31038293",
  "Estado                   Ejecución en proceso",
  "Información del ECHEQ",
  "Fecha de alta            13/01/2025",
  "Fecha de pago            20/01/2025",
  "ECHEQ nro.               01718265",
  "Importe                  $ 797.785,24",
  "Tipo                     Diferido",
  "Concepto                 Cuota",
  "Cuenta                   CC $ 041-419997078-000",
  "Librador                 DE RAIZ SRL",
  "Beneficiario             UNION SIND DE LA IND MADERERA",
  "Documento beneficiario   30-53070511-7",
];
const PLANILLA = [
  "LEGAJO      APELLIDO Y NOMBRE           CUIT         REMUNERACION CUOTA SINDICAL",
  "         5 Pacifico Maximiliano         20394305740  1.652.884,03  49.586,52",
  "         8 CARMONA BUSTAMANTE, Gerardo  20348343301  1.417.848,67  42.535,46",
  "        14 Esquivel Xavier Ivan         20162205928  1.992.316,67  59.769,50",
  "                                        20298442400  2.099.859,98  62.995,80",
  "                                                     TOTAL         460.334,95",
];
// Un VEP de ARCA, con el formato del volante electronico de pago (armado a mano: no habia uno real a mano).
const VEP = [
  "VOLANTE ELECTRÓNICO DE PAGO - VEP",
  "Nro. VEP: 001234567890",
  "Organismo Recaudador: ARCA",
  "Tipo de Pago: IVA - Declaración Jurada",
  "CUIT: 30-71769540-9",
  "Concepto: 19 - DECLARACION JURADA",
  "Período: 2026-08",
  "Fecha Generación: 2026-11-20",
  "Día de Expiración: 2026-11-25",
  "Importe total a pagar: $ 6.940.676,00",
];
// La boleta de USIMRA: la fuente no se puede leer como texto y sale esto.
const USIMRA = [
  "       01230153679",
  "9333333333330000",
  '%,\'8"9*#14$(%#)":,&-.1@-1\'-((,);6(0;<*?3(<<$&<<&+7<,7<-%<.<(<=</=A,>$0?$-,1/2,B-)B(/C4,D1E23C-1-/))14.:F(,4.+-5*.561-6/(B,/G*',
  "c5MdRTRQeKQT2TR  02cf51MQNTR2fT2TO5  R12O2O2MQRN  f515LM215MMRNm5NRNN   0Rf1MQPKLQRf5NhgRM15N00iiUjkU     HR51g2lONTQ51RO",
  "HQLQ5tPM5 opou W VU3rpu3uUVqrr pqpp Wi3rorqkV VUr3puuqUV oiu3prrqkk vwxvy",
];

describe("lector del comprobante de pago", () => {
  it("transferencia del banco: importe, fecha, numero y a quien se le pago", () => {
    const r = leerComprobante(TRANSFERENCIA, "Sindicato San Martin 12.2024 Pago.pdf");
    expect(r).toMatchObject({ tipo: "transferencia", legible: true, total: 460334.95, fecha: "2025-01-13", numero: "31037228", beneficiario: "UNION OBREROS IND MADERERA S M", cuit: "30-50650521-2" });
    // El periodo no esta en el PDF: sale del nombre del archivo.
    expect(r.periodo).toBe("2024-12");
  });

  it("ECHEQ: toma la fecha de PAGO, no la de alta, y el beneficiario", () => {
    const r = leerComprobante(ECHEQ, "Sindicato CABA 12,2024 pago.pdf");
    expect(r).toMatchObject({ tipo: "echeq", total: 797785.24, fecha: "2025-01-20", numero: "01718265", beneficiario: "UNION SIND DE LA IND MADERERA", cuit: "30-53070511-7", periodo: "2024-12" });
  });

  it("planilla de la cuota sindical: el TOTAL y el porcentaje que sale de sus renglones", () => {
    const r = leerComprobante(PLANILLA, "2024-12 Sindicato San Martin.pdf");
    expect(r).toMatchObject({ tipo: "planilla_sindicato", total: 460334.95, periodo: "2024-12" });
    // 49.586,52 / 1.652.884,03 = 3%
    expect(r.porcentaje).toBe(3);
  });

  it("VEP de ARCA: numero, CUIT, periodo e importe total a pagar", () => {
    const r = leerComprobante(VEP, "vep.pdf");
    expect(r).toMatchObject({ tipo: "vep", total: 6940676, periodo: "2026-08", cuit: "30-71769540-9", numero: "001234567890", fecha: "2026-11-20" });
    expect(r.avisos).toEqual([]);
  });

  it("la boleta de USIMRA no trae texto legible: no inventa un importe, avisa, y rescata el periodo del nombre", () => {
    const r = leerComprobante(USIMRA, "2024-12 Usimra CABA.pdf");
    expect(r.legible).toBe(false);
    expect(r.total).toBe(0);
    expect(r.periodo).toBe("2024-12");
    expect(r.avisos[0]).toContain("no trae texto que se pueda leer");
  });

  it("sin etiqueta de importe no elige el numero mas grande: avisa", () => {
    const r = leerComprobante(["Transferencia", "Fecha y Hora 13/01/2025", "Cuenta origen CC $ 041-419997078-000", "Banco Patagonia", "Referencia 9.999.999,99 pesos"], "x.pdf");
    expect(r.total).toBe(0);
    expect(r.avisos.join(" ")).toContain("No encontré el importe");
  });

  it("un subtotal no es el total", () => {
    const r = leerComprobante(["Comprobante de pago", "Fecha de pago 05/11/2026", "Subtotal 100,00", "Total 121,00", "Banco"], "x.pdf");
    expect(r.total).toBe(121);
  });
});

describe("textoLegible y periodoDe", () => {
  it("distingue el texto de verdad de la basura de una fuente", () => {
    expect(textoLegible(TRANSFERENCIA.join("\n"))).toBe(true);
    expect(textoLegible(USIMRA.join("\n"))).toBe(false);
    expect(textoLegible("")).toBe(false);
  });
  it("lee el periodo en los formatos que usan", () => {
    expect(periodoDe("2026-08")).toBe("2026-08");
    expect(periodoDe("202608")).toBe("2026-08");
    expect(periodoDe("08/2026")).toBe("2026-08");
    expect(periodoDe("Sindicato CABA 12,2024 pago")).toBe("2024-12");
    expect(periodoDe("Sindicato San Martin 12.2024 Pago")).toBe("2024-12");
    expect(periodoDe("sin periodo")).toBe("");
  });
});

describe("el lector tambien controla lo ya cargado", () => {
  const money = (n: number) => "$" + n;
  it("coincide", () => {
    expect(controlarContraCargado({ total: 460334.95 }, 460334.95, money)).toMatchObject({ coincide: true });
  });
  it("no coincide: dice la diferencia y que lo cargado no se toco", () => {
    const c = controlarContraCargado({ total: 460334.95 }, 450000, money)!;
    expect(c.coincide).toBe(false);
    expect(c.texto).toContain("$10334.95 de diferencia");
    expect(c.texto).toContain("Lo cargado no se cambió");
  });
  it("si el PDF no dio importe no hay nada que comparar", () => {
    expect(controlarContraCargado({ total: 0 }, 100, money)).toBeNull();
  });
});
