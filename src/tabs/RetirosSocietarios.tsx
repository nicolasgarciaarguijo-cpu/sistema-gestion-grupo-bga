// RETIROS SOCIETARIOS (bloque de Balance y estado de resultados): lo que retiran los socios, por empresa
// y socio, blanco y negro separados. Cada retiro va al Calendario (EGRESOS · RETIROS SOCIETARIOS) y sale
// de su cuenta. Tambien se crean solos desde el arqueo del cierre de ejercicio.
import React from "react";
import { Panel, ButtonLike } from "../ui/primitives";
import { resumenRetiros } from "../domain/retirosSocietarios";
import type { RetiroSocietario } from "../domain/types";
import { FirmanteCelda } from "../ui/FirmanteSelect";
import { FichaRegistro, BotonFicha, type CampoFicha } from "../ui/FichaRegistro";

// 2026-11-16 (Nicolas): la fila SOLO MUESTRA. El retiro mueve plata (monto, moneda, blanco/negro y de
// que cuenta sale), asi que se corrige en SU FICHA, igual que todo el resto del sistema.
const th: React.CSSProperties = { textAlign: "left", fontSize: 11.5, color: "#64748b", fontWeight: 600, padding: "6px 6px", borderBottom: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "4px 6px", borderBottom: "1px solid #f1f5f9", verticalAlign: "middle" };
const celda: React.CSSProperties = { ...td, fontSize: 12.5, color: "#0f172a", whiteSpace: "nowrap" };
const celdaMonto: React.CSSProperties = { ...celda, textAlign: "right", fontWeight: 700 };
const fechaCorta = (iso?: string) => (iso ? String(iso).slice(0, 10).split("-").reverse().join("/") : "sin fecha");
const etiqueta = (texto: string, fg = "#475569", bg = "#f1f5f9") => (
  <span style={{ fontSize: 11, fontWeight: 700, color: fg, background: bg, borderRadius: 999, padding: "1px 7px", whiteSpace: "nowrap" }}>{texto}</span>
);

