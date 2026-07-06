import React from "react";
import { styles } from "../ui/styles";
import { Panel } from "../ui/primitives";
import { MANUAL_ENTRIES, type ManualBlock, type ManualEntry } from "../content/manual";

type ManualTabProps = {
  userName: string;
  // Solapas visibles del usuario (segun permisos): {key,label}. Define que secciones se muestran.
  visibleTabOptions: { key: string; label: string }[];
};

function Block({ block }: { block: ManualBlock }) {
  if (block.type === "p") {
    return <p style={{ margin: "6px 0", lineHeight: 1.55, color: "#334155" }}>{block.text}</p>;
  }
  if (block.type === "steps") {
    return (
      <ol style={{ margin: "6px 0 6px 18px", lineHeight: 1.55, color: "#334155" }}>
        {block.items.map((it, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{it}</li>
        ))}
      </ol>
    );
  }
  if (block.type === "bullets") {
    return (
      <ul style={{ margin: "6px 0 6px 18px", lineHeight: 1.55, color: "#334155" }}>
        {block.items.map((it, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{it}</li>
        ))}
      </ul>
    );
  }
  if (block.type === "warn") {
    return (
      <div style={{ ...styles.noticeBox, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
        ⚠️ {block.text}
      </div>
    );
  }
  if (block.type === "tip") {
    return (
      <div style={{ ...styles.noticeBox, background: "#eff6ff", borderColor: "#bfdbfe", color: "#1e3a8a" }}>
        💡 {block.text}
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div
        style={{
          border: "2px dashed #cbd5e1",
          borderRadius: 10,
          padding: "18px 12px",
          textAlign: "center",
          color: "#94a3b8",
          background: "#f8fafc",
          margin: "8px 0",
          fontSize: 13,
        }}
      >
        🖼️ Captura pendiente: {block.caption}
      </div>
    );
  }
  // table
  return (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table style={{ ...styles.table, fontSize: 13 }}>
        <thead>
          <tr>
            {block.headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "6px 10px", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: "6px 10px", borderBottom: "1px solid #f1f5f9", color: "#334155" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EntryView({ entry }: { entry: ManualEntry }) {
  return (
    <Panel title={`${entry.emoji}  ${entry.title}`} span="wide">
      <p style={{ margin: "0 0 10px", lineHeight: 1.6, color: "#0f172a", fontWeight: 500 }}>{entry.intro}</p>
      {entry.sections.map((section, si) => (
        <div key={si} style={{ marginTop: 14 }}>
          <div style={{ ...styles.sectionHeader }}>{section.heading}</div>
          {section.blocks.map((block, bi) => (
            <Block key={bi} block={block} />
          ))}
        </div>
      ))}
    </Panel>
  );
}

export function ManualTab({ userName, visibleTabOptions }: ManualTabProps) {
  const byKey = new Map(MANUAL_ENTRIES.map((e) => [e.tabKey, e]));
  // Solapas del usuario para las que hay (o habra) manual, en el orden de la barra. Se excluye la
  // propia solapa Manual.
  const tabs = visibleTabOptions.filter((t) => t.key !== "manual");

  return (
    <div style={styles.column}>
      <Panel title="Manual de operacion" span="wide">
        <p style={{ margin: 0, lineHeight: 1.6, color: "#334155" }}>
          Hola <strong>{userName || "usuario"}</strong>. Este es tu manual, armado con las solapas a las
          que tenes acceso. Cada seccion te explica para que sirve, como operarla, los semaforos y los
          errores comunes. A medida que te habiliten mas solapas, aparecen aca. Las capturas y las
          preguntas frecuentes se van sumando.
        </p>
      </Panel>

      {tabs.map((tab) => {
        const entry = byKey.get(tab.key as ManualEntry["tabKey"]);
        if (entry) return <EntryView key={tab.key} entry={entry} />;
        return (
          <Panel key={tab.key} title={tab.label} span="wide">
            <div style={{ ...styles.muted }}>Seccion en preparacion. La estamos completando.</div>
          </Panel>
        );
      })}
    </div>
  );
}
