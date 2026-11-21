// FICHAS DE LINKEO (Nicolas, 2026-10-31) en Bancos y tarjetas: una fila por tarjeta y una por cuenta del banco,
// con lo que falta linkear desde el ejercicio nuevo y el tilde verde. Desde aca se lee el PDF del resumen de la
// tarjeta y se abren las fichas. Reemplaza al "Control de resumenes de tarjeta".
import React, { useRef } from "react";
import { Panel, ButtonLike } from "./primitives";
import { ddmm } from "./VinculoUi";

export type FilaTarjeta = { id: number; nombre: string; empresa: string; resumenes: number; pendientes: number; ultimo?: { closingDate: string; completo: boolean; obligatorio: boolean } };
// Cuenta del banco con movimientos cargados y sin extracto que los corrobore (domain/cuentas.cuentasSinControl).
export type CuentaSinControlFila = { cuentaId: string; nombre: string; empresa: string; desde: string; porExtracto: boolean; dias: number; movimientos: number; monto: string };
export type FilaCuenta = { clave: string; nombre: string; empresa: string; meses: number; pendientes: number; ultimo?: { mes: string; completo: boolean; obligatorio: boolean } };

const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 700, padding: "4px 6px", borderBottom: "1px solid #e2e8f0" };
const td: React.CSSProperties = { padding: "5px 6px", borderBottom: "1px solid #f1f5f9", fontSize: 12.5 };
const btn: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontSize: 12.5, fontWeight: 700 };

const estado = (u: { completo: boolean; obligatorio: boolean } | undefined, pendientes: number) =>
  !u ? <span style={{ color: "#94a3b8" }}>—</span> : pendientes === 0 && (u.completo || !u.obligatorio) ? <b style={{ color: "#166534" }}>✓ revisado y linkeado</b> : <b style={{ color: "#b91c1c" }}>{pendientes} sin linkear</b>;

