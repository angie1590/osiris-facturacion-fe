import { ConfigurableFields, type CommonField } from "./ConfigurableFields";
import type { PersonaCreateInput } from "@/features/personas/api";

export const emptyPersona: PersonaCreateInput = {
  tipo_identificacion: "CEDULA",
  identificacion: "",
  nombre: "",
  apellido: "",
};
const fields: CommonField[] = [
  {
    name: "tipo_identificacion",
    label: "Tipo de identificacion",
    type: "select",
    required: true,
    options: ["CEDULA", "RUC", "PASAPORTE"].map((value) => ({
      value,
      label: value,
    })),
  },
  { name: "identificacion", label: "Identificacion", required: true },
  { name: "nombre", label: "Nombre", required: true },
  { name: "apellido", label: "Apellido", required: true },
  { name: "direccion", label: "Direccion" },
  { name: "telefono", label: "Teléfono" },
  { name: "ciudad", label: "Ciudad" },
  { name: "email", label: "Email", type: "email" },
];

export function PersonaFields({
  value,
  onChange,
  errors,
  identityReadonly = false,
  disabled = false,
}: {
  value: PersonaCreateInput;
  onChange: (value: PersonaCreateInput) => void;
  errors?: Record<string, string>;
  identityReadonly?: boolean;
  disabled?: boolean;
}) {
  return (
    <ConfigurableFields
      fields={fields.map((field) => ({
        ...field,
        disabled:
          identityReadonly &&
          ["tipo_identificacion", "identificacion"].includes(field.name),
      }))}
      values={{ ...value }}
      onChange={(name, text) => onChange({ ...value, [name]: text })}
      errors={errors}
      disabled={disabled}
    />
  );
}
