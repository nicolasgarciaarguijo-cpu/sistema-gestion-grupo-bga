import fs from "fs";
import path from "path";
import { claveDeComprobante, comprobanteRepetido, comprobantesRepetidos, facturasConFechaMala, fechaMala, problemasDeFicha, validarFacturaCompra, type CampoParaValidar, type ComprobanteCargado } from "./validaciones";

// Nicolas, 21/11/2026: que la ficha no deje guardar un dato imposible, y diga cual es.
const factura = (extra: Partial<ComprobanteCargado> = {}): ComprobanteCargado => ({
  id: 1, company: "De Raiz", supplier: "Maderas DAC S.A.", taxId: "30-70812345-6", receiptLetter: "A", invoiceNumber: "0003-00135160", invoiceDate: "2026-11-10", total: 538115.57, ...extra,
});

describe("fecha mala", () => {
  it("vacia no es mala; rota si", () => {
    expect(fechaMala("")).toBe(false);
    expect(fechaMala(undefined)).toBe(false);
    expect(fechaMala("2026-11-10")).toBe(false);
    expect(fechaMala("22026-08-13")).toBe(true);
    expect(fechaMala("0026-08-04")).toBe(true);
  });
});

describe("comprobante repetido", () => {
  it("el mismo numero escrito distinto es el mismo comprobante", () => {
    expect(claveDeComprobante(factura({ invoiceNumber: "0003-00135160" }))).toBe(claveDeComprobante(factura({ invoiceNumber: "3-135160" })));
    expect(claveDeComprobante(factura({ invoiceNumber: "135160" }))).not.toBe(claveDeComprobante(factura({ invoiceNumber: "3-135160" })));
    expect(claveDeComprobante(factura({ invoiceNumber: "" }))).toBe("");
  });

  it("mismo proveedor (por CUIT), misma letra y numero, misma empresa: repetido", () => {
    const cargada = factura({ id: 5, supplier: "DAC", invoiceNumber: "3-135160" });
    expect(comprobanteRepetido(factura({ id: undefined }), [cargada])?.id).toBe(5);
  });

  it("sin CUIT se compara por nombre, sin importar S.A. ni mayusculas", () => {
    const cargada = factura({ id: 5, taxId: "", supplier: "MADERAS DAC SA" });
    expect(comprobanteRepetido(factura({ id: undefined, taxId: "" }), [cargada])?.id).toBe(5);
  });

  it("no es repetido: otro proveedor, otra letra, otra empresa, o la misma ficha", () => {
    const base = factura({ id: undefined });
    expect(comprobanteRepetido(base, [factura({ id: 5, taxId: "30-11111111-1", supplier: "Otro" })])).toBeNull();
    expect(comprobanteRepetido(base, [factura({ id: 5, receiptLetter: "B" })])).toBeNull();
    expect(comprobanteRepetido(base, [factura({ id: 5, company: "BGA" })])).toBeNull();
    expect(comprobanteRepetido(factura({ id: 5 }), [factura({ id: 5 })])).toBeNull();
  });

  it("sin numero no se puede saber: no se bloquea (los gastos sin comprobante)", () => {
    expect(comprobanteRepetido(factura({ id: undefined, invoiceNumber: "" }), [factura({ id: 5, invoiceNumber: "" })])).toBeNull();
  });
});

describe("validar factura de compra", () => {
  it("una factura bien cargada no tiene nada que corregir", () => {
    expect(validarFacturaCompra({ ...factura(), pagos: [{ fecha: "2026-11-12", monto: 100 }], saldo: {} }, [])).toEqual([]);
  });

  it("no deja guardar con la fecha de la factura, de un pago o la prevista mal tipeada", () => {
    const r = validarFacturaCompra({ ...factura({ invoiceDate: "22026-11-10" }), pagos: [{ fecha: "0026-11-12", monto: 1 }], saldo: { fechaPrevista: "2026-13-40" } }, []);
    expect(r).toHaveLength(3);
    expect(r[0]).toContain("22026-11-10 no es una fecha válida");
  });

  it("no deja guardar un comprobante que ya esta cargado, y dice cual", () => {
    const r = validarFacturaCompra(factura({ id: undefined }), [factura({ id: 5 })]);
    expect(r).toHaveLength(1);
    expect(r[0]).toContain("A 0003-00135160 de Maderas DAC S.A. ya está cargado");
    expect(r[0]).toContain("10/11/2026");
  });

  it("editar la misma factura no se choca consigo misma", () => {
    expect(validarFacturaCompra(factura({ id: 5 }), [factura({ id: 5 })])).toEqual([]);
  });

  it("importes negativos: se cargan como nota de credito", () => {
    expect(validarFacturaCompra({ ...factura(), net21: -100 }, [])[0]).toContain("nota de crédito");
    expect(validarFacturaCompra({ ...factura({ receiptKind: "Nota de crédito" }), net21: -100 }, [])).toEqual([]);
  });
});