export function FichasLinkeoPanel({
  tarjetas,
  cuentas,
  leyendo,
  onLeerPdf,
  onAbrirTarjeta,
  onAbrirCuenta,
  importarExtracto,
  onAgregarTarjeta,
  impuestosPendientes,
  escondido,
  sinControl,
}: {
  // 21/11/2026: el banco corrobora solo si se sube el extracto. Estas cuentas tienen plata movida sin control.
  sinControl?: CuentaSinControlFila[];
  tarjetas: FilaTarjeta[];
  cuentas: FilaCuenta[];
  leyendo: string;
  onLeerPdf: (files: File[]) => void;
  onAbrirTarjeta: (id: number) => void;
  onAbrirCuenta: (clave: string) => void;
  // 18/11/2026 (Nicolas): "ese bloque quiero que se llame BANCOS Y TARJETAS y que aglomere ahí toda la
  // información en las fichas. Y ahí mismo la carga de los resúmenes y extractos."
  importarExtracto?: React.ReactNode;
  onAgregarTarjeta?: () => void;
  // Impuestos y comisiones pendientes (el detalle se tilda abajo, en su panel).
  impuestosPendientes?: { cantidad: number; total: string };
  // Lo que el ejercicio elegido deja afuera de la vista (ui/BarraEjercicio.tsx).
  escondido?: React.ReactNode;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const pendTarjetas = tarjetas.reduce((a, t) => a + t.pendientes, 0);
  const pendCuentas = cuentas.reduce((a, c) => a + c.pendientes, 0);
  return (
    <Panel
      span="full"
      abierto
      title={`Bancos y tarjetas · ${pendTarjetas + pendCuentas} sin linkear desde el 1/11/2026`}
      actions={onAgregarTarjeta ? <ButtonLike onClick={onAgregarTarjeta}>Agregar tarjeta</ButtonLike> : undefined}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", marginBottom: 8 }}>
        <button type="button" style={{ ...btn, background: "#0f172a", color: "#fff", border: "none" }} onClick={() => ref.current?.click()}>
          📄 Leer resumen de tarjeta (PDF)
        </button>
        <input
          ref={ref}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          style={{ display: "none" }}
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = "";
            if (files.length) onLeerPdf(files);
          }}
        />
        {leyendo && <span style={{ fontSize: 12.5, color: "#475569" }}>{leyendo}</span>}
        <span style={{ fontSize: 12, color: "#64748b" }}>Patagonia (Visa Business / Corporate) y Santander. El lector separa por tarjeta física y responsable.</span>
      </div>
      {importarExtracto && (
        <details style={{ border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800, fontSize: 13 }}>📥 Importar el extracto del banco</summary>
          <div style={{ marginTop: 8 }}>{importarExtracto}</div>
        </details>
      )}
      {sinControl && sinControl.length > 0 && (
        <div data-aviso="sin-control" style={{ fontSize: 12.5, color: "#7f1d1d", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
          <strong>
            {sinControl.length === 1 ? "1 cuenta del banco sin extracto de control" : `${sinControl.length} cuentas del banco sin extracto de control`}
          </strong>
          {" · el saldo sale solo de lo cargado y nada lo corrobora. Subí el extracto acá arriba."}
          <ul style={{ margin: "4px 0 0", paddingLeft: 18 }}>
            {sinControl.map((s) => (
              <li key={s.cuentaId}>
                <b>{s.nombre}</b> · {s.empresa} ·{" "}
                {s.desde ? `${s.porExtracto ? "último extracto" : "saldo anclado"} el ${s.desde.split("-").reverse().join("/")} (hace ${s.dias} días)` : "nunca se le subió un extracto"} ·{" "}
                {s.movimientos} movimiento{s.movimientos === 1 ? "" : "s"} sin controlar por {s.monto}
              </li>
            ))}
          </ul>
        </div>
      )}
      {impuestosPendientes && impuestosPendientes.cantidad > 0 && (
        <div style={{ fontSize: 12.5, color: "#92400e", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
          <strong>Impuestos y comisiones sin pagar: {impuestosPendientes.total}</strong> en {impuestosPendientes.cantidad} grupo(s)
          · se tildan en «Impuestos y comisiones del extracto y la tarjeta», y los de cada resumen salen en su ficha.
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 14 }}>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>💳 Tarjetas</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Tarjeta</th>
                <th style={th}>Último resumen</th>
                <th style={th}>Estado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {tarjetas.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    No hay tarjetas cargadas.
                  </td>
                </tr>
              )}
              {tarjetas.map((t) => (
                <tr key={t.id}>
                  <td style={td}>
                    <b>{t.nombre}</b> <span style={{ color: "#64748b" }}>· {t.empresa}</span>
                  </td>
                  <td style={td}>{t.ultimo ? `cierre ${ddmm(t.ultimo.closingDate)}` : "—"}</td>
                  <td style={td}>{estado(t.ultimo, t.pendientes)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button type="button" style={btn} onClick={() => onAbrirTarjeta(t.id)}>
                      Abrir ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>🏦 Cuentas (extractos)</div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>Cuenta</th>
                <th style={th}>Último mes</th>
                <th style={th}>Estado</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.length === 0 && (
                <tr>
                  <td style={td} colSpan={4}>
                    No hay extractos cargados.
                  </td>
                </tr>
              )}
              {cuentas.map((c) => (
                <tr key={c.clave}>
                  <td style={td}>
                    <b>{c.nombre}</b> <span style={{ color: "#64748b" }}>· {c.empresa}</span>
                  </td>
                  <td style={td}>{c.ultimo ? c.ultimo.mes.split("-").reverse().join("/") : "—"}</td>
                  <td style={td}>{estado(c.ultimo, c.pendientes)}</td>
                  <td style={{ ...td, textAlign: "right" }}>
                    <button type="button" style={btn} onClick={() => onAbrirCuenta(c.clave)}>
                      Abrir ficha
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {escondido}
    </Panel>
  );
}
