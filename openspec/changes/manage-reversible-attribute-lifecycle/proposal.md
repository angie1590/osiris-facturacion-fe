## Why

La pantalla de Atributos permite crear y listar, pero no corregir una definición ni recuperar cambios que afecten productos. Operadores necesitan editar metadatos, entender el alcance de una conversión y dar de baja/reactivar sin perder asignaciones o valores históricos.

## What Changes

- Integrar edición y baja lógica de atributos en el panel de atributos de `/categorias`, sin una página de administración separada.
- Mantener `/atributos` como redirección de compatibilidad hacia `/categorias`.
- Antes de guardar cambios, consultar el impacto en categorías, valores de productos y remapeos; los cambios de tipo requieren confirmación explícita.
- Mostrar remapeos que requerirán intervención y permitir reversión de la operación solo cuando el backend confirme que el estado no cambió posteriormente.
- Mostrar dependencias/bloqueos y preservar el formulario si backend devuelve `409`, `422` o un error de red.
- Usar componentes comunes existentes o extensiones exclusivamente en `src/components/shared`/`src/components/ui`; prohibidos componentes visuales privados.

## Capabilities

### New Capabilities

- `attribute-lifecycle-ui`: edición, vista previa, baja lógica, reactivación y reversión segura en la pantalla común de Atributos.

### Modified Capabilities

Ninguna spec principal existente. No crear una pantalla paralela ni editar formularios de producto.

## Impact

- Frontend: `src/pages/CategoriasPage.tsx`, componentes compartidos, permisos y pruebas.
- Depende del cambio backend `manage-reversible-attribute-lifecycle` y sus contratos OpenAPI.
- No cambia el flujo EAV del formulario de Producto ni reglas tributarias/SRI.