export function RetirosSocietariosPanel({
  retiros,
  desde,
  hasta,
  periodoLabel,
  resultado,
  cuentas,
  companyOptions,
  money,
  bloqueado,
  onAdd,
  onUpdate,
  onRemove,
}: {
  retiros: RetiroSocietario[];
  desde: string;
  hasta: string;
  periodoLabel: string;
  resultado?: number; // resultado del periodo (pesos), para mostrar lo que queda despues de los retiros
  cuentas: Array<{ id: string; company: string; nombre: string; moneda?: string; activa?: boolean }>;
  companyOptions: Array<{ value: string; label?: string; short?: string }>;
  money: (n: number, currency?: string) => string;
  bloqueado?: (company: string, iso: string) => boolean;
  onAdd: () => void;
  onUpdate: (id: number, field: keyof RetiroSocietario, value: unknown) => void;
  onRemove: (id: number) => void;
}) {
  const [ficha, setFicha] = React.useState<number | null>(null);
  const resumen = resumenRetiros(retiros as any, desde, hasta);
  const totalPesos = resumen.reduce((a, x) => a + x.total, 0);
  const totalUsd = resumen.reduce((a, x) => a + x.usd, 0);
  const delPeriodo = retiros
    .filter((r) => r.fecha >= desde && r.fecha <= hasta)
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const shortDe = (c: string) => companyOptions.find((o) => o.value === c)?.short || c;
  const socios = Array.from(new Set(retiros.map((r) => r.socio).filter(Boolean))).sort();

  return (
    <Panel title={`Retiros societarios · ${periodoLabel}`} span="full" actions={<ButtonLike onClick={onAdd}>+ Retiro</ButtonLike>}>
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        Lo que retiran los socios. No es un gasto de funcionamiento: sale del resultado. Cada retiro sale de su
        cuenta y va al Calendario en <strong>EGRESOS · RETIROS SOCIETARIOS</strong>. También se asientan solos desde el
        arqueo del cierre de ejercicio.
      </div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
          <div style={{ fontSize: 11.5, color: "#64748b" }}>Retirado en el período</div>
          <div style={{ fontSize: 16, fontWeight: 800 }}>{money(totalPesos)}{totalUsd ? ` + ${money(totalUsd, "USD")}` : ""}</div>
        </div>
        {resultado !== undefined && (
          <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px" }}>
            <div style={{ fontSize: 11.5, color: "#64748b" }}>Resultado del período − retiros (pesos)</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: resultado - totalPesos >= 0 ? "#166534" : "#b91c1c" }}>
              {money(resultado)} − {money(totalPesos)} = {money(resultado - totalPesos)}
            </div>
          </div>
        )}
      </div>

      {resumen.length > 0 && (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, marginBottom: 12 }}>
          <thead>
            <tr>
              <th style={th}>Empresa</th>
              <th style={th}>Socio</th>
              <th style={{ ...th, textAlign: "right" }}>Blanco</th>
              <th style={{ ...th, textAlign: "right" }}>Negro</th>
              <th style={{ ...th, textAlign: "right" }}>Total $</th>
              <th style={{ ...th, textAlign: "right" }}>U$S</th>
            </tr>
          </thead>
          <tbody>
            {resumen.map((x) => (
              <tr key={`${x.company}|${x.socio}`}>
                <td style={td}>{shortDe(x.company)}</td>
                <td style={td}>{x.socio} <span style={{ color: "#94a3b8" }}>({x.cantidad})</span></td>
                <td style={{ ...td, textAlign: "right" }}>{x.blanco ? money(x.blanco) : "—"}</td>
                <td style={{ ...td, textAlign: "right" }}>{x.negro ? money(x.negro) : "—"}</td>
                <td style={{ ...td, textAlign: "right", fontWeight: 800 }}>{money(x.total)}</td>
                <td style={{ ...td, textAlign: "right" }}>{x.usd ? money(x.usd, "USD") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {delPeriodo.length === 0 ? (
        <div style={{ fontSize: 13, color: "#64748b" }}>No hay retiros en el período.</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, minWidth: 860 }}>
            <thead>
              <tr>
                <th style={th}>Fecha</th>
                <th style={th}>Empresa</th>
                <th style={th}>Socio</th>
                <th style={{ ...th, textAlign: "right" }}>Monto</th>
                <th style={th}>Moneda</th>
                <th style={th}>B/N</th>
                <th style={th}>Sale de</th>
                <th style={th}>Motivo</th>
                <th style={th}>Firmante</th>
                <th style={th}></th>
              </tr>
            </thead>
            <tbody>
              {delPeriodo.map((r) => {
                const traba = bloqueado?.(r.company, r.fecha);
                const cuenta = cuentas.find((c) => c.id === r.cuentaId);
                return (
                  <tr
                    key={r.id}
                    style={{ ...(traba ? { opacity: 0.6 } : {}), cursor: "pointer" }}
                    onClick={() => setFicha(r.id)}
                    title={traba ? "Ejercicio cerrado: solo el superadmin puede editarlo. Click: abrir la ficha del retiro" : "Click: abrir la ficha del retiro"}
                  >
                    {/* 2026-11-16: la fila SOLO MUESTRA; todo se corrige en la ficha del retiro. */}
                    <td style={celda}>
                      {fechaCorta(r.fecha)}
                      <BotonFicha onClick={() => setFicha(r.id)} />
                    </td>
                    <td style={celda}>{etiqueta(shortDe(String(r.company)))}</td>
                    <td style={celda}>
                      <strong>{r.socio || <span style={{ color: "#b91c1c" }}>⚠ falta el socio</span>}</strong>
                    </td>
                    <td style={celdaMonto}>{money(Number(r.monto || 0), r.moneda === "USD" ? "USD" : "ARS")}</td>
                    <td style={celda}>{r.moneda === "USD" ? "U$S" : "$"}</td>
                    <td style={celda}>
                      {etiqueta(
                        r.administration === "negro" ? "Negro" : "Blanco",
                        r.administration === "negro" ? "#fff" : "#0f172a",
                        r.administration === "negro" ? "#1f2937" : "#e2e8f0"
                      )}
                    </td>
                    <td style={celda}>
                      {cuenta ? cuenta.nombre : <strong style={{ color: "#b91c1c" }}>⚠ falta la cuenta</strong>}
                    </td>
                    <td style={{ ...td, fontSize: 12.5, color: "#475569" }}>
                      {r.motivo || "—"}
                      {r.origen === "arqueo" && <span style={{ color: "#94a3b8" }}> · del arqueo del cierre</span>}
                    </td>
                    <td style={{ ...td, width: 140 }}>
                      <FirmanteCelda value={r.firmante} firmadoEn={r.firmadoEn} />
                    </td>
                    <td style={{ ...td, width: 40 }} onClick={(ev) => ev.stopPropagation()}>
                      {!traba && (
                        <button
                          type="button"
                          style={{ border: "1px solid #fecaca", background: "#fff", color: "#b91c1c", borderRadius: 6, cursor: "pointer", padding: "2px 7px" }}
                          onClick={() => window.confirm("¿Borrar este retiro?") && onRemove(r.id)}
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {ficha != null &&
        (() => {
          const r = retiros.find((x) => x.id === ficha);
          if (!r) return null;
          const traba = !!bloqueado?.(r.company, r.fecha);
          const campos: CampoFicha[] = [
            { key: "company", label: "Empresa de la que sale la plata", tipo: "empresa", soloLectura: traba },
            { key: "fecha", label: "Fecha", tipo: "fecha", soloLectura: traba },
            { key: "socio", label: "Socio que retira", tipo: "texto", sugerencias: socios, soloLectura: traba, ancho: "completo" },
            { key: "monto", label: "Monto", tipo: "numero", soloLectura: traba },
            {
              key: "moneda",
              label: "Moneda",
              tipo: "select",
              soloLectura: traba,
              opciones: [{ value: "ARS", label: "Pesos" }, { value: "USD", label: "Dólares" }],
            },
            {
              key: "administration",
              label: "Blanco / negro",
              tipo: "select",
              soloLectura: traba,
              opciones: [{ value: "blanco", label: "Blanco" }, { value: "negro", label: "Negro" }],
            },
            {
              key: "cuentaId",
              label: "De qué cuenta sale",
              tipo: "select",
              obligatorio: true,
              vacio: "— Elegí la cuenta —",
              soloLectura: traba,
              opciones: cuentas
                .filter((c) => c.company === r.company && c.activa !== false && (!c.moneda || c.moneda === (r.moneda || "ARS")))
                .map((c) => ({ value: c.id, label: c.nombre })),
            },
            { key: "motivo", label: "Motivo", tipo: "texto", soloLectura: traba, ancho: "completo" },
          ];
          return (
            <FichaRegistro
              titulo={`Retiro societario · ${r.socio || "sin socio"}`}
              subtitulo={
                (r.origen === "arqueo" ? "Lo asentó el arqueo del cierre de ejercicio. " : "") +
                (traba
                  ? "Ejercicio cerrado: solo el superadmin puede cambiarlo."
                  : "No es un gasto: sale del resultado y del saldo de la cuenta que elijas.") +
                (r.firmante ? ` Firmó ${r.firmante}.` : "")
              }
              valores={{ ...r, moneda: r.moneda || "ARS" }}
              campos={campos}
              empresas={companyOptions.filter((c) => c.value !== "General") as any}
              // Cambiar la empresa o la moneda suelta la cuenta: lo hace el propio onUpdate (App), asi la
              // regla vive en un solo lugar.
              onCambiar={(key, valor) => onUpdate(r.id, key as keyof RetiroSocietario, valor)}
              onCerrar={() => setFicha(null)}
            />
          );
        })()}
    </Panel>
  );
}
