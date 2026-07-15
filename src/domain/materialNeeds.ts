// Faltante de materiales POR TRABAJO.
//
// El stock es compartido entre trabajos: si dos trabajos piden el mismo material y solo alcanza
// para uno, no puede figurar como cubierto en los dos. Por eso el stock se REPARTE en orden de
// fecha de inicio (el que arranca antes se lo lleva primero) y cada trabajo ve como disponible
// solo lo que quedo despues de servir a los anteriores. Asi el faltante por trabajo suma exacto
// el faltante agregado de la vista por material (stockNeedRows).
//
// Un material sin match en stock (stockKey null) cuenta como disponible 0: todo es faltante.
// Puro y sin dependencias: el llamador resuelve el match contra stock y pasa el resultado.

export type NeedMaterialInput = {
  description: string;
  unit: string;
  qty: number;
  unitPrice: number;
  stockKey: string | null; // identidad del item de stock ya resuelta (null = sin match)
  stockQty: number; // cantidad total en stock de ese item, antes de repartir
};

export type NeedJobInput = {
  id: number;
  startDate: string; // "" = sin fecha, va al final del reparto
  materials: NeedMaterialInput[];
};

export type JobMaterialNeedRow = {
  description: string;
  unit: string;
  required: number;
  allocated: number; // lo que este trabajo se lleva del stock
  missing: number;
  unitPrice: number;
  estimatedCost: number; // solo el faltante: lo que ya esta en stock no se vuelve a comprar
};

export type JobMaterialNeed = {
  jobId: number;
  rows: JobMaterialNeedRow[];
  missingRows: JobMaterialNeedRow[];
  missingCount: number;
  estimatedCost: number;
};

// Los trabajos sin fecha de inicio van ultimos: no compiten por stock con los que ya arrancaron.
const NO_START_DATE = "9999-12-31";

export function allocateMaterialNeeds(jobs: NeedJobInput[]): JobMaterialNeed[] {
  // Stock que queda sin comprometer, por item. Se llena en el primer material que lo toca.
  const remaining = new Map<string, number>();

  const order = [...jobs].sort((a, b) => {
    const aDate = a.startDate || NO_START_DATE;
    const bDate = b.startDate || NO_START_DATE;
    if (aDate !== bDate) return aDate.localeCompare(bDate);
    return a.id - b.id; // desempate estable
  });

  const byJob = new Map<number, JobMaterialNeed>();

  order.forEach((job) => {
    const rows: JobMaterialNeedRow[] = [];

    job.materials.forEach((material) => {
      const required = Math.max(0, Number(material.qty || 0));
      const key = material.stockKey;

      let available = 0;
      if (key) {
        if (!remaining.has(key)) {
          remaining.set(key, Math.max(0, Number(material.stockQty || 0)));
        }
        available = remaining.get(key) as number;
      }

      const allocated = Math.min(required, available);
      if (key) remaining.set(key, available - allocated);

      const missing = required - allocated;
      const unitPrice = Number(material.unitPrice || 0);
      rows.push({
        description: material.description,
        unit: material.unit,
        required,
        allocated,
        missing,
        unitPrice,
        estimatedCost: missing * unitPrice,
      });
    });

    const missingRows = rows.filter((row) => row.missing > 0);
    byJob.set(job.id, {
      jobId: job.id,
      rows,
      missingRows,
      missingCount: missingRows.length,
      estimatedCost: missingRows.reduce((acc, row) => acc + row.estimatedCost, 0),
    });
  });

  // Se devuelve en el orden de entrada; el reparto ya se resolvio por fecha.
  return jobs.map((job) => byJob.get(job.id) as JobMaterialNeed);
}
