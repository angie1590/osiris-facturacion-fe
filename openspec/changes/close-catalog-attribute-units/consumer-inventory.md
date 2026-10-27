# Inventario frontend - Entrega 1

Fecha: 2026-10-25. No se modifica runtime, rutas, payloads ni formulario Producto en esta entrega de inventario.

| Consumidor | Situacion actual | Gate de transicion |
| --- | --- | --- |
| src/pages/CategoriasPage.tsx | DTO es_padre, llamadas /categorias-atributos, herencia/conteos locales con getAtributosAplicables, defaults exigidos para obligatorio | Entregas 3-5 consumen arbol/efectivos canonicos y separan defaults de obligatoriedad; no cambiar antes de API/fixtures |
| src/features/categorias/api.ts | Reads/writes es_padre, parent_id y nombres; backfill de asignacion se envia desde la pagina | Tipo canonico tiene_hijos y payloads verificados por OpenAPI, con omitido/null/valor |
| src/features/categorias/atributos-herencia.ts | Recorre ancestros localmente y resuelve precedencia visual | Deja de ser autoridad funcional solo cuando endpoint efectivo y conteos canonicos esten disponibles |
| src/components/shared/TreeSelector.tsx | Dibuja jerarquia y seleccion con IDs genericos | Reutilizar como presentacion, no resolver reglas ni habilitar padres invalidos por inferencia |
| src/pages/catalog/RecategorizePage.tsx | Selecciona destinos con !es_padre | Adaptar con contrato backend de hojas seleccionables antes de retirar compatibilidad |
| src/pages/CategoriasAtributosPage.tsx | Retirada; no tenía ruta/imports activos | Las escrituras contextuales viven en CategoriasPage |
| src/App.tsx | /atributos y /categorias-atributos redirigen a /categorias | Conservar redirects unicos; no agregar segunda administracion de atributos |
| src/pages/ProductosPage.tsx | Usa categoria_ids, consulta relaciones directas, alta y EAV en solicitudes separadas | Fuera de alcance actual; entrega 7 posterior debe cerrar atomicidad y categoria_principal_id |
| src/features/productos/api.ts | getAtributosDeCategoria usa /categorias-atributos; saveValoresProducto es otra request | No cambiar payload/contrato ni fingir alta atomica hasta entrega 7 |
| src/types/api.ts y features/catalog | Tipos/servicios legacy paralelos y DTO Category para componentes compartidos | Inventariar referencias y ejecutar regresiones; no retirar por simple coincidencia de nombre |

## Compatibilidad acordada para el plan

- Catalogo global, sin empresa_id aislado; permisos efectivos de servidor como autoridad, no solo roles.
- BE debe publicar y verificar contratos antes de activar cada recorrido administrativo; no fallback silencioso de herencia.
- Draft confirmado debe conservar payload exacto y precondicion_preview; cambiar campo, actor, destino, estado o caducidad invalida la confirmacion.
- Omitir un default conserva; null limpia. Su migracion de UI pertenece a entrega 5, no esta aplicada todavia.
- Unidad de atributo numerico es independiente de la futura unidad comercial; mostrar sufijos nunca concatena simbolos al valor persistido.
- Nueva firma/preflight backend no significan que los endpoints actuales ya tengan esas garantias. Fixtures/tipos OpenAPI y gates de permisos/concurrencia permanecen pendientes.

## Evidencia de inicio

El cambio coordinado backend incorpora preflight SQL Core/CLI con tests aislados y precondicion firmada como primitiva no integrada. El primer diagnostico local READ ONLY encontro 2 grupos de hermanos duplicados y 5 flags padre inconsistentes; no se corrigen desde el cliente. No hay cambios de codigo frontend en este bloque.

## Cierre de fundamentos de entrega 1

- Se agregaron contratos Zod y copia exacta del OpenAPI objetivo en contracts/catalog-administration-v1.openapi.json; ambos explicitan target-not-deployed. No se conectaron a componentes ni a Producto.
- catalog-access.ts comparte las 29 operaciones y combinaciones AND backend, con estados pendiente/error/denegado/permitido y actor local; no envia ese actor como identidad wire.
- catalog-preview-draft.ts conserva un clon congelado del payload, diferencia omitido/null/false/0, invalida por contexto, descarta respuestas tardias y bloquea doble confirmacion; errores stale preservan borrador y exigen nuevo preview.
- Contratos corregidos con BE: update global no admite configuracion local, toda confirmacion tiene preview compatible, UUID JSON valido y errores con conteos completos.
- Gates: npm test 249 passed; npm run lint y npm run build correctos; snapshots identicos byte a byte. La API real mantiene sus contratos anteriores hasta entregas posteriores.

## Conciliacion local autorizada

El backend concilio los datos de prueba tras aprobacion del mantenedor: renombres de historicos inactivos y correccion de flags padre, preservando IDs/productos/relaciones/valores. Preflight posterior sin conflictos e idempotencia comprobada; evidencia en data-reconciliation.md del cambio backend. No hubo cambios de codigo frontend ni de Producto, y no se ha desplegado la entrega 2.

## Seguimiento de auditoría - 2026-10-27

- El redirect `/categorias-atributos` ya no exige nombre de rol; Categorías valida `CATEGORIAS.leer`.
- Remapeos separa lectura (`ATRIBUTOS.leer`) y resolución (`ATRIBUTOS.actualizar`). B3 separa lectura y recategorización con los permisos equivalentes de CATEGORIAS.
- Se retiró `src/pages/CategoriasAtributosPage.tsx`; el GET legacy queda solo por el formulario actual de Producto hasta la entrega 7.
- La evidencia H-03 con productos activos y su limpieza completa está registrada en `evidence.md` de ambos repositorios.
- La migración del lector de Producto al resolver efectivo y el alta/edición atómica permanecen en la entrega 7.
- Las escrituras administrativas usan exclusivamente `/categorias/{id}/atributos` con preview/precondición y permiso efectivo.