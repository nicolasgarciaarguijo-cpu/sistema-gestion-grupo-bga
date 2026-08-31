import React from "react";
import { money, formatDateDisplay } from "../lib/format";
import { numeroALetras, paymentDateForPeriod } from "../domain/recibo";
import { componerRecibo } from "../domain/reciboComposicion";

type Deposito = { date: string; amount: number } | null | undefined;

// Recibos de sueldo imprimibles. BLANCO = legal (LCT art. 140, réplica del recibo del usuario).
// NEGRO = interno, el acuerdo en negro prorrateado por días trabajados (total ÷ días laborables × días).

const MES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const monthTitle = (monthKey: string) => {
  const [y, m] = (monthKey || "").split("-").map(Number);
  return m ? `${MES[m - 1]} ${y}` : monthKey;
};
const antiguedadText = (hireDate: string | undefined, monthKey: string, fallbackYears: number) => {
  if (!hireDate) return `${fallbackYears || 0} años`;
  const start = new Date(hireDate);
  const [y, m] = monthKey.split("-").map(Number);
  const end = new Date(y, m, 0);
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  if (end.getDate() < start.getDate()) months -= 1;
  months = Math.max(0, months);
  return `${Math.floor(months / 12)} años y ${months % 12} meses`;
};

const box: React.CSSProperties = { border: "1px solid #111", borderCollapse: "collapse", width: "100%", fontSize: 11 };
const cell: React.CSSProperties = { border: "1px solid #111", padding: "3px 6px", verticalAlign: "top" };
const lbl: React.CSSProperties = { ...cell, fontWeight: 700, background: "#f1f1f1", whiteSpace: "nowrap" };
const right: React.CSSProperties = { ...cell, textAlign: "right" };

type ReciboEmployee = {
  name: string; legajo: string; cuil?: string; category: string; hireDate?: string; seniorityYears: number;
};
type ReciboCompany = { name: string; taxId: string; domicilio?: string; bankName?: string };

