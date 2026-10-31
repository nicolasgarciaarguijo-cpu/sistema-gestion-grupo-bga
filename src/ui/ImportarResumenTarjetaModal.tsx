// LEER UN RESUMEN DE TARJETA (Nicolas, 2026-10-31). Despues de leer el PDF se muestra lo leido antes de
// guardar: la empresa (siempre se pregunta, BGA o De Raiz), la tarjeta (cuenta del resumen), las tarjetas
// fisicas con su responsable —si el banco cambio el plastico se reconoce por el responsable y quedan los dos
// numeros— y si el resumen cierra al centavo. Al confirmar se guarda y se abre la ficha para linkear.
import React, { useMemo, useState } from "react";
import type { ResumenLeido } from "../domain/lectorResumenTarjeta";
import { plasticoDe, type TarjetaF, type ResumenF } from "../domain/fichaTarjeta";
import { Z_FICHA, ddmm } from "./VinculoUi";

export type DecisionImportacion = {
  company: string;
  cuentaId: number | null; // null = crear la tarjeta
  plasticos: Array<{ digits: string; holder: string; tarjetaId: number | null; cambioDeNumero: boolean }>;
};

const lbl: React.CSSProperties = { display: "grid", gap: 4, fontSize: 12.5, fontWeight: 700, color: "#334155" };
const input: React.CSSProperties = { padding: "6px 8px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 13 };

export function ImportarResumenTarjetaModal({
  leido,
  archivo,
  empresaSugerida,
  companyOptions,
  tarjetas,
  resumenes,
  money,
  onConfirmar,
  onCerrar,
}: {
  leido: ResumenLeido;
  archivo: string;
  empresaSugerida: string;
  companyOptions: Array<{ value: string; label: string }>;
  tarjetas: TarjetaF[];
  resumenes: ResumenF[];
  money: (n: number, moneda?: string) => string;
  onConfirmar: (d: DecisionImportacion) => void;
  onCerrar: () => void;
}) {
  const [company, setCompany] = useState(empresaSugerida);
  const cuentasEmpresa = useMemo(() => tarjetas.filter((t) => t.company === company && t.cuentaTarjetaId == null), [tarjetas, company]);
  const sugerida = useMemo(() => {
    const porNumero = cuentasEmpresa.find((t) => t.numeroCuenta && t.numeroCuenta === leido.numeroCuenta);
    if (porNumero) return porNumero.id;
    const banco = leido.banco.toLowerCase();
    const prod = leido.producto.toLowerCase();
    const conResumen = cuentasEmpresa.filter((t) => resumenes.some((s) => s.cardId === t.id) && t.bank.toLowerCase().includes(banco));
    const porNombre = conResumen.find((t) => t.name.toLowerCase().includes(prod.replace("visa ", ""))) || (conResumen.length === 1 ? conResumen[0] : undefined);
    return porNombre ? porNombre.id : null;
  }, [cuentasEmpresa, leido, resumenes]);
  const [cuentaId, setCuentaId] = useState<number | null>(sugerida);
  React.useEffect(() => setCuentaId(sugerida), [sugerida]);

  const plasticos = leido.tarjetas.map((t) => {
    const m = cuentaId != null ? plasticoDe(cuentaId, t.digits, t.holder, tarjetas, resumenes) : null;
    return { digits: t.digits, holder: t.holder, tarjetaId: m ? m.tarjeta.id : null, cambioDeNumero: !!m?.cambioDeNumero, nombre: m ? m.tarjeta.responsable || m.tarjeta.name : "", anterior: m?.tarjeta.lastDigits || "" };
  });
  const yaCargado = cuentaId != null ? resumenes.find((s) => s.cardId === cuentaId && s.closingDate === leido.closingDate) : undefined;
  const cierra = Math.abs(leido.diferenciaArs) < 0.02 && Math.abs(leido.diferenciaUsd) < 0.02;
  const consumos = leido.renglones.filter((r) => r.tipo === "consumo").length;
  const cargos = leido.renglones.filter((r) => r.tipo === "cargo").length;
  const ok = !!company && !!leido.closingDate && !yaCargado;

  return (
    <div onClick={onCerrar} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.5)", zIndex: Z_FICHA, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 12px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, width: "min(760px, 100%)", padding: 18, display: "grid", gap: 12, boxShadow: "0 20px 50px rgba(0,0,0,0.25)" }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>
            Resumen leído · {leido.producto} {leido.banco}
          </div>
          <div style={{ fontSize: 12.5, color: "#64748b" }}>
            {archivo} · cuenta {leido.numeroCuenta || "—"} · {leido.titular}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, fontSize: 13 }}>
          <div>
            Cierre <b>{ddmm(leido.closingDate)}</b>
          </div>
          <div>
            Vence (día de pago) <b>{ddmm(leido.dueDate)}</b>
          </div>
          <div>
            A pagar <b>{money(leido.totalArs)}</b>
            {leido.totalUsd ? <> + <b>{money(leido.totalUsd, "USD")}</b></> : null}
          </div>
          <div>
            {consumos} consumo(s) · {cargos} cargo(s)
          </div>
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: cierra ? "#166534" : "#b91c1c" }}>
          {cierra
            ? "✓ Cierra al centavo: saldo anterior + renglones = saldo actual."
            : `✗ No cierra: diferencia ${money(leido.diferenciaArs)}${leido.diferenciaUsd ? ` / ${money(leido.diferenciaUsd, "USD")}` : ""}. Se puede guardar igual y revisar en la ficha.`}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <label style={lbl}>
            Empresa (¿BGA o De Raíz?)
            <select style={input} value={company} onChange={(e) => setCompany(e.target.value)}>
              <option value="">— Elegí la empresa —</option>
              {companyOptions
                .filter((c) => c.value !== "General")
                .map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
            </select>
          </label>
          <label style={lbl}>
            Tarjeta (cuenta del resumen)
            <select style={input} value={cuentaId ?? ""} onChange={(e) => setCuentaId(e.target.value ? Number(e.target.value) : null)}>
              <option value="">+ Crear «{leido.producto} · {leido.banco}»</option>
              {cuentasEmpresa.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} · {t.bank}
                  {t.numeroCuenta ? ` · ${t.numeroCuenta}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Tarjetas físicas del resumen</div>
          {plasticos.map((x) => (
            <div key={x.digits} style={{ fontSize: 13, padding: "3px 0" }}>
              <b>{x.digits}</b> · {x.holder} —{" "}
              {x.tarjetaId == null ? (
                <span style={{ color: "#1d4ed8" }}>tarjeta nueva: se da de alta con este responsable</span>
              ) : x.cambioDeNumero ? (
                <span style={{ color: "#b45309" }}>
                  cambio de plástico de {x.nombre}: queda {x.digits} y se guarda {x.anterior} como número anterior
                </span>
              ) : (
                <span style={{ color: "#166534" }}>{x.nombre || "ya cargada"}</span>
              )}
            </div>
          ))}
        </div>
        {yaCargado && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "#b91c1c" }}>
            Este resumen ya está cargado (cierre {ddmm(yaCargado.closingDate)}). Abrí su ficha desde Bancos y tarjetas.
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button type="button" onClick={onCerrar} style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", cursor: "pointer" }}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={!ok}
            onClick={() => onConfirmar({ company, cuentaId, plasticos: plasticos.map(({ digits, holder, tarjetaId, cambioDeNumero }) => ({ digits, holder, tarjetaId, cambioDeNumero })) })}
            style={{ padding: "7px 14px", borderRadius: 8, border: "none", background: ok ? "#0f172a" : "#94a3b8", color: "#fff", fontWeight: 700, cursor: ok ? "pointer" : "default" }}
          >
            Guardar y abrir la ficha
          </button>
        </div>
      </div>
    </div>
  );
}