describe("datos por corregir (lo ya cargado)", () => {
  it("cada par repetido sale una sola vez", () => {
    const r = comprobantesRepetidos([factura({ id: 1 }), factura({ id: 2 }), factura({ id: 3, invoiceNumber: "999" })]);
    expect(r).toHaveLength(1);
    expect(r[0].texto).toContain("está cargado dos veces");
  });
  it("facturas con la fecha mal", () => {
    expect(facturasConFechaMala([factura({ id: 1 }), factura({ id: 2, invoiceDate: "22026-01-01" })]).map((d) => d.facturaId)).toEqual([2]);
  });
});

// TODO CAMPO DE FECHA LLEVA MINIMO Y MAXIMO. Sin ellos el navegador deja escribir un año de 5 o 6 cifras: asi
// entraron los cobros fechados en "22026" y "0026". Este test falla si alguien agrega un campo de fecha sin tope.
describe("los campos de fecha no dejan escribir un año imposible", () => {
  const archivos = (dir: string): string[] =>
    fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) return archivos(p);
      return /\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name) ? [p] : [];
    });

  it('todo <input type="date"> tiene min y max', () => {
    const src = path.join(__dirname, "..");
    const sinTope: string[] = [];
    archivos(src).forEach((f) => {
      const texto = fs.readFileSync(f, "utf8");
      const re = /<input\b[^>]*?type="date"[^>]*?>/gs;
      let m: RegExpExecArray | null;
      while ((m = re.exec(texto)) !== null) {
        // El cierre real del tag puede estar mas adelante (un `=>` adentro corta la busqueda): se mira hasta el "/>".
        const fin = texto.indexOf("/>", m.index);
        const tag = texto.slice(m.index, fin < 0 ? m.index + m[0].length : fin);
        if (!/\bmin=/.test(tag) || !/\bmax=/.test(tag)) sinTope.push(`${path.relative(src, f)}:${texto.slice(0, m.index).split("\n").length}`);
      }
    });
    expect(sinTope).toEqual([]);
  });
});

// FICHAS DE GUARDADO AUTOMATICO: marcan lo que falta o esta mal.
describe("problemas de una ficha", () => {
  const campos: CampoParaValidar[] = [
    { key: "fecha", label: "Fecha", tipo: "fecha", obligatorio: true },
    { key: "socio", label: "Socio que retira", tipo: "texto", obligatorio: true },
    { key: "monto", label: "Monto", tipo: "numero", obligatorio: true },
    { key: "motivo", label: "Motivo", tipo: "texto" },
    { key: "dia", label: "Día de débito", tipo: "numero", minimo: 1, maximo: 31 },
    { key: "cuit", label: "CUIT", tipo: "texto", cuit: true },
    { key: "total", label: "Total", tipo: "numero", soloLectura: true, obligatorio: true },
  ];
  const bien = { fecha: "2026-11-10", socio: "Nicolás", monto: 2500000, motivo: "", dia: 10, cuit: "30-71769540-9", total: 0 };

  it("una ficha completa no tiene problemas", () => {
    expect(problemasDeFicha(campos, bien)).toEqual([]);
  });

  it("lo obligatorio vacio falta; lo opcional vacio no", () => {
    const r = problemasDeFicha(campos, { ...bien, fecha: "", socio: "  ", monto: 0, cuit: "", dia: 0 });
    expect(r.map((p) => [p.key, p.texto])).toEqual([["fecha", "falta"], ["socio", "falta"], ["monto", "falta"]]);
  });

  it("fecha mal tipeada, monto negativo, numero fuera de rango y CUIT incompleto", () => {
    const r = problemasDeFicha(campos, { ...bien, fecha: "22026-11-10", monto: -500, dia: 40, cuit: "30-7176954" });
    expect(r.map((p) => [p.key, p.texto])).toEqual([
      ["fecha", "no es una fecha válida"],
      ["monto", "no puede ser negativo"],
      ["dia", "tiene que ser 31 o menos"],
      ["cuit", "tiene que tener 11 dígitos"],
    ]);
  });

  it("lo de solo lectura no se valida (lo calcula el sistema)", () => {
    expect(problemasDeFicha(campos, bien).some((p) => p.key === "total")).toBe(false);
  });

  it("un numero que admite negativos no se marca", () => {
    expect(problemasDeFicha([{ key: "ajuste", label: "Ajuste", tipo: "numero", permiteNegativo: true }], { ajuste: -10 })).toEqual([]);
  });

  it("un error que trae la solapa se marca; si el dato falta, gana el falta", () => {
    const c: CampoParaValidar[] = [{ key: "code", label: "Código", tipo: "texto", obligatorio: true, error: "repetido en Aluminio 2 mm" }];
    expect(problemasDeFicha(c, { code: "ALU-001" }).map((p) => p.texto)).toEqual(["repetido en Aluminio 2 mm"]);
    expect(problemasDeFicha(c, { code: "" }).map((p) => p.texto)).toEqual(["falta"]);
  });
});
