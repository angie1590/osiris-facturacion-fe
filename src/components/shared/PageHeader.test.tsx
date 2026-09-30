import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./PageHeader";

describe("PageHeader", () => {
  it("renderiza título, descripción y acciones compartidas", () => {
    render(
      <PageHeader
        title="Empresa"
        description="Configuración tributaria"
        actions={<button>Guardar cambios</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "Empresa" })).toBeInTheDocument();
    expect(screen.getByText("Configuración tributaria")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar cambios" }),
    ).toBeInTheDocument();
  });
});