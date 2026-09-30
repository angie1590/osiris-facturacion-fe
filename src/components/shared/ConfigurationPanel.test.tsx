import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ConfigurationNotice } from "./ConfigurationNotice";
import { ConfigurationPanel } from "./ConfigurationPanel";

describe("ConfigurationPanel", () => {
  it("renderiza título, descripción y contenido", () => {
    render(
      <ConfigurationPanel title="Empresa" description="Datos tributarios">
        <p>Formulario</p>
      </ConfigurationPanel>,
    );
    expect(screen.getByText("Empresa")).toBeInTheDocument();
    expect(screen.getByText("Datos tributarios")).toBeInTheDocument();
    expect(screen.getByText("Formulario")).toBeInTheDocument();
  });

  it("permite contraer y expandir el contenido", async () => {
    const user = userEvent.setup();
    render(
      <ConfigurationPanel title="Facturación" collapsible>
        <p>Opciones</p>
      </ConfigurationPanel>,
    );
    await user.click(screen.getByRole("button", { name: "Contraer sección" }));
    expect(screen.queryByText("Opciones")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expandir sección" }));
    expect(screen.getByText("Opciones")).toBeInTheDocument();
  });
});

describe("ConfigurationNotice", () => {
  it("expone una advertencia con acción", () => {
    render(
      <ConfigurationNotice
        title="Configuración incompleta"
        description="Faltan datos tributarios"
        action={<button>Resolver</button>}
      />,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resolver" })).toBeInTheDocument();
  });
});