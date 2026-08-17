import React from "react";
import { money, formatDateDisplay } from "../lib/format";
import { numeroALetras } from "../domain/recibo";

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
  employee, company, summary, config, monthKey, logo,
}: {
  employee: ReciboEmployee;
  company: ReciboCompany;
  summary: any;
  config: { unionPct: number; insurancePct: number };
  monthKey: string;
  logo?: string;
}) {
  const s = summary || {};
  const grossRem = Number(s.grossRem || 0);
  const jubilacion = grossRem * 0.11;
  const ley19032 = grossRem * 0.03;
  const obraSocial = grossRem * 0.03;
  const sindicato = grossRem * (Number(config.unionPct || 0) / 100);
  const seguro = grossRem * (Number(config.insurancePct || 0) / 100);
  const contribSubtotal = Number(s.employerJubilacion || 0) + Number(s.employerObraSocial || 0) + Number(s.employerArt || 0) + Number(s.employerLifeInsurance || 0);
  const costoTotal = Number(s.totalGross || 0) + contribSubtotal;

  const haberes = ([
    ["Sueldo / jornal (horas trabajadas)", "", Number(s.grossNormal || 0)],
    ["Horas feriado", "", Number(s.grossHoliday || 0)],
    ["Antigüedad", "", Number(s.seniorityBonus || 0)],
    ["Presentismo", "", Number(s.presentismo || 0)],
    ["Adicional remunerativo", "", Number(s.whiteBonus || 0)],
    ["No remunerativo", "", Number(s.nonRem || 0)],
  ] as Array<[string, string, number]>).filter((r) => r[2] !== 0);
  const descuentos: Array<[string, string, number]> = [
    ["Jubilación", "11%", jubilacion],
    ["Ley 19.032 (INSSJP)", "3%", ley19032],
    ["Obra social", "3%", obraSocial],
    ["Aporte sindical", `${config.unionPct}%`, sindicato],
    ["Seguro de vida y sepelio", `${config.insurancePct}%`, seguro],
  ];

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
            <td style={lbl}>Banco</td><td style={cell}>{company.bankName || "—"}</td>
            <td style={lbl}>Costo total empleador</td><td style={right}>{money(costoTotal)}</td>
          </tr>
        </tbody>
      </table>

      <table style={{ ...box, marginTop: 8 }}>
        <thead>
          <tr><td style={lbl} colSpan={3}>HABERES</td></tr>
        </thead>
        <tbody>
          {haberes.map(([c, u, v], i) => (
            <tr key={`h-${i}`}><td style={cell}>{c}</td><td style={cell}>{u}</td><td style={right}>{money(v)}</td></tr>
          ))}
          <tr><td style={lbl} colSpan={2}>Descuentos</td><td style={lbl}></td></tr>
          {descuentos.map(([c, u, v], i) => (
            <tr key={`d-${i}`}><td style={cell}>{c}</td><td style={cell}>{u}</td><td style={{ ...right, color: "#b00" }}>- {money(v)}</td></tr>
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
