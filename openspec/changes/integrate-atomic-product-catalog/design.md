## Context

`/productos` usa `ProductosPage.tsx`: crea el producto y envía EAV después, lee `/categorias-atributos`, usa el listado general de categorías y al editar no hidrata la categoría ni los atributos. El repositorio también conserva `/products` con una UI distinta. Backend continúa siendo autoridad de reglas, permisos, valores, impuestos y precondiciones.

La UI debe mantenerse en español, no duplicar formularios, usar datos legibles y responder bien en carga/error/empty/solo lectura. Cambios del Gate 7.1 solo definen contratos; no se conecta todavía la UI a endpoints nuevos.

## Goals / Non-Goals

**Goals:**
- Usar una única experiencia integral de alta/edición en `/productos`.
- Consumir categorías seleccionables, atributos efectivos y detalle canónico del backend.
- Enviar datos generales, categoría, impuestos y EAV en una sola mutación.
- Hacer explícito el impacto de cambio de categoría y conservar borrador ante rechazos.

**Non-Goals:**
- Rehacer los subflujos independientes de bodegas/proveedores.
- Implementar reglas de dominio o autorización en el cliente.
- Cambiar inventario, impuestos, compras, ventas, SRI o documentos.
- Conectar formularios en el Gate 7.1.

## Decisions

1. **Una única página canónica.** `/productos` aloja el formulario y detalle integrales; paths ingleses de producto redirigen al equivalente español conservando intención (`nuevo`, `detalle`, `editar`). No se mantiene una segunda edición visual. Se elige redirect en vez de sincronizar dos páginas que podrían enviar contratos distintos.

2. **Cliente tipado centrado en contrato.** Añadir funciones/types para categorías seleccionables, atributos efectivos, detalle, alta/edición integral y preview/confirmación. El formulario no llama `/categorias-atributos` ni `saveValoresProducto`; la API backend conserva validación definitiva.

3. **Datos de formulario como borrador estable.** Mantener campos generales y atributos por UUID de `atributo_id`; edición se inicializa desde detalle. Cambiar categoría inicia preview sin mutar el producto. Mientras se obtiene preview, se conserva la categoría guardada y el borrador del usuario.

4. **Render basado en tipo y metadatos.** Mapear `string/integer/decimal/boolean/date/select/catalog` a controles apropiados; presentar unidad como sufijo, nunca concatenarla al payload. Respetar opciones, rangos, signo y required desde el contrato efectivo. No inventar defaults; mostrar solo los explícitos del backend.

5. **Mutación única y conservación de borrador.** Create hace un POST integral; edit un PUT integral. No enviar `usuario_auditoria` ni `categoria_ids`. Ante 422, mapear `fields` a controles; ante error de red o 409 stale no cerrar/limpiar el formulario. Stale requiere nuevo preview con el mismo borrador vigente.

6. **Preview legible, confirmación condicionada.** El diálogo presenta nombres/rutas y listas de conservados, desactivados, defaults y faltantes, más conteos. Los faltantes editables vuelven al formulario; confirmar requiere completitud y token vigente. Cancelar descarta solo el preview, no el borrador general.

7. **Permisos efectivos.** La ruta exige `PRODUCTOS.leer`; crear/editar/preview/confirmar se habilitan por sus permisos correspondientes. La UI nunca eleva permisos ni confía en rol/nombre del actor. Los errores auxiliares de lectura se distinguen de listas vacías.

## Risks / Trade-offs

- [El detalle actual no entrega los datos de edición] → bloquear el cutover FE hasta que Gate 7.5 cierre el contrato BE; no reconstruir categoría/EAV con requests legacy.
- [Preview pierde vigencia mientras el usuario completa campos] → token backend ligado al payload/estado; si cambia cualquier dato relevante, actualizar preview sin perder entradas.
- [Valores de catálogo/rangos pueden cambiar] → reutilizar IDs/opciones y revalidar en backend al confirmar.
- [Rutas inglesas pueden estar enlazadas externamente] → redirects con equivalencia explícita y tests de recarga directa.
- [Permisos para formularios auxiliares pueden faltar] → estados de error/denegado diferenciados; nunca presentar error como catálogo vacío.

## Migration Plan

1. Aprobar contratos coordinados; mantener UI actual operativa.
2. Agregar API types/hooks detrás de pruebas de contrato sin conectar mutaciones.
3. Implementar carga y formulario integral cuando endpoints BE estén disponibles; mantener el submit antiguo solo durante compatibilidad controlada.
4. Activar alta/edición integral tras pruebas BE y E2E; retirar `/categorias-atributos` y el segundo PUT EAV del flujo.
5. Redirigir aliases `/products*` y retirar página duplicada tras verificar sus consumidores.
6. Cerrar el flujo antiguo solo después del cutover BE y de E2E con datos activos.

Rollback: se puede revertir la UI antes de retirar contratos backend. No activar ni borrar datos desde frontend; el estado persistido sigue gobernado por la API.

## Open Questions

No hay preguntas funcionales bloqueantes. Durante implementación se debe confirmar el mapping exacto de tipos de error compartido por `lib/api-error.ts` y las rutas inglesas registradas en `App.tsx`; si las rutas difieren del inventario del adjunto, documentar redirects equivalentes antes del cutover.