export function ReciboBlancoDocument({
  employee, company, summary, config, monthKey, logo, sussDeposit, ivaVep, hours,
}: {
  employee: ReciboEmployee;
  company: ReciboCompany;
  summary: any;
  config: { unionPct: number; insurancePct: number };
  monthKey: string;
  logo?: string;
  sussDeposit?: Deposito;
  ivaVep?: Deposito;
  // Horas del mes, para la columna UNIDAD (el recibo real la muestra con 5 decimales).
  hours?: { normalHours?: number; extra50Hours?: number; extra100Hours?: number; night50Hours?: number; holidayHours?: number };
}) {
  const s = summary || {};
  const grossRem = Number(s.grossRem || 0);
  // Los descuentos salen de la liquidacion, no se recalculan aca: si se recalculan, el dia que cambie
  // una alicuota el recibo imprime un numero distinto del que se liquido.
  const jubilacion = Number(s.jubilacion || 0);
  const ley19032 = Number(s.ley19032 || 0);
  const obraSocial = Number(s.obraSocial || 0);
  const sindicato = Number(s.sindicato || 0);
  const seguro = Number(s.seguro || 0);
  const contribSubtotal = Number(s.employerJubilacion || 0) + Number(s.employerObraSocial || 0) + Number(s.employerArt || 0) + Number(s.employerLifeInsurance || 0);
  const costoTotal = Number(s.totalGross || 0) + contribSubtotal;
  const h = hours || {};
  // Cantidad con 5 decimales, como la columna UNIDAD del recibo del usuario.
  const u = (n: number) => (n ? Number(n).toFixed(5).replace(".", ",") : "");

  // Grilla de conceptos con su CODIGO, igual que el recibo real.
  const haberes = ([
    ["0017", "HORAS TRABAJADAS", u(Number(h.normalHours || 0)), Number(s.grossNormal || 0)],
    ["0018", "HORAS EXTRAS 50%", u(Number(h.extra50Hours || 0)), Number(s.extra50 || 0)],
    ["0021", "HORAS EXTRAS 100%", u(Number(h.extra100Hours || 0)), Number(s.extra100 || 0)],
    ["0022", "HORAS NOCTURNAS 50%", u(Number(h.night50Hours || 0)), Number(s.night50 || 0)],
    ["0043", "HS FERIADO", u(Number(h.holidayHours || 0)), Number(s.grossHoliday || 0)],
    ["0180", "ANTIGÜEDAD", u(Number(employee.seniorityYears || 0)), Number(s.seniorityBonus || 0)],
    ["0190", "PRESENTISMO", u(Number(s.presentismoPct || 10)), Number(s.presentismo || 0)],
    ["0200", "ADICIONAL REMUNERATIVO", "", Number(s.whiteBonus || 0)],
    ["0250", "ASIG. SNR", "", Number(s.nonRem || 0)],
  ] as Array<[string, string, string, number]>).filter((r) => r[3] !== 0);
  const descuentos: Array<[string, string, string, number]> = [
    ["0300", "JUBILACION", "11,000000", jubilacion],
    ["0302", "LEY 19032", "3,0000000", ley19032],
    ["0310", "OBRA SOCIAL", "3,0000000", obraSocial],
    ["0322", "APORTE SINDICAL", u(Number(config.unionPct || 0)), sindicato],
    ["0324", "SEG VIDA Y SEPELIO", u(Number(config.insurancePct || 0)), seguro],
  ];

  // El bloque de abajo: cuanto cuesta cada concepto y quien lo paga. Ver domain/reciboComposicion.ts,
  // verificado contra el recibo real de De Raiz.
  const comp = componerRecibo({
    jubilacion, ley19032, obraSocial, sindicato, seguroVidaSepelio: seguro,
    contribJubilacion: Number(s.employerJubilacion || 0),
    contribObraSocial: Number(s.employerObraSocial || 0),
    art: Number(s.employerArt || 0),
    scvo: Number(s.employerLifeInsurance || 0),
    neto: Number(s.net || 0),
  });

  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        {logo ? <img src={logo} alt="logo" style={{ height: 54, objectFit: "contain" }} /> : null}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{company.name}</div>
          <div style={{ fontSize: 11 }}>CUIT: {company.taxId}{company.domicilio ? ` · ${company.domicilio}` : ""}</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>RECIBO DE HABERES</div>
          <div>Período: <strong>{monthTitle(monthKey)}</strong></div>
        </div>
      </div>

      <table style={box}>
        <tbody>
          <tr>
            <td style={lbl}>Apellido y nombre</td><td style={cell}>{employee.name}</td>
            <td style={lbl}>Legajo</td><td style={cell}>{employee.legajo}</td>
            <td style={lbl}>CUIL</td><td style={cell}>{employee.cuil || "—"}</td>
          </tr>
          <tr>
            <td style={lbl}>Categoría</td><td style={cell}>{employee.category}</td>
            <td style={lbl}>Fecha de ingreso</td><td style={cell}>{employee.hireDate ? formatDateDisplay(employee.hireDate) : "—"}</td>
            <td style={lbl}>Antigüedad</td><td style={cell}>{antiguedadText(employee.hireDate, monthKey, employee.seniorityYears)}</td>
          </tr>
          <tr>
            <td style={lbl}>Valor hora</td><td style={cell}>{money(Number(s.baseHourly || 0))}</td>
            <td style={lbl}>Fecha de pago (4º día hábil)</td><td style={cell}>{formatDateDisplay(paymentDateForPeriod(monthKey)) || "—"}</td>
            <td style={lbl}>Banco</td><td style={cell}>{company.bankName || "—"}</td>
          </tr>
          <tr>
            <td style={lbl}>Costo total empleador</td><td style={right} colSpan={5}>{money(costoTotal)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...box, marginTop: 8 }}>
        <thead>
          <tr>
            <td style={lbl}>CÓDIGO</td><td style={lbl}>CONCEPTO</td>
            <td style={lbl}>UNIDAD</td><td style={{ ...lbl, textAlign: "right" }}>MONTO</td>
          </tr>
        </thead>
        <tbody>
          {haberes.map(([cod, con, uni, v], i) => (
            <tr key={`h-${i}`}>
              <td style={cell}>{cod}</td><td style={cell}>{con}</td>
              <td style={cell}>{uni}</td><td style={right}>{money(v)}</td>
            </tr>
          ))}
          {descuentos.map(([cod, con, uni, v], i) => (
            <tr key={`d-${i}`}>
              <td style={cell}>{cod}</td><td style={cell}>{con}</td>
              <td style={cell}>{uni}</td><td style={{ ...right, color: "#b00" }}>- {money(v)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ ...box, marginTop: 8 }}>
        <tbody>
          <tr>
            <td style={lbl}>Remunerativo</td><td style={right}>{money(Number(s.grossRem || 0))}</td>
            <td style={lbl}>No remunerativo</td><td style={right}>{money(Number(s.nonRem || 0))}</td>
          </tr>
          <tr>
            <td style={lbl}>Descuentos</td><td style={{ ...right, color: "#b00" }}>- {money(Number(s.descuentos || 0))}</td>
            <td style={lbl}>SUELDO NETO</td><td style={{ ...right, fontWeight: 800, fontSize: 13 }}>{money(Number(s.net || 0))}</td>
          </tr>
          <tr>
            <td style={cell} colSpan={4}>Son: <strong>{numeroALetras(Number(s.net || 0))}</strong></td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...box, marginTop: 8 }}>
        <thead><tr><td style={lbl} colSpan={3}>CONTRIBUCIONES PATRONALES</td></tr></thead>
        <tbody>
          <tr><td style={cell}>Jubilación patronal</td><td style={cell}>18%</td><td style={right}>{money(Number(s.employerJubilacion || 0))}</td></tr>
          <tr><td style={cell}>Obra social patronal</td><td style={cell}>6%</td><td style={right}>{money(Number(s.employerObraSocial || 0))}</td></tr>
          <tr><td style={cell}>ART</td><td style={cell}>—</td><td style={right}>{money(Number(s.employerArt || 0))}</td></tr>
          <tr><td style={cell}>Seguro de vida (fijo)</td><td style={cell}>fijo</td><td style={right}>{money(Number(s.employerLifeInsurance || 0))}</td></tr>
          <tr><td style={lbl} colSpan={2}>Subtotal contribuciones</td><td style={{ ...right, fontWeight: 800 }}>{money(contribSubtotal)}</td></tr>
        </tbody>
      </table>

      {/* DETALLE DE LA COMPOSICION SALARIAL. Agrupa distinto que la grilla de arriba: muestra el
          costo TOTAL de cada concepto y quien pone cada parte. Ver domain/reciboComposicion.ts. */}
      <table style={{ ...box, marginTop: 8 }}>
        <thead>
          <tr>
            <td style={lbl} colSpan={2}>DETALLE DE LA COMPOSICIÓN SALARIAL</td>
            <td style={{ ...lbl, textAlign: "right" }}>Empleador</td>
            <td style={{ ...lbl, textAlign: "right" }}>Trabajador</td>
            <td style={{ ...lbl, textAlign: "right" }}>Total</td>
          </tr>
        </thead>
        <tbody>
          {comp.lineas.map((l) => (
            <tr key={l.clave}>
              <td style={cell} colSpan={2}>{l.label}</td>
              <td style={right}>{l.empleador ? money(l.empleador) : "—"}</td>
              <td style={right}>{l.trabajador ? money(l.trabajador) : "—"}</td>
              <td style={{ ...right, fontWeight: 700 }}>{money(l.total)}</td>
            </tr>
          ))}
          <tr>
            <td style={lbl} colSpan={2}>Totales</td>
            <td style={{ ...right, fontWeight: 800 }}>{money(comp.totalEmpleador)}</td>
            <td style={{ ...right, fontWeight: 800 }}>{money(comp.totalTrabajador)}</td>
            <td style={{ ...right, fontWeight: 800 }}>{money(comp.totalEmpleador + comp.totalTrabajador)}</td>
          </tr>
          <tr>
            <td style={lbl} colSpan={4}>COSTO TOTAL EMPLEADOR</td>
            <td style={{ ...right, fontWeight: 800 }}>{money(comp.costoTotalEmpleador)}</td>
          </tr>
        </tbody>
      </table>

      {/* Como se reparte ese costo total. Es la torta del recibo, en texto: se imprime en blanco y
          negro y una torta gris no se lee. */}
      <table style={{ ...box, marginTop: 8 }}>
        <thead><tr><td style={lbl} colSpan={2}>CÓMO SE REPARTE EL COSTO TOTAL</td></tr></thead>
        <tbody>
          {comp.reparto
            .filter((x) => x.pct > 0)
            .map((x) => (
              <tr key={x.label}>
                <td style={cell}>{x.label}</td>
                <td style={right}>{x.pct.toFixed(2).replace(".", ",")}%</td>
              </tr>
            ))}
        </tbody>
      </table>

      <table style={{ ...box, marginTop: 8 }}>
        <thead><tr><td style={lbl} colSpan={3}>ÚLTIMOS DEPÓSITOS (art. 140 inc. h) · del extracto bancario</td></tr></thead>
        <tbody>
          <tr>
            <td style={cell}>Aportes Seguridad Social (SUSS/CCSS)</td>
            <td style={cell}>{sussDeposit ? formatDateDisplay(sussDeposit.date) : "—"}</td>
            <td style={right}>{sussDeposit ? money(sussDeposit.amount) : "—"}</td>
          </tr>
          <tr>
            <td style={cell}>VEP IVA</td>
            <td style={cell}>{ivaVep ? formatDateDisplay(ivaVep.date) : "—"}</td>
            <td style={right}>{ivaVep ? money(ivaVep.amount) : "—"}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 40, fontSize: 11 }}>
        <div style={{ textAlign: "center" }}>__________________________<br />Firma empleador</div>
        <div style={{ textAlign: "center" }}>__________________________<br />Firma empleado · Recibí conforme</div>
      </div>
    </div>
  );
}

