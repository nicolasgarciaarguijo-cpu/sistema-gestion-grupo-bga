export type SemaphoreLevel = "verde" | "amarillo" | "rojo";

export const SEMAPHORE_PALETTE: Record<SemaphoreLevel, { color: string; soft: string }> = {
  verde: { color: "#16a34a", soft: "rgba(22,163,74,0.15)" },
  amarillo: { color: "#f59e0b", soft: "rgba(245,158,11,0.15)" },
  rojo: { color: "#dc2626", soft: "rgba(220,38,38,0.15)" },
};
