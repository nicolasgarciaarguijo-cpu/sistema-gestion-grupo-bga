// LECTOR DE RESUMENES DE TARJETA (Nicolas, 2026-10-31): "establece el lector, importantisimo. Un resumen de
// tarjeta es por banco tambien. Despues de la lectura el sistema debe separarlo por numero de tarjeta y
// responsable de cada tarjeta."
//
// Recibe las LINEAS de texto del PDF (lib/pdfLineas.ts las arma con pdf.js, una por renglon visual) y
// devuelve el resumen: cuenta, cierre, vencimiento, saldos y cada renglon con su tarjeta fisica y su
// responsable. Dos formatos reales:
//   - Banco Patagonia (Visa Business / Visa Corporate): "CIERRE ACTUAL: 29 Ene 26", fechas "04.01.26",
//     cada bloque de consumos termina con "Tarjeta 5279 Total Consumos de GUSTAVO O GARCIA A".
//   - Santander (Visa): "CIERRE 20 Ago 26 VENCIMIENTO 01 Set 26", fechas "26 Julio 24" y despues solo el
//     dia; el saldo actual aparece recien en la ultima hoja.
// En los dos, una linea en dolares trae "USD" y el importe en dolares es el ultimo numero.
// Puro: solo texto. La verificacion (saldo anterior + renglones = saldo actual) dice si se leyo completo.
import { categoriaDeLineaTarjeta } from "./costoBancosTarjetas";

export type TipoRenglonResumen = "consumo" | "cargo" | "pago";

export type RenglonLeido = {
  date: string; // yyyy-mm-dd
  description: string;
  amount: number; // negativo = devolucion / pago
  currency: "ARS" | "USD";
  tipo: TipoRenglonResumen;
  installments: string; // "02/03" o ""
  cardDigits: string; // tarjeta fisica ("5279"); vacio en los cargos del resumen
  holder: string; // responsable de esa tarjeta, como lo escribe el banco
};

export type TarjetaLeida = { digits: string; holder: string; totalArs: number; totalUsd: number };

export type ResumenLeido = {
  banco: "Patagonia" | "Santander" | "";
  producto: string; // "Visa Business", "Visa Corporate", "Visa"
  numeroCuenta: string;
  cuitTitular: string; // solo digitos, si el resumen lo trae
  titular: string;
  closingDate: string;
  dueDate: string;
  saldoAnteriorArs: number;
  saldoAnteriorUsd: number;
  totalArs: number;
  totalUsd: number;
  minPaymentArs: number;
  renglones: RenglonLeido[];
  tarjetas: TarjetaLeida[];
  // saldo anterior + renglones (pesos) contra el saldo actual. 0 = cierra al centavo.
  diferenciaArs: number;
  diferenciaUsd: number;
};

const r2 = (n: number) => Math.round(n * 100) / 100;

