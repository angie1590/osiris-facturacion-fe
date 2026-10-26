import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchOrCreatePersona } from "./SearchOrCreatePersona";
import type { Persona, PersonaSelection } from "@/features/personas/api";

function Harness({
  lookup,
  ruc = false,
}: {
  lookup: (
    identification: string,
    signal: AbortSignal,
  ) => Promise<Persona | null>;
  ruc?: boolean;
}) {
  const [value, setValue] = useState<PersonaSelection>({ kind: "none" });
  return (
    <>
      <input aria-label="Dato padre" defaultValue="Conservado" />
      <SearchOrCreatePersona
        value={value}
        onChange={setValue}
        canCreate
        canReactivate
        forzarRUCnatural={ruc}
        lookup={lookup}
      />
      <output>{value.kind}</output>
    </>
  );
}

describe("SearchOrCreatePersona comun", () => {
  it.each([
    "Cliente",
    "Proveedor Persona",
    "Empleado",
    "Usuario",
    "contacto Sociedad",
  ])("completa y cancela borrador sin perder padre: %s", async (context) => {
    const lookup = vi.fn().mockResolvedValue(null);
    const user = userEvent.setup();
    render(<Harness lookup={lookup} ruc={context === "Proveedor Persona"} />);
    await user.type(
      screen.getByLabelText(/^Identificacion/),
      " 0102030405001 ",
    );
    await user.click(screen.getByRole("button", { name: "Buscar Persona" }));
    await user.type(await screen.findByLabelText(/^Nombre/), "Ana");
    await user.type(screen.getByLabelText(/^Apellido/), "Perez");
    await user.click(screen.getByRole("button", { name: "Completar Persona" }));
    expect(
      screen.getByText("Borrador Persona seleccionado"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Dato padre")).toHaveValue("Conservado");
    expect(lookup).toHaveBeenCalledWith(
      "0102030405001",
      expect.any(AbortSignal),
    );
    await user.click(screen.getByRole("button", { name: "Cancelar Persona" }));
    expect(screen.queryByLabelText(/^Nombre/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Dato padre")).toHaveValue("Conservado");
  });
  it("un fallo de consulta no equivale a ausencia", async () => {
    const user = userEvent.setup();
    render(
      <Harness
        lookup={vi
          .fn()
          .mockRejectedValue({
            response: { data: { detail: "Sin permiso para consultar" } },
          })}
      />,
    );
    await user.type(screen.getByLabelText(/^Identificacion/), "0102030405");
    await user.click(screen.getByRole("button", { name: "Buscar Persona" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sin permiso");
    expect(screen.queryByLabelText(/^Nombre/)).not.toBeInTheDocument();
  });
  it("descarta una respuesta despues de cancelar", async () => {
    let resolve!: (value: Persona | null) => void;
    const user = userEvent.setup();
    render(
      <Harness
        lookup={() =>
          new Promise((done) => {
            resolve = done;
          })
        }
      />,
    );
    await user.type(screen.getByLabelText(/^Identificacion/), "0102030405");
    await user.click(screen.getByRole("button", { name: "Buscar Persona" }));
    await user.click(screen.getByRole("button", { name: "Cancelar busqueda" }));
    resolve(null);
    expect(screen.queryByLabelText(/^Nombre/)).not.toBeInTheDocument();
  });
});
