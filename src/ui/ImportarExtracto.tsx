// IMPORTAR EL EXTRACTO BANCARIO (Nicolas, 18/11/2026: "ahi mismo la carga de los resumenes y extractos").
// Salio de la solapa Bancos para poder vivir ADENTRO del bloque de fichas, al lado del lector de resumenes
// de tarjeta. Es el mismo flujo de siempre: se lee el archivo, se revisa la vista previa (con los
// duplicados marcados) y recien al confirmar entra al espejo bancario.
import React from "react";
import { ButtonLike, FileDropButton } from "./primitives";
import { styles } from "./styles";
import {
  usePlanillaWidths, planillaWrap, planillaTable, colLabel, colDato, colFlexible,
  thEsquina, thColumna, thFlexible, tdNombre, tdDato, tdFlexible, PlanillaManija, inputCelda,
} from "./planilla";
import { money } from "../lib/format";
import { moneyToneColor } from "./primitives";
import type { CostStatementDraftRow } from "../tabs/Costos";

export function ImportarExtracto({
  statementDraft,
  statementMessage,
  statementBusy,
  onStatementFile,
  updateStatementDraftRow,
  commitStatementDraft,
  discardStatementDraft,
  manualGroupOptions,
  NEW_GROUP_OPTION,
  pickGroupOrCreate,
}: {
  statementDraft: CostStatementDraftRow[];
  statementMessage: string;
  statementBusy: boolean;
  onStatementFile: (file: File | null) => void;
  updateStatementDraftRow: (id: number, field: keyof CostStatementDraftRow, value: any) => void;
  commitStatementDraft: () => void;
  discardStatementDraft: () => void;
  // Grupos de costo para clasificar cada renglon (y crear uno nuevo desde el desplegable).
  manualGroupOptions: string[];
  NEW_GROUP_OPTION: string;
  pickGroupOrCreate: (raw: string, apply: (name: string) => void) => void;
}) {
  const anchosExtracto = usePlanillaWidths("bancos.extracto", { label: 340, col: 124, colCompact: 94 });
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {statementDraft.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <ButtonLike onClick={commitStatementDraft}>
            Confirmar {statementDraft.filter((row) => row.include).length} movimiento(s)
          </ButtonLike>
          <ButtonLike onClick={discardStatementDraft} secondary>
            Descartar
          </ButtonLike>
        </div>
      )}
        <FileDropButton
          label={statementBusy ? "Leyendo extracto..." : "Cargar extracto (Excel, PDF o CSV)"}
          accept=".xlsx,.xls,.csv,.tsv,.txt,.pdf"
          onFileSelected={onStatementFile}
        />
        {statementMessage && <div style={styles.sectionNote}>{statementMessage}</div>}

        {statementDraft.length > 0 && (
          <>
            <div style={styles.sectionNote}>
              Reviso los movimientos y te propongo un grupo. Corregi lo que haga falta y confirma:
              solo se cargan los debitos tildados. Los creditos (plata que entra) no son costos.
            </div>
            <div style={{ overflowX: "auto" }}>
              <div style={{ ...planillaWrap, ...anchosExtracto.vars }}>
              <table className="planilla" style={planillaTable}>
                <colgroup>
                  <col style={colLabel} />
                  <col style={colDato} />
                  <col style={colDato} />
                  <col style={colFlexible} />
                </colgroup>
                <thead>
                  <tr>
                    <th style={thEsquina}>
                      Concepto del banco
                      <PlanillaManija
                        onMouseDown={(ev) => anchosExtracto.startResize(ev, "label")}
                        onDoubleClick={anchosExtracto.resetLabel}
                      />
                    </th>
                    <th style={{ ...thColumna, textAlign: "right" }}>
                      Importe
                      <PlanillaManija
                        onMouseDown={(ev) => anchosExtracto.startResize(ev, "col")}
                        onDoubleClick={anchosExtracto.resetCol}
                      />
                    </th>
                    <th style={thColumna}>Fecha</th>
                    <th style={thFlexible}>Grupo · administración</th>
                  </tr>
                </thead>
                <tbody>
                  {statementDraft.map((row) => (
                    <tr key={row.id} style={row.include ? undefined : { opacity: 0.45 }}>
                      <td style={{ ...tdNombre, fontWeight: 400, padding: 0 }} title={row.concept}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                          <input
                            type="checkbox"
                            checked={row.include}
                            title="Cargar este movimiento"
                            style={{ flex: "0 0 auto" }}
                            onChange={(e) => updateStatementDraftRow(row.id, "include", e.target.checked)}
                          />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.concept}
                          </span>
                        </span>
                      </td>
                      <td
                        style={{
                          ...tdDato, textAlign: "right", fontWeight: 700,
                          color: moneyToneColor(row.movementType === "debito" ? "out" : "in"),
                        }}
                        title={row.movementType === "debito" ? "Débito" : "Crédito"}
                      >
                        {money(row.amount)}
                      </td>
                      <td style={{ ...tdDato, color: "#475569" }}>{row.date}</td>
                      <td style={{ ...tdFlexible, color: "#64748b", padding: 0 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 8px" }}>
                          <select
                            style={{ ...inputCelda, width: "auto", minWidth: 150 }}
                            value={row.group}
                            onChange={(e) =>
                              pickGroupOrCreate(e.target.value, (name) =>
                                updateStatementDraftRow(row.id, "group", name)
                              )
                            }
                          >
                            <option value="">Sin clasificar</option>
                            {manualGroupOptions.map((group) => (
                              <option key={group} value={group}>
                                {group}
                              </option>
                            ))}
                            <option value={NEW_GROUP_OPTION}>➕ Crear grupo nuevo…</option>
                          </select>
                          <select
                            style={{ ...inputCelda, width: "auto" }}
                            value={row.administration}
                            onChange={(e) => updateStatementDraftRow(row.id, "administration", e.target.value)}
                          >
                            <option value="blanco">Blanco</option>
                            <option value="negro">Negro</option>
                          </select>
                          {row.suggestedVia && row.group && (
                            <span
                              style={{ fontSize: 11, color: "#7c3aed", whiteSpace: "nowrap" }}
                              title="Grupo sugerido por una regla aprendida. Confirmalo o cambialo."
                            >
                              🧠 sugerido{row.supplierName ? ` · ${row.supplierName}` : ""}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          </>
        )}
    </div>
  );
}
