// ELEGIR LA TARJETA (Nicolas, 2026-10-23): "cuando elijo como modalidad de pago tarjeta se me deberia desprender
// un listado de las tarjetas existentes en Bancos y Tarjetas, para seleccionar desde cual sale. Y al
// seleccionarla se vincula automaticamente con el banco que la respalda." Se usa en todos los pagos a un
// proveedor (factura, pago a cuenta, cuota de deuda). Con credito pide tambien las cuotas.
import React from "react";
import NumInput from "./NumInput";

export type TarjetaOpt = { id: number; name: string; company: string; bank: string; cuentaId?: string; cuentaNombre?: string };

export const esPagoConTarjeta = (metodo?: string) => metodo === "tarjeta_credito" || metodo === "tarjeta_debito";

export function SelectorTarjeta({
  tarjetas,
  company,
  metodo,
  tarjetaId,
  cuotas,
  onChange,
  labelStyle,
  inputStyle,
}: {
  tarjetas: TarjetaOpt[];
  company: string;
  metodo: string;
  tarjetaId?: number;
  cuotas?: number;
  // Al elegir la tarjeta se manda tambien la cuenta del banco que la respalda.
  onChange: (patch: { tarjetaId?: number; cuentaId?: string; cuotas?: number }) => void;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
}) {
  if (!esPagoConTarjeta(metodo)) return null;
  const deEmpresa = tarjetas.filter((t) => t.company === company);
  const lista = deEmpresa.length ? deEmpresa : tarjetas;
  const elegida = tarjetas.find((t) => t.id === tarjetaId);
  return (
    <>
      <label style={labelStyle}>
        Tarjeta
        <select
          style={{ ...inputStyle, ...(elegida ? {} : { borderColor: "#f87171", background: "#fef2f2" }) }}
          value={tarjetaId ?? ""}
          onChange={(e) => {
            const t = tarjetas.find((x) => x.id === Number(e.target.value));
            onChange({ tarjetaId: t?.id, cuentaId: t?.cuentaId });
          }}
        >
          <option value="">{tarjetas.length ? "— Elegí la tarjeta —" : "— No hay tarjetas en Bancos y tarjetas —"}</option>
          {lista.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.bank ? ` · ${t.bank}` : ""}
            </option>
          ))}
        </select>
        {elegida && (
          <span style={{ fontSize: 11, fontWeight: 600, color: elegida.cuentaId ? "#166534" : "#b91c1c" }}>
            {elegida.cuentaId ? `Sale de ${elegida.cuentaNombre || "la cuenta del banco"}` : `No hay cuenta de ${elegida.bank || "su banco"} en Cuentas: creala para vincularla`}
          </span>
        )}
      </label>
      {metodo === "tarjeta_credito" && (
        <label style={labelStyle} title="La compra se carga por el total: el sistema espera una cuota (total ÷ cuotas) en cada resumen">
          Cuotas
          <NumInput style={inputStyle} value={cuotas || 1} onChange={(e) => onChange({ cuotas: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} />
        </label>
      )}
    </>
  );
}
