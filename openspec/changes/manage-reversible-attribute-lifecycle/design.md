## Context

El panel de atributos de `CategoriasPage` muestra asignaciones propias y heredadas. Backend `PUT /atributos/{id}` edita y convierte valores; conversiones no compatibles se registran en remapeos. No hay preview ni undo de conversiones exitosas. Categorías asignan atributos por herencia, por lo que los cambios repercuten en múltiples productos.

## Goals / Non-Goals

**Goals:** permitir corregir definición, anticipar impacto, preservar valores/historial, revertir exactamente un estado no modificado y exponer baja/reactivación lógica sin borrar físicamente.

**Non-Goals:** crear UI paralela, editar valores de producto desde maestro, borrar EAV físicamente, deshacer ediciones posteriores, purgar historial, tocar cantidades/inventario/documentos o alterar validación fiscal.

## Decisions

- Consumir API backend con `previsualizar`, `reversion`, `revertir`, `reactivar`, PUT/DELETE existentes. Toda respuesta de conflicto mantiene el formulario y los valores.
- Abrir edición desde el menú de cada fila dentro de `CategoriasPage`, reutilizando su `DetailModal`, `FormField`, `Button` y `ConfirmDialog`; tras guardar, invalidar atributos/asignaciones y permanecer en la categoría seleccionada.
- Obtener preview cuando la definición propuesta es válida. Para cambios de tipo/restricciones con valores afectados, mostrar conteos convertibles/remapeables y confirmar antes del PUT.
- En cada fila mostrar un menú triangular con Editar y Eliminar. La baja es global y debe confirmarse; `/atributos` redirige a `/categorias` en vez de montar una página aparte.
- Mostrar botón de undo si backend informa snapshot reversible; el servidor es autoridad final y puede devolver 409 si el estado cambió mientras el diálogo estaba abierto.
- Remapeos pendientes permanecen en su pantalla común; no se resuelven automáticamente al cerrar el formulario.

## Risks / Trade-offs

- Atributos con muchas opciones -> preview debe resumir conteos y el detalle no exponer miles de valores.
- Usuarios concurrentes -> invalidar lista/historial después de edit, delete, undo y reactivate; manejar 409 actualizando estado.
- Form dirty al cerrar -> confirmar descarte solo si hay cambios locales.
- API legacy sin snapshot -> mostrar el conflicto de reactivación en lenguaje claro y evitar reactivar parcialmente.

## Migration Plan

1. Implementar contrato backend y OpenAPI.
2. Integrar edición inline, preview y confirmación en Categorías; al terminar, refrescar esa misma vista sin navegación.
3. Añadir baja lógica con confirmación global y manejar conflictos sin perder la categoría seleccionada.
4. Probar UI completa y responsive contra fixtures; E2E de conversión y reversión usando backend real después de migrar desarrollo.

Rollback: ocultar las nuevas acciones y mantener listado/creación; no usar endpoints de reactivación genérica ni reconstruir Persona/atributos por dos llamadas.

## Open Questions

Ninguna para este incremento; el endpoint devolverá el motivo exacto cuando el undo ya no sea seguro.
