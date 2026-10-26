import { describe, expect, it } from "vitest";
import type { Categoria } from "./api";
import { getAtributosAplicables, type CategoriaAtributo } from "./atributos-herencia";

const category = (id: string, parent_id: string | null): Categoria => ({
  id,
  nombre: id,
  es_padre: parent_id === null,
  is_default: false,
  parent_id,
  activo: true,
});

const assignment = (
  id: string,
  categoria_id: string,
  atributo_id: string,
  valor_default: string | null,
): CategoriaAtributo => ({
  id,
  categoria_id,
  atributo_id,
  obligatorio: false,
  valor_default,
});

describe("getAtributosAplicables", () => {
  it("combines own and inherited attributes, preferring the closest assignment", () => {
    const technology = category("technology", null);
    const mouse = category("mouse", technology.id);
    const categories = [technology, mouse];
    const assignments = [
      assignment("root-color", technology.id, "color", "black"),
      assignment("root-brand", technology.id, "brand", null),
      assignment("mouse-color", mouse.id, "color", "white"),
      assignment("mouse-dpi", mouse.id, "dpi", "1600"),
    ];

    const result = getAtributosAplicables(mouse, categories, assignments);

    expect(result).toHaveLength(3);
    expect(result.find((item) => item.atributo_id === "color")).toMatchObject({
      id: "mouse-color",
      categoria_origen_id: mouse.id,
      profundidad: 0,
      valor_default: "white",
    });
    expect(result.find((item) => item.atributo_id === "brand")).toMatchObject({
      categoria_origen_id: technology.id,
      profundidad: 1,
    });
    expect(result.find((item) => item.atributo_id === "dpi")).toMatchObject({
      categoria_origen_id: mouse.id,
      profundidad: 0,
    });
  });

  it("stops safely if category data contains a parent cycle", () => {
    const first = category("first", "second");
    const second = category("second", first.id);

    expect(getAtributosAplicables(first, [first, second], [])).toEqual([]);
  });
});