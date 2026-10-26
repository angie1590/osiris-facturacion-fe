import { FormField } from "./FormField";
import { Input } from "@/components/ui/input";

export interface CommonField {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "date" | "number" | "url" | "select";
  required?: boolean;
  disabled?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  step?: string;
  options?: Array<{ value: string; label: string }>;
}

export function ConfigurableFields({
  fields,
  values,
  onChange,
  errors = {},
  disabled = false,
}: {
  fields: CommonField[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  errors?: Record<string, string>;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <FormField
          key={field.name}
          label={field.label}
          required={field.required}
          error={errors[field.name]}
        >
          {field.type === "select" ? (
            <select
              className="h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm"
              required={field.required}
              disabled={disabled || field.disabled}
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
            >
              <option value="">Seleccionar</option>
              {field.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={field.type ?? "text"}
              required={field.required}
              disabled={disabled || field.disabled}
              min={field.min}
              max={field.max}
              minLength={field.minLength}
              step={field.step}
              autoComplete={
                field.type === "password" ? "new-password" : undefined
              }
              value={values[field.name] ?? ""}
              onChange={(event) => onChange(field.name, event.target.value)}
            />
          )}
        </FormField>
      ))}
    </div>
  );
}
