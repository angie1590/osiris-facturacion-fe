## Context

`/empresa` ya usa paneles y avisos compartidos. El nuevo flujo se inserta antes de los datos informativos y consume una vista previa backend sin persistencia.

## Goals / Non-Goals

**Goals:**
- Carga accesible y confirmación explícita.
- Mantener el guardado existente como única persistencia.
- Mostrar información detectada no compatible.

**Non-Goals:**
- Parsear PDF en navegador.
- Completar campos sin respaldo del contrato Empresa.

## Decisions

- Mutación multipart centralizada en `features/empresa`.
- Vista previa en `DetailModal` con listas legibles.
- Aplicación mediante `setValue(..., shouldDirty/shouldValidate)`.
- No conservar el objeto File después de procesarlo.

## Risks / Trade-offs

- Certificado desactualizado -> usuario revisa antes de aplicar y guardar.
- Indicador positivo sin resolución -> se aplica el indicador y el formulario exige completar la resolución.