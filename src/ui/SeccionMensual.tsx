// SECCIONES "IVA" y "SINDICATO" de Pago a proveedores (Nicolas, 21/11/2026).
//   "en el bloque solo quiero informacion numerica de cuanto vamos teniendo y vamos pagando mes a mes. Nada mas."
//   "todo esto preparalo en fichas"
// El BLOQUE es una tabla de numeros por empresa. Todo lo demas vive en la FICHA DEL MES (click en el mes): de
// donde sale lo calculado, la boleta real (que es una factura de Compras: se abre SU ficha, no una copia), si
// se pago o se saco un plan, y como viene ese plan. La cuenta esta en domain/obligacionMensual.ts.
//
// LO CARGADO ES PALABRA SANTA (Nicolas, 21/11/2026): "al cargar el pago, sin importar lo que tengamos, es
// palabra santa. Vamos a tener que poder calcular el valor, pero lo importante es la carga del pago". Y del
// plan de IVA: "ya somos conocedores de los intereses... lo que coloquemos en el plan de desendeudamiento es
// lo que es". Por eso lo que calcula el sistema es INFORMATIVO: la diferencia se muestra sin alarma, y el
// plan muestra lo que se cargo, sin reclamar nada.
import React, { useRef, useState } from "react";
import { Panel } from "./primitives";
import { Z_FICHA } from "./VinculoUi";
import type { MesObligacion, ObligacionMensual, PlanObligacion, ResolucionMes } from "../domain/obligacionMensual";

export type ColumnaExtra = { clave: string; titulo: string; ayuda?: string };
export type EmpresaSeccion = {
  company: string;
  short: string;
  color?: string;
  datos: ObligacionMensual;
  // Numeros propios de la seccion para cada mes (IVA: ventas, compras, saldo a favor; sindicato: la base).
  extra: Record<string, Record<string, number>>; // mes -> clave -> valor
  // Aviso de la empresa (ej. meses sin compras cargadas).
  avisos?: Record<string, string>; // mes -> texto
};
export type DetalleMes = Array<{ titulo: string; total: number; filas: Array<{ fecha: string; texto: string; monto: number }>; nota?: string }>;

const ESTADO: Record<ResolucionMes, { texto: (boleta: string) => string; color: string }> = {
  nada: { texto: () => "—", color: "#94a3b8" },
  en_curso: { texto: () => "mes en curso", color: "#475569" },
  // Lo unico que se reclama: que falte CARGAR el pago de un mes que ya cerro.
  sin_cargar: { texto: (b) => `⚠ falta cargar ${b === "boleta" ? "la boleta" : `el ${b}`}`, color: "#b91c1c" },
  pendiente: { texto: () => "cargado, sin pagar", color: "#b45309" },
  pagado: { texto: () => "✓ pagado", color: "#166534" },
  plan: { texto: () => "plan de pago", color: "#1d4ed8" },
};
const mesLindo = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;
const fechaLinda = (iso?: string) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : "—");
const th: React.CSSProperties = { textAlign: "right", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 8px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { textAlign: "right", padding: "4px 8px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };

export function SeccionMensual({
  titulo,
  nombreBoleta,
  nombreCalculado,
  empresas,
  columnas,
  money,
  detalle,
  onAbrirBoleta,
  onCargarBoleta,
  onAbrirPlan,
  onSacarPlan,
  onLeerPdf,
  encabezado,
}: {
  titulo: string; // "IVA" / "Sindicato"
  nombreBoleta: string; // "VEP" / "boleta"
  nombreCalculado: string; // "A pagar (sistema)"
  empresas: EmpresaSeccion[];
  columnas: ColumnaExtra[];
  money: (n: number) => string;
  // El detalle de donde sale lo calculado de un mes (solo se arma al abrir la ficha).
  detalle: (company: string, mes: string) => DetalleMes;
  // La boleta ES la factura de Compras: se abre esa misma ficha.
  onAbrirBoleta: (facturaId: number) => void;
  onCargarBoleta: (company: string, mes: string, sugerido: number) => void;
  onAbrirPlan: (deudaId: number) => void;
  onSacarPlan: () => void;
  // LECTOR DE PDF (21/11/2026): lee el VEP / el comprobante del pago y abre la ficha con lo leido, o controla
  // lo ya cargado. Devuelve lo que hay que decirle al usuario. La edicion a mano siempre gana.
  onLeerPdf?: (company: string, mes: string, file: File) => Promise<string>;
  // Lo editable de la seccion (ej. el porcentaje del sindicato). Va arriba del bloque.
  encabezado?: React.ReactNode;
}) {
  const [abierto, setAbierto] = useState<{ company: string; mes: string } | null>(null);
  const empresaAbierta = abierto ? empresas.find((e) => e.company === abierto.company) : undefined;
  const mesAbierto = empresaAbierta ? empresaAbierta.datos.meses.find((m) => m.mes === abierto!.mes) : undefined;

  return (
    <Panel span="full" title={titulo}>
      {encabezado}
      {empresas.length === 0 && <div style={{ fontSize: 13, color: "#64748b" }}>Sin datos.</div>}
      <div style={{ display: "grid", gap: 16 }}>
        {empresas.map((e) => (
          <div key={e.company} data-seccion-empresa={e.company}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, alignItems: "baseline", marginBottom: 4 }}>
              <strong style={{ color: e.color || "#0f172a" }}>{e.short}</strong>
              <span style={{ fontSize: 12.5 }} title={`Lo calculado de los meses que todavía no tienen ${nombreBoleta} cargado. Al cargarlo, ese mes sale de acá.`}>
                Por pagar sin {nombreBoleta}: <b data-por-pagar>{money(e.datos.porPagar)}</b>
              </span>
              {e.datos.pendiente > 1 && (
                <span style={{ fontSize: 12.5, color: "#b45309" }}>
                  Cargado sin pagar: <b>{money(e.datos.pendiente)}</b>
                </span>
              )}
              {e.datos.planes.length > 0 && (
                <span style={{ fontSize: 12.5, color: "#1d4ed8" }}>
                  En planes: <b>{money(e.datos.planes.reduce((a, p) => a + p.total, 0))}</b> · falta <b>{money(e.datos.planes.reduce((a, p) => a + p.pendiente, 0))}</b>
                  {e.datos.intereses > 0 && <> · intereses <b>{money(e.datos.intereses)}</b></>}
                </span>
              )}
              <span style={{ fontSize: 12, color: "#64748b" }}>
                {e.datos.costumbre.pagados} mes(es) al contado · {e.datos.costumbre.enPlan} en plan · {e.datos.costumbre.sinCargar} sin {nombreBoleta}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                  <tr>
                    <th style={{ ...th, textAlign: "left" }}>Mes</th>
                    {columnas.map((c) => (
                      <th key={c.clave} style={th} title={c.ayuda}>{c.titulo}</th>
                    ))}
                    <th style={th} title="Lo que calcula el sistema. Es informativo: lo que vale es lo que se carga.">{nombreCalculado}</th>
                    <th style={th}>{nombreBoleta} cargado</th>
                    <th style={th}>Pagado</th>
                    <th style={th}>En plan</th>
                    <th style={th} title={`${nombreBoleta} cargado menos lo que calculaba el sistema. Informativo: lo cargado es lo que vale.`}>Dif. con el sistema</th>
                    <th style={{ ...th, textAlign: "left" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {e.datos.meses.map((m) => (
                    <tr
                      key={m.mes}
                      data-mes={m.mes}
                      onClick={() => setAbierto({ company: e.company, mes: m.mes })}
                      style={{ cursor: "pointer" }}
                      title="Abrir la ficha del mes"
                    >
                      <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>
                        {mesLindo(m.mes)}
                        {e.avisos?.[m.mes] && <span style={{ marginLeft: 6, color: "#b45309", fontWeight: 400, fontSize: 11.5 }} title={e.avisos[m.mes]}>⚠</span>}
                      </td>
                      {columnas.map((c) => (
                        <td key={c.clave} style={td}>{money(e.extra[m.mes]?.[c.clave] || 0)}</td>
                      ))}
                      <td style={{ ...td, color: "#64748b" }}>{money(m.calculado)}</td>
                      <td style={{ ...td, fontWeight: 700 }}>{m.docs.length ? money(m.cargado) : "—"}</td>
                      <td style={td}>{m.pagado > 0 ? money(m.pagado) : "—"}</td>
                      <td style={td}>{m.enPlan > 0 ? money(m.enPlan) : "—"}</td>
                      <td style={{ ...td, color: "#64748b" }}>
                        {m.docs.length ? (Math.abs(m.diferencia) <= 1 ? "coincide" : money(m.diferencia)) : "—"}
                      </td>
                      <td style={{ ...td, textAlign: "left", color: ESTADO[m.resolucion].color, fontWeight: 700 }}>{ESTADO[m.resolucion].texto(nombreBoleta)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
      {abierto && empresaAbierta && mesAbierto && (
        <FichaMes
          titulo={titulo}
          nombreBoleta={nombreBoleta}
          nombreCalculado={nombreCalculado}
          empresa={empresaAbierta}
          mes={mesAbierto}
          columnas={columnas}
          money={money}
          detalle={detalle(empresaAbierta.company, mesAbierto.mes)}
          onAbrirBoleta={onAbrirBoleta}
          onCargarBoleta={() => onCargarBoleta(empresaAbierta.company, mesAbierto.mes, mesAbierto.calculado)}
          onAbrirPlan={onAbrirPlan}
          onSacarPlan={onSacarPlan}
          onLeerPdf={onLeerPdf ? (file) => onLeerPdf(empresaAbierta.company, mesAbierto.mes, file) : undefined}
          onCerrar={() => setAbierto(null)}
        />
      )}
    </Panel>
  );
}

function PlanResumen({ plan, money, onAbrir }: { plan: PlanObligacion; money: (n: number) => string; onAbrir: () => void }) {
  return (
    <div data-plan={plan.deudaId} style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 8, padding: "6px 10px", fontSize: 12.5, marginTop: 4 }}>
      <b>Plan de pago · {plan.concepto || "deuda"}</b> · {plan.cuotasPagadas} de {plan.cuotas} cuota(s) pagas
      <div>
        El plan cargado en Desendeudamiento: <b>{money(plan.total)}</b> en {plan.cuotas} cuota(s)
        {plan.interes > 0 && <> · sobre {money(plan.capital)}: interés <b>{money(plan.interes)}</b></>}
      </div>
      <div>
        Pagado <b>{money(plan.pagado)}</b> · falta <b>{money(plan.pendiente)}</b>{" "}
        <button type="button" style={{ ...btn, marginLeft: 6 }} onClick={onAbrir}>Abrir el plan</button>
      </div>
    </div>
  );
}

function FichaMes({
  titulo, nombreBoleta, nombreCalculado, empresa, mes, columnas, money, detalle, onAbrirBoleta, onCargarBoleta, onAbrirPlan, onSacarPlan, onLeerPdf, onCerrar,
}: {
  onLeerPdf?: (file: File) => Promise<string>;
  titulo: string;
  nombreBoleta: string;
  nombreCalculado: string;
  empresa: EmpresaSeccion;
  mes: MesObligacion;
  columnas: ColumnaExtra[];
  money: (n: number) => string;
  detalle: DetalleMes;
  onAbrirBoleta: (facturaId: number) => void;
  onCargarBoleta: () => void;
  onAbrirPlan: (deudaId: number) => void;
  onSacarPlan: () => void;
  onCerrar: () => void;
}) {
  const aviso = empresa.avisos?.[mes.mes];
  const archivo = useRef<HTMLInputElement>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [lectura, setLectura] = useState("");
  const leer = async (file: File) => {
    if (!onLeerPdf) return;
    setLeyendo(true);
    setLectura("Leyendo el PDF... (la primera vez descarga el lector, puede tardar)");
    try {
      setLectura(await onLeerPdf(file));
    } catch (err: any) {
      setLectura("No se pudo leer el PDF: " + (err?.message || String(err)) + ". Cargalo a mano.");
    }
    setLeyendo(false);
  };
  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: Z_FICHA, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "30px 12px", overflowY: "auto" }}>
      <div data-ficha-mes={mes.mes} onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, padding: 16, width: "min(880px, 100%)", boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <strong style={{ fontSize: 16 }}>{titulo} · {mesLindo(mes.mes)} · <span style={{ color: empresa.color || "#0f172a" }}>{empresa.short}</span></strong>
          <span style={{ color: ESTADO[mes.resolucion].color, fontWeight: 700, fontSize: 13 }}>{ESTADO[mes.resolucion].texto(nombreBoleta)}</span>
          <button type="button" style={{ ...btn, marginLeft: "auto" }} onClick={onCerrar}>Cerrar</button>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 13, marginBottom: 10 }}>
          {columnas.map((c) => (
            <span key={c.clave}>{c.titulo}: <b>{money(empresa.extra[mes.mes]?.[c.clave] || 0)}</b></span>
          ))}
          <span>{nombreCalculado}: <b>{money(mes.calculado)}</b> <span style={{ color: "#64748b" }}>(informativo)</span></span>
        </div>
        {aviso && <div style={{ fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>⚠ {aviso}</div>}

        <div style={{ fontWeight: 800, marginBottom: 4 }}>{nombreBoleta} real y cómo se resolvió</div>
        {mes.docs.length === 0 ? (
          <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
            Todavía no hay {nombreBoleta} cargado para este mes. Lo que vale es lo que se cargue; mientras tanto, lo calculado suma al «por pagar».
          </div>
        ) : (
          <div style={{ display: "grid", gap: 6, marginBottom: 6 }}>
            {mes.docs.map((d) => (
              <div key={d.id} data-boleta={d.id} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 12.5 }}>
                <b>{money(d.total)}</b> · {nombreBoleta === "boleta" ? "boleta" : nombreBoleta} de {d.supplier} · del {fechaLinda(d.fecha)} ·{" "}
                {d.plan ? (
                  <span style={{ color: "#1d4ed8", fontWeight: 700 }}>fue a un plan de pago</span>
                ) : d.pagadaEl ? (
                  <span style={{ color: "#166534", fontWeight: 700 }}>✓ pagado el {fechaLinda(d.pagadaEl)}</span>
                ) : (
                  <span style={{ color: "#b45309", fontWeight: 700 }}>sin pagar</span>
                )}
                <button type="button" style={{ ...btn, marginLeft: 8 }} onClick={() => onAbrirBoleta(d.id)}>Abrir la ficha</button>
                {!d.plan && !d.pagadaEl && (
                  <button type="button" style={{ ...btn, marginLeft: 6 }} onClick={onSacarPlan} title={`En Desendeudamiento: cargá el plan tal como lo armaron y elegí este ${nombreBoleta === "boleta" ? "comprobante" : nombreBoleta}. Lo que cargues ahí es lo que vale.`}>
                    Sacar un plan de pago
                  </button>
                )}
                {d.plan && <PlanResumen plan={d.plan} money={money} onAbrir={() => onAbrirPlan(d.plan!.deudaId)} />}
              </div>
            ))}
            <div data-cruce style={{ fontSize: 12.5, color: "#475569" }}>
              Lo que vale es lo cargado: <b style={{ color: "#0f172a" }}>{money(mes.cargado)}</b>. El sistema calculaba {money(mes.calculado)}
              {Math.abs(mes.diferencia) <= 1 ? " (coincide)." : ` (${money(Math.abs(mes.diferencia))} ${mes.diferencia > 0 ? "menos" : "más"}; es solo informativo).`}
            </div>
          </div>
        )}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: lectura ? 6 : 12 }}>
          <button type="button" style={{ ...btn, background: "#0f172a", color: "#fff", border: "none" }} onClick={onCargarBoleta}>
            + Cargar {nombreBoleta} de {mesLindo(mes.mes)} a mano
          </button>
          {onLeerPdf && (
            <>
              <button
                type="button"
                style={btn}
                disabled={leyendo}
                onClick={() => archivo.current?.click()}
                title={mes.docs.length ? "Lee el PDF y lo compara con lo ya cargado, para comprobar que está bien" : "Lee el PDF y abre la ficha con lo leído, para revisar"}
              >
                📄 {mes.docs.length ? "Controlar con el PDF" : "Leer el PDF del pago"}
              </button>
              <input
                ref={archivo}
                data-leer-pdf
                type="file"
                accept="application/pdf,.pdf,image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) leer(file);
                }}
              />
            </>
          )}
        </div>
        {lectura && (
          <div data-lectura style={{ fontSize: 12.5, color: "#1e3a8a", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "6px 10px", marginBottom: 12, whiteSpace: "pre-line" }}>
            {lectura}
          </div>
        )}

        {detalle.map((g) => (
          <details key={g.titulo} style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", marginBottom: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13 }}>
              {g.titulo} · {money(g.total)} <span style={{ fontWeight: 400, color: "#64748b" }}>({g.filas.length})</span>
            </summary>
            {g.nota && <div style={{ fontSize: 12, color: "#64748b", margin: "4px 0" }}>{g.nota}</div>}
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 4 }}>
              <tbody>
                {g.filas.map((f, i) => (
                  <tr key={i}>
                    <td style={{ ...td, textAlign: "left", width: 80 }}>{fechaLinda(f.fecha)}</td>
                    <td style={{ ...td, textAlign: "left", whiteSpace: "normal" }}>{f.texto}</td>
                    <td style={td}>{money(f.monto)}</td>
                  </tr>
                ))}
                {g.filas.length === 0 && (
                  <tr><td style={{ ...td, textAlign: "left", color: "#64748b" }} colSpan={3}>Nada cargado en este mes.</td></tr>
                )}
              </tbody>
            </table>
          </details>
        ))}
      </div>
    </div>
  );
}
