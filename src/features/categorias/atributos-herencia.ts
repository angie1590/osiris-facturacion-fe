import type { Categoria } from "./api";

export interface CategoriaAtributo {
  id: string;
  categoria_id: string;
  atributo_id: string;
  obligatorio: boolean | null;
  valor_default: string | null;
}

export interface AtributoAplicable extends CategoriaAtributo {
  categoria_origen_id: string;
  profundidad: number;
}

export function getAtributosAplicables(
  category: Categoria,
  categories: Categoria[],
  assignments: CategoriaAtributo[],
): AtributoAplicable[] {
  const attributes = new Map<string, AtributoAplicable>();
  const visited = new Set<string>();
  let current: Categoria | undefined = category;
  let depth = 0;

  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    for (const assignment of assignments) {
      if (assignment.categoria_id === current.id && !attributes.has(assignment.atributo_id)) {
        attributes.set(assignment.atributo_id, {
          ...assignment,
          categoria_origen_id: current.id,
          profundidad: depth,
        });
      }
    }
    current = current.parent_id
      ? categories.find((item) => item.id === current?.parent_id)
      : undefined;
    depth += 1;
  }

  return [...attributes.values()];
}