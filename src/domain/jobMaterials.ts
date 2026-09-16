// QUE MATERIALES SE COTIZARON EN UN TRABAJO, SUBPRESUPUESTO POR SUBPRESUPUESTO.
//
// Pedido de Nicolas (2026-09-15): desde Trabajos aprobados, en el detalle, poder ver los materiales
// cotizados con SOLO cantidad y descripcion, separados por subpresupuesto (boton "Resumen de
// materiales"). Sin precios: es la lista para saber que lleva el trabajo, no el costo.
//
// El dato ya vive en el snapshot del presupuesto (cada bloque guarda sus materiales e insumos), pero
// despues de aprobar no se muestra en ningun lado. Aca se junta en una sola forma, igual que hace
// domain/jobDescription con la descripcion del trabajo: si manana cambia de donde sale, se toca solo
// esta funcion.

export type TipoDeMaterial = "material" | "insumo";

export type FilaDeMaterial = {
  descripcion: string;
  unidad: string;
  // Lo cotizado para UNA unidad del bloque (el bloque se cotiza como 1 y se escala x N).
  cantidadPorUnidad: number;
  // Lo que realmente lleva el trabajo: cantidadPorUnidad x las N unidades del bloque.
  cantidad: number;
  tipo: TipoDeMaterial;
};

export type BloqueDeMateriales = {
  titulo: string;
  notas: string;
  // N unidades identicas cotizadas en el bloque (ausente o <=0 en el dato viejo => 1).
  unidades: number;
  moneda: "ARS" | "USD";
  filas: FilaDeMaterial[];
};

export type ResumenDeMateriales = {
  bloques: BloqueDeMateriales[];
  // El mismo material sumado entre todos los bloques (para la compra).
  consolidado: FilaDeMaterial[];
  vacio: boolean;
};

const texto = (v: unknown): string => String(v ?? "").trim();
const numero = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// Identidad de un material para juntar repetidos: descripcion + unidad, sin distinguir
// mayusculas ni espacios de mas.
const claveDeFila = (descripcion: string, unidad: string): string =>
  `${descripcion.toLowerCase().replace(/\s+/g, " ")}__${unidad.toLowerCase().trim()}`;

// Junta las filas repetidas sumando cantidades y respeta el orden en que aparecen cotizadas.
const juntarFilas = (filas: FilaDeMaterial[]): FilaDeMaterial[] => {
  const porClave = new Map<string, FilaDeMaterial>();
  filas.forEach((fila) => {
    const clave = claveDeFila(fila.descripcion, fila.unidad);
    const previa = porClave.get(clave);
    if (previa) {
      previa.cantidadPorUnidad += fila.cantidadPorUnidad;
      previa.cantidad += fila.cantidad;
    } else {
      porClave.set(clave, { ...fila });
    }
  });
  return Array.from(porClave.values());
};

const filasDeBloque = (bloque: any, unidades: number): FilaDeMaterial[] => {
  const desde = (lista: any, tipo: TipoDeMaterial): FilaDeMaterial[] =>
    (Array.isArray(lista) ? lista : [])
      .map((item: any) => {
        const cantidadPorUnidad = numero(item?.qty);
        return {
          descripcion: texto(item?.description),
          unidad: texto(item?.unit),
          cantidadPorUnidad,
          cantidad: cantidadPorUnidad * unidades,
          tipo,
        };
      })
      // Una fila sin descripcion es un renglon vacio de la planilla del presupuesto: no se muestra.
      .filter((fila) => fila.descripcion !== "");

  return juntarFilas([
    ...desde(bloque?.materials, "material"),
    ...desde(bloque?.basicSupplies, "insumo"),
  ]);
};

// Firma del contenido de un bloque, para detectar el bloque suelto duplicado (ver abajo).
const firmaDeBloque = (filas: FilaDeMaterial[]): string =>
  filas
    .map((f) => `${claveDeFila(f.descripcion, f.unidad)}=${f.cantidadPorUnidad}`)
    .sort()
    .join("|");

export function resumirMaterialesDelTrabajo(job: any): ResumenDeMateriales {
  const snap = job?.snapshot || {};
  const subs: any[] = Array.isArray(snap.subBudgets) ? snap.subBudgets : [];

  const bloques: BloqueDeMateriales[] = subs
    .map((sub, i) => {
      const unidades = numero(sub?.quantity) > 0 ? numero(sub.quantity) : 1;
      return {
        titulo: texto(sub?.title) || `Subpresupuesto ${i + 1}`,
        notas: texto(sub?.notes),
        unidades,
        moneda: sub?.currency === "USD" ? ("USD" as const) : ("ARS" as const),
        filas: filasDeBloque(sub, unidades),
      };
    })
    .filter((b) => b.filas.length > 0);

  // El bloque que quedo en edicion (snapshot.materials / basicSupplies) tambien es parte del
  // presupuesto: los totales consolidados lo suman. Pero al guardar un subpresupuesto el contenido
  // QUEDA en pantalla, asi que puede venir repetido; si su contenido es identico al de un bloque ya
  // listado, no se muestra dos veces (una lista de compra duplicada haria comprar de mas).
  const sueltas = filasDeBloque(snap, 1);
  if (sueltas.length > 0) {
    const firma = firmaDeBloque(sueltas);
    const yaEsta = bloques.some((b) => b.unidades === 1 && firmaDeBloque(b.filas) === firma);
    if (!yaEsta) {
      bloques.push({
        titulo: subs.length > 0 ? "Bloque sin guardar como subpresupuesto" : "Presupuesto",
        notas: "",
        unidades: 1,
        moneda: "ARS",
        filas: sueltas,
      });
    }
  }

  // En el consolidado el "por unidad" no significa nada (son bloques distintos): se iguala al total
  // para que nadie lo lea como una cantidad aparte.
  const consolidado = juntarFilas(bloques.flatMap((b) => b.filas)).map((f) => ({
    ...f,
    cantidadPorUnidad: f.cantidad,
  }));

  return { bloques, consolidado, vacio: bloques.length === 0 };
}
