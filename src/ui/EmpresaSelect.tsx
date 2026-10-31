import React from "react";

// EMPRESA DENTRO DE LA FICHA (Nicolas, 31/10/2026: "todo lo quiero armado con fichas y dentro de las fichas seleccionamos las
// empresas, ahi se hace la separacion"). Un solo selector para todas las fichas: BGA, De Raiz o Ambas (compartido = "General",
// lo ven las dos). Quien opera una sola empresa no puede pasar algo a la otra: solo ve las suyas (y compartido).
export const COMPARTIDO = "General";
export const etiquetaEmpresa = (valor: string | undefined, opciones: Array<{ value: string; short?: string; label?: string }>) =>
  !valor ? "—" : valor === COMPARTIDO ? "Ambas (compartido)" : opciones.find((o) => o.value === valor)?.short || opciones.find((o) => o.value === valor)?.label || valor;

export function EmpresaSelect({
  value,
  onChange,
  opciones,
  compartido = true,
  disabled,
  style,
}: {
  value: string | undefined;
  onChange: (empresa: string) => void;
  opciones: Array<{ value: string; short?: string; label?: string }>;
  // Algunas cosas no pueden ser de las dos (un pago lo hace una sola empresa): ahi va false.
  compartido?: boolean;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  const lista = [...opciones.map((o) => ({ value: o.value, label: o.short || o.label || o.value })), ...(compartido && opciones.length > 1 ? [{ value: COMPARTIDO, label: "Ambas (compartido)" }] : [])];
  const fuera = value && !lista.some((o) => o.value === value);
  return (
    <select
      value={value || ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      title="De qué empresa es: lo compartido lo ven las dos"
      style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "4px 6px", fontSize: 13, background: "#fff", ...style }}
    >
      {!value && <option value="">— Elegir empresa —</option>}
      {lista.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {fuera && <option value={value}>{etiquetaEmpresa(value, opciones)}</option>}
    </select>
  );
}