export function ReciboNegroDocument({
  employee, company, monthKey, totalBlack, workingDays, daysWorked, negroAmount, logo,
}: {
  employee: ReciboEmployee;
  company: ReciboCompany;
  monthKey: string;
  totalBlack: number;
  workingDays: number;
  daysWorked: number;
  negroAmount: number;
  logo?: string;
}) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif", color: "#111", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        {logo ? <img src={logo} alt="logo" style={{ height: 54, objectFit: "contain" }} /> : null}
        <div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{company.name}</div>
          {company.domicilio ? <div style={{ fontSize: 11 }}>{company.domicilio}</div> : null}
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right", fontSize: 11 }}>
          <div style={{ fontWeight: 800, fontSize: 13 }}>CONSTANCIA DE PAGO (ACUERDO)</div>
          <div>Período: <strong>{monthTitle(monthKey)}</strong></div>
        </div>
      </div>

      <table style={box}>
        <tbody>
          <tr>
            <td style={lbl}>Apellido y nombre</td><td style={cell}>{employee.name}</td>
            <td style={lbl}>Legajo</td><td style={cell}>{employee.legajo}</td>
          </tr>
          <tr>
            <td style={lbl}>Acuerdo total (mes)</td><td style={right}>{money(Number(totalBlack || 0))}</td>
            <td style={lbl}>Días laborables</td><td style={cell}>{workingDays}</td>
          </tr>
          <tr>
            <td style={lbl}>Días trabajados</td><td style={cell}>{daysWorked}</td>
            <td style={lbl}>Cálculo</td><td style={cell}>{money(Number(totalBlack || 0))} ÷ {workingDays} × {daysWorked}</td>
          </tr>
          <tr>
            <td style={lbl}>TOTAL A ENTREGAR</td>
            <td style={{ ...right, fontWeight: 800, fontSize: 14 }} colSpan={3}>{money(Number(negroAmount || 0))}</td>
          </tr>
          <tr>
            <td style={cell} colSpan={4}>Son: <strong>{numeroALetras(Number(negroAmount || 0))}</strong></td>
          </tr>
        </tbody>
      </table>

      <div style={{ fontSize: 10, color: "#555", marginTop: 8 }}>
        Documento interno. Deja constancia de la entrega efectiva del acuerdo del período, prorrateado por
        los días trabajados. Sin descuentos salvo por días no trabajados.
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 46, fontSize: 11 }}>
        <div style={{ textAlign: "center" }}>__________________________<br />Entregó</div>
        <div style={{ textAlign: "center" }}>__________________________<br />Recibí conforme</div>
      </div>
    </div>
  );
}
