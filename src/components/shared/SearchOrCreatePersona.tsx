import { useEffect, useRef, useState } from "react";
import { Search, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "./FormField";
import { PersonaFields, emptyPersona } from "./PersonaFields";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getPersonas,
  normalizeIdentification,
  setPersonaActive,
  type Persona,
  type PersonaCreateInput,
  type PersonaSelection,
  type TipoIdentificacion,
} from "@/features/personas/api";

export interface SearchOrCreatePersonaProps {
  value: PersonaSelection;
  onChange: (value: PersonaSelection) => void;
  forzarRUCnatural?: boolean;
  canCreate: boolean;
  canReactivate: boolean;
  disabled?: boolean;
  errors?: Record<string, string>;
  lookup?: (
    identification: string,
    signal: AbortSignal,
  ) => Promise<Persona | null>;
  reactivate?: (id: string) => Promise<Persona | undefined>;
}

async function lookupPersona(identification: string, signal: AbortSignal) {
  const result = await getPersonas(
    0,
    2,
    false,
    { identificacion: identification },
    signal,
  );
  return result.items[0] ?? null;
}

export function SearchOrCreatePersona({
  value,
  onChange,
  forzarRUCnatural = false,
  canCreate,
  canReactivate,
  disabled,
  errors,
  lookup = lookupPersona,
  reactivate = (id) => setPersonaActive(id, true),
}: SearchOrCreatePersonaProps) {
  const initial =
    value.kind === "existing"
      ? value.persona
      : value.kind === "new"
        ? value.borradorPersona
        : null;
  const [identification, setIdentification] = useState(
    initial?.identificacion ?? "",
  );
  const [type, setType] = useState<TipoIdentificacion>(
    forzarRUCnatural ? "RUC" : (initial?.tipo_identificacion ?? "CEDULA"),
  );
  const [state, setState] = useState<
    "idle" | "loading" | "found" | "absent" | "error"
  >(initial ? "found" : "idle");
  const [found, setFound] = useState<Persona | null>(
    value.kind === "existing" ? value.persona : null,
  );
  const [draft, setDraft] = useState<PersonaCreateInput>(
    value.kind === "new" ? value.borradorPersona : emptyPersona,
  );
  const [error, setError] = useState("");
  const request = useRef(0);
  const controller = useRef<AbortController | null>(null);
  useEffect(
    () => () => {
      request.current++;
      controller.current?.abort();
    },
    [],
  );

  const invalidate = () => {
    request.current++;
    controller.current?.abort();
    setState("idle");
    setFound(null);
    setError("");
    onChange({ kind: "none" });
  };
  const search = async () => {
    const normalized = normalizeIdentification(identification);
    if (!normalized) return;
    invalidate();
    const version = request.current;
    const abort = new AbortController();
    controller.current = abort;
    setIdentification(normalized);
    setState("loading");
    try {
      const persona = await lookup(normalized, abort.signal);
      if (version !== request.current || abort.signal.aborted) return;
      if (persona) {
        setFound(persona);
        setState("found");
        if (
          persona.tipo_identificacion !== type ||
          (forzarRUCnatural &&
            (persona.tipo_identificacion !== "RUC" ||
              !/^\d{13}$/.test(persona.identificacion) ||
              Number(persona.identificacion[2]) >= 6))
        ) {
          setError(
            "La Persona no es compatible con el tipo de identificacion requerido.",
          );
          return;
        }
        if (persona.activo) onChange({ kind: "existing", persona });
      } else {
        setDraft({
          ...emptyPersona,
          tipo_identificacion: type,
          identificacion: normalized,
        });
        setState("absent");
      }
    } catch (failure) {
      if (version !== request.current || abort.signal.aborted) return;
      setError(
        getApiErrorMessage(
          failure,
          "No se pudo consultar Persona. Reintenta la busqueda.",
        ),
      );
      setState("error");
    }
  };
  const restore = async () => {
    if (!found || !canReactivate) return;
    const version = ++request.current;
    setState("loading");
    try {
      const persona = await reactivate(found.id);
      if (version !== request.current) return;
      setState("found");
      if (persona?.activo) {
        setFound(persona);
        onChange({ kind: "existing", persona });
      }
    } catch (failure) {
      if (version !== request.current) return;
      setError(getApiErrorMessage(failure, "No se pudo reactivar Persona."));
      setState("found");
    }
  };
  const completing = state === "absent" || value.kind === "new";
  return (
    <section className="min-w-0 space-y-4" aria-label="Buscar o crear Persona">
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
        <FormField label="Tipo de identificacion" required>
          <select
            className="h-10 min-w-0 rounded-md border bg-background px-3 text-sm"
            value={type}
            disabled={disabled || forzarRUCnatural}
            onChange={(event) => {
              invalidate();
              setType(event.target.value as TipoIdentificacion);
            }}
          >
            {["CEDULA", "RUC", "PASAPORTE"].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </FormField>
        <FormField
          label="Identificacion"
          required
          error={errors?.identificacion}
        >
          <Input
            value={identification}
            disabled={disabled}
            onChange={(event) => {
              invalidate();
              setIdentification(event.target.value);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void search();
              }
            }}
          />
        </FormField>
        <Button
          type="button"
          disabled={disabled || !identification || state === "loading"}
          onClick={() => void search()}
        >
          <Search className="mr-2 h-4 w-4" />
          Buscar Persona
        </Button>
      </div>
      <div aria-live="polite">
        {state === "loading" && "Consultando Persona..."}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {state === "error" && (
        <Button type="button" variant="outline" onClick={() => void search()}>
          Reintentar busqueda
        </Button>
      )}
      {found && (
        <div className="space-y-2 border-l-2 pl-3 text-sm">
          <p className="font-semibold">
            {found.nombre} {found.apellido}
          </p>
          <p>
            {found.identificacion} · {found.email || "Sin email"} ·{" "}
            {found.telefono || "Sin telefono"}
          </p>
          <p>{found.activo ? "Activa" : "Persona inactiva"}</p>
          {!found.activo && canReactivate && !error && (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || state === "loading"}
              onClick={() => void restore()}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reactivar Persona
            </Button>
          )}
        </div>
      )}
      {completing && canCreate && (
        <div className="space-y-3">
          <PersonaFields
            value={draft}
            onChange={(next) => {
              setDraft(next);
              onChange({ kind: "none" });
            }}
            identityReadonly
            errors={errors}
            disabled={disabled}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={
                disabled || !draft.nombre.trim() || !draft.apellido.trim()
              }
              onClick={() =>
                onChange({
                  kind: "new",
                  borradorPersona: {
                    ...draft,
                    nombre: draft.nombre.trim(),
                    apellido: draft.apellido.trim(),
                  },
                })
              }
            >
              Completar Persona
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              onClick={invalidate}
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar Persona
            </Button>
          </div>
          {value.kind === "new" && (
            <p role="status" className="text-sm">
              Borrador Persona seleccionado
            </p>
          )}
        </div>
      )}
      {state === "absent" && !canCreate && (
        <p role="alert">No tienes permiso para crear Persona.</p>
      )}
      {state === "loading" && (
        <Button type="button" variant="outline" onClick={invalidate}>
          Cancelar busqueda
        </Button>
      )}
    </section>
  );
}