const MESES: Record<string, number> = {
  ene: 1, enero: 1, feb: 2, febrero: 2, mar: 3, marzo: 3, abr: 4, abril: 4, may: 5, mayo: 5, jun: 6, junio: 6,
  jul: 7, julio: 7, ago: 8, agosto: 8, sep: 9, set: 9, septiembre: 9, setiembre: 9, oct: 10, octubre: 10,
  nov: 11, noviembre: 11, dic: 12, diciembre: 12,
};
const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
const iso = (y: number, m: number, d: number) =>
  `${y < 100 ? 2000 + y : y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// "29 Ene 26" / "01 Set 26" -> yyyy-mm-dd
export function fechaCorta(s: string): string {
  const m = /(\d{1,2})\s+([A-Za-zé]{3,10})\.?\s+(\d{2,4})/.exec(sinAcentos(s));
  if (!m) return "";
  const mes = MESES[m[2].toLowerCase()];
  return mes ? iso(Number(m[3]), mes, Number(m[1])) : "";
}

// "1.234,56" / "1352.078,11" / "75360,00" / "41.509,46-" -> numero (el "-" final es negativo)
export function importeAr(s: string): number {
  const t = String(s || "").trim();
  const neg = /-$/.test(t) || /^-/.test(t);
  const limpio = t.replace(/[-$\s]/g, "").replace(/\./g, "").replace(",", ".");
  const n = Number(limpio);
  if (!Number.isFinite(n)) return 0;
  return neg ? -n : n;
}

// Importes de la linea: "1.234,56" con 2 decimales y opcional "-". Las tasas ("77,900") no cuentan.
// Santander escribe el millon con cuatro cifras antes del punto ("1251.672,24"): por eso \d{1,4}.
const RE_IMPORTE = /(?<![\d,.])-?\d{1,4}(?:\.\d{3})*,\d{2}(?!\d)-?|(?<![\d,.])-?\d+,\d{2}(?!\d)-?/g;
const importesDe = (linea: string) => Array.from(linea.matchAll(RE_IMPORTE)).map((m) => m[0]);

const RE_TOTAL_TARJETA = /Tarjeta\s+(\d{4})\s+Total Consumos de\s+(.+?)\s{2,}(-?[\d.,]+-?)\s*\*?\s+(-?[\d.,]+-?)/i;

function tipoDe(descripcion: string): TipoRenglonResumen {
  if (/\bSU PAGO\b/i.test(descripcion)) return "pago";
  return categoriaDeLineaTarjeta(descripcion) === "consumos" ? "consumo" : "cargo";
}

// Separa la descripcion y la cuota de lo que queda despues de la fecha y el comprobante.
function armarRenglon(resto: string, date: string, tarjetaPendiente: RenglonLeido[]): RenglonLeido | null {
  const importes = importesDe(resto);
  if (!importes.length) return null;
  const esUsd = /USD/.test(resto.replace(/U\$S/g, ""));
  const ultimo = importes[importes.length - 1];
  const amount = importeAr(ultimo);
  // Descripcion: lo que esta antes del primer importe, sin "USD", "$" ni la cuota.
  const corte = resto.indexOf(importes[0]);
  let desc = (corte >= 0 ? resto.slice(0, corte) : resto).trim();
  // Cuota: "Cuota 02/03" (Patagonia) o "C.06/12" (Santander).
  let installments = "";
  const cuota = /(?:Cuota\s+|C\.)(\d{1,2}\/\d{1,2})/i.exec(desc);
  if (cuota) {
    installments = cuota[1];
    desc = desc.replace(cuota[0], " ");
  }
  desc = desc
    .replace(/USD\s*$/i, "")
    .replace(/\s\$\s*$/, "")
    .replace(/\s{2,}/g, "  ")
    .trim();
  const r: RenglonLeido = {
    date,
    description: desc.replace(/\s{2,}/g, " "),
    amount: r2(amount),
    currency: esUsd ? "USD" : "ARS",
    tipo: tipoDe(desc),
    installments,
    cardDigits: "",
    holder: "",
  };
  tarjetaPendiente.push(r);
  return r;
}

function asignarTarjeta(pendientes: RenglonLeido[], digits: string, holder: string) {
  pendientes.forEach((r) => {
    if (r.tipo === "consumo") {
      r.cardDigits = digits;
      r.holder = holder;
    }
  });
  pendientes.length = 0;
}

// Lo que queda despues del ultimo "Tarjeta NNNN Total Consumos" no es de ninguna tarjeta: son los cargos del
// propio resumen (sellos, intereses, punitorios, IVA).
function cerrarPendientes(pendientes: RenglonLeido[], huboTarjetas: boolean) {
  if (huboTarjetas) pendientes.forEach((r) => (r.tipo = r.tipo === "pago" ? "pago" : "cargo"));
  pendientes.length = 0;
}

function verificar(r: Omit<ResumenLeido, "diferenciaArs" | "diferenciaUsd">): ResumenLeido {
  const sumaArs = r.renglones.filter((x) => x.currency === "ARS").reduce((a, x) => a + x.amount, 0);
  const sumaUsd = r.renglones.filter((x) => x.currency === "USD").reduce((a, x) => a + x.amount, 0);
  return {
    ...r,
    diferenciaArs: r2(r.saldoAnteriorArs + sumaArs - r.totalArs),
    diferenciaUsd: r2(r.saldoAnteriorUsd + sumaUsd - r.totalUsd),
  };
}

function leerPatagonia(lineas: string[]): ResumenLeido {
  const texto = lineas.join("\n");
  const producto = /VISA CORPORATE/i.test(texto) ? "Visa Corporate" : /VISA BUSINESS/i.test(texto) ? "Visa Business" : "Visa";
  const numeroCuenta = (/N DE CUENTA:\s*(\d{6,})/.exec(texto) || [])[1] || "";
  const titular = ((/TITULAR DE CUENTA:\s*(.+)/.exec(texto) || [])[1] || "").trim();
  const closingDate = fechaCorta((/CIERRE ACTUAL:\s*(.+)/.exec(texto) || [])[1] || "");
  // El vencimiento es la primera fecha del renglon que sigue a "VENCIMIENTO  SALDO $ ...".
  let dueDate = "";
  let minPaymentArs = 0;
  const iVto = lineas.findIndex((l) => /VENCIMIENTO\s+SALDO \$/.test(l));
  if (iVto >= 0 && lineas[iVto + 1]) {
    dueDate = fechaCorta(lineas[iVto + 1]);
    const imps = importesDe(lineas[iVto + 1]);
    if (imps[2]) minPaymentArs = importeAr(imps[2]);
  }
  let saldoAnteriorArs = 0;
  let saldoAnteriorUsd = 0;
  let totalArs = 0;
  let totalUsd = 0;
  const renglones: RenglonLeido[] = [];
  const tarjetas: TarjetaLeida[] = [];
  const pendientes: RenglonLeido[] = [];
  let dentro = false;
  for (const linea of lineas) {
    if (/^FECHA COMPROBANTE/.test(linea)) {
      dentro = true;
      continue;
    }
    if (!dentro) continue;
    if (/^SALDO ANTERIOR\b/.test(linea)) {
      const imps = importesDe(linea);
      saldoAnteriorArs = importeAr(imps[0] || "0");
      saldoAnteriorUsd = importeAr(imps[1] || "0");
      continue;
    }
    const sa = /^SALDO ACTUAL\s+\$\s*([\d.,-]+)(?:\s+U\$S\s*([\d.,-]+))?/.exec(linea);
    if (sa) {
      totalArs = importeAr(sa[1]);
      totalUsd = importeAr(sa[2] || "0");
      dentro = false;
      continue;
    }
    const tot = RE_TOTAL_TARJETA.exec(linea);
    if (tot) {
      tarjetas.push({ digits: tot[1], holder: tot[2].trim(), totalArs: importeAr(tot[3]), totalUsd: importeAr(tot[4]) });
      asignarTarjeta(pendientes, tot[1], tot[2].trim());
      continue;
    }
    const f = /^(\d{2})\.(\d{2})\.(\d{2})\s+(.*)$/.exec(linea);
    if (!f) continue;
    const date = iso(Number(f[3]), Number(f[2]), Number(f[1]));
    let resto = f[4].replace(/\s_\s*$/, "").replace(/_$/, "");
    // Comprobante ("000001K", "721006*") al principio: no es parte de la descripcion.
    resto = resto.replace(/^\d{5,7}[A-Z*]?\s+/, "");
    // Pago con tipo de cambio: "180.630,91 TC1420,000 151.904,31- 20,23-": pesos y dolares despues del TC.
    const tc = /\bTC[\d.,]+\s+([\d.,]+-?)\s+([\d.,]+-?)/.exec(resto);
    if (tc) {
      const desc = resto.slice(0, resto.search(/[\d.]+,\d{2}/)).trim();
      renglones.push({ date, description: desc, amount: importeAr(tc[1]), currency: "ARS", tipo: "pago", installments: "", cardDigits: "", holder: "" });
      renglones.push({ date, description: desc, amount: importeAr(tc[2]), currency: "USD", tipo: "pago", installments: "", cardDigits: "", holder: "" });
      continue;
    }
    const r = armarRenglon(resto, date, pendientes);
    if (r) renglones.push(r);
  }
  cerrarPendientes(pendientes, tarjetas.length > 0);
  return verificar({
    banco: "Patagonia",
    producto,
    numeroCuenta,
    cuitTitular: "",
    titular,
    closingDate,
    dueDate,
    saldoAnteriorArs,
    saldoAnteriorUsd,
    totalArs,
    totalUsd,
    minPaymentArs,
    renglones,
    tarjetas,
  });
}

function leerSantander(lineas: string[]): ResumenLeido {
  const texto = lineas.join("\n");
  const numeroCuenta = (/\b(\d{9,10})\s+N\d{3}\b/.exec(texto) || [])[1] || "";
  const cuitTitular = ((/U?IT\s+(\d{2}-\d{8}-\d)/.exec(texto) || [])[1] || "").replace(/\D/g, "");
  const cab = /CIERRE\s+(\d{1,2}\s+\w{3}\s+\d{2})\s*VENCIMIENTO\s+(\d{1,2}\s+\w{3}\s+\d{2})/.exec(sinAcentos(texto));
  const closingDate = cab ? fechaCorta(cab[1]) : "";
  const dueDate = cab ? fechaCorta(cab[2]) : "";
  const iTit = lineas.findIndex((l) => /^Cuenta:/.test(l));
  const titular = iTit >= 0 ? (lineas[iTit + 1] || "").trim() : "";
  let saldoAnteriorArs = 0;
  let saldoAnteriorUsd = 0;
  let totalArs = 0;
  let totalUsd = 0;
  let minPaymentArs = 0;
  const renglones: RenglonLeido[] = [];
  const tarjetas: TarjetaLeida[] = [];
  const pendientes: RenglonLeido[] = [];
  let anio = 0;
  let mes = 0;
  let dentro = false;
  // Despues de los cargos del resumen vienen las hojas de condiciones legales, que repiten el encabezado y
  // traen listas de precios ("... a 9 tarjetas Precio sin IVA $26.339,28"): ahi ya no hay movimientos.
  let terminado = false;
  for (const linea of lineas) {
    if (/^(Cuotas a vencer|El banco podr|NO RENOVACI|La Percepci)/i.test(linea) && renglones.length) terminado = true;
    // Cada hoja repite el encabezado: los movimientos arrancan despues de "Fecha  Comprobante".
    if (/^Fecha\s+Comprobante/.test(linea)) {
      dentro = !terminado;
      continue;
    }
    const st = /SALDO ACTUAL\s+\$\s*([\d.,]+)\s+U\$S\s+([\d.,-]+)/.exec(linea);
    if (st) {
      totalArs = importeAr(st[1]);
      totalUsd = importeAr(st[2]);
      continue;
    }
    const pm = /^PAGO MINIMO\s+\$\s+([\d.,]+)/.exec(linea);
    if (pm) {
      minPaymentArs = importeAr(pm[1]);
      continue;
    }
    if (/^(SALDO ACTUAL|PAGO MINIMO|EL PRESENTE ES COPIA|Cuotas a vencer|\*USTED DISPONE)/.test(linea) || /^_{10,}/.test(linea)) {
      if (/^(Cuotas a vencer|EL PRESENTE)/.test(linea)) dentro = false;
      continue;
    }
    if (!dentro) continue;
    if (/^SALDO ANTERIOR\b/.test(linea)) {
      const imps = importesDe(linea);
      saldoAnteriorArs = importeAr(imps[0] || "0");
      saldoAnteriorUsd = importeAr(imps[1] || "0");
      continue;
    }
    const tot = RE_TOTAL_TARJETA.exec(linea);
    if (tot) {
      tarjetas.push({ digits: tot[1], holder: tot[2].trim(), totalArs: importeAr(tot[3]), totalUsd: importeAr(tot[4]) });
      asignarTarjeta(pendientes, tot[1], tot[2].trim());
      continue;
    }
    // "26 Julio  24 035947 *  PERSONAL ..." (anio, mes, dia) o solo "24 035947 * ..." (mismo mes). Los meses
    // largos vienen abreviados con punto: "Diciem.", "Noviem.", "Setiem.".
    let resto = linea;
    const conMes = /^(\d{2})\s+([A-Za-z]{4,10})\.?\s+(\d{1,2})\s+(.*)$/.exec(sinAcentos(linea));
    const mesDe = (t: string) => MESES[t.toLowerCase()] || MESES[t.toLowerCase().slice(0, 3)];
    if (conMes && mesDe(conMes[2])) {
      anio = Number(conMes[1]);
      mes = mesDe(conMes[2]);
      resto = `${conMes[3]} ${conMes[4]}`;
    }
    const d = /^(\d{1,2})\s+(.*)$/.exec(resto);
    if (!d || !anio || !mes) continue;
    const date = iso(anio, mes, Number(d[1]));
    resto = d[2].replace(/^\d{6}\s*[A-Z*]?\s+/, "").replace(/^[*K F]\s+/, "");
    const tc = /\bTC[\d.,]+\s+([\d.,]+-?)\s+([\d.,]+-?)/.exec(resto);
    if (tc) {
      const desc = resto.slice(0, resto.search(/[\d.]+,\d{2}/)).trim();
      renglones.push({ date, description: desc, amount: importeAr(tc[1]), currency: "ARS", tipo: "pago", installments: "", cardDigits: "", holder: "" });
      renglones.push({ date, description: desc, amount: importeAr(tc[2]), currency: "USD", tipo: "pago", installments: "", cardDigits: "", holder: "" });
      continue;
    }
    // Las percepciones traen la base entre parentesis: "IIBB PERCEP-BSAS 2,00%( 140897,64) 2.817,95".
    const sinBase = resto.replace(/\(\s*[\d.,]+\s*\)/g, " ");
    const r = armarRenglon(sinBase, date, pendientes);
    if (r) renglones.push(r);
  }
  cerrarPendientes(pendientes, tarjetas.length > 0);
  return verificar({
    banco: "Santander",
    producto: "Visa",
    numeroCuenta,
    cuitTitular,
    titular,
    closingDate,
    dueDate,
    saldoAnteriorArs,
    saldoAnteriorUsd,
    totalArs,
    totalUsd,
    minPaymentArs,
    renglones,
    tarjetas,
  });
}

export function leerResumenTarjeta(lineas: string[]): ResumenLeido | null {
  const limpias = lineas.map((l) => String(l || "").replace(/\s+$/, "")).filter((l) => l.trim());
  const texto = limpias.join("\n");
  if (/CIERRE ACTUAL:/.test(texto) && /FECHA COMPROBANTE/.test(texto)) return leerPatagonia(limpias);
  if (/Santander/i.test(texto) && /CIERRE\s+\d/.test(texto)) return leerSantander(limpias);
  return null;
}
