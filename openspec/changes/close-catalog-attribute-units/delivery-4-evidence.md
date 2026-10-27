# Entrega 4: panel de atributos efectivos

## Frontend

- `/categorias` consulta `/categorias/{id}/atributos-efectivos` y `/atributos-propios`; ya no importa ni usa `getAtributosAplicables` para reconstruir ancestros.
- Los resultados se cachean por actor, categoría y scope. El panel conserva el orden del backend, usa `mapping_id`, distingue propio/heredado desde la respuesta propia, muestra origen y tipo/unidad, y renderiza defaults sin cambiar su valor.
- Al cambiar de categoría no se usa el contenido anterior como placeholder. El estado de error muestra alerta y acción Reintentar; sin el permiso combinado `CATEGORIAS.leer`+`ATRIBUTOS.leer` no se llaman las rutas de atributos.
- Las escrituras de configuración existentes quedan intactas para la entrega 5; no se cambió `ProductosPage` ni el formulario/guardado de Producto.

## Evidencia

- `CategoriasPage.test.tsx`: **21 passed**, incluyendo query/refetch por categoría, orden explícito que contradice alfabético, unidad/origen, estado error/retry y gates de permisos.
- Suite completa: **289 passed** en 27 archivos; lint, build y OpenSpec estricto correctos. Snapshot OpenAPI FE/BE idéntico.
- Smoke live de solo lectura contra API local: para Mouse, el árbol reportó 5 efectivos/3 propios y el panel recibió los mismos conteos; Marca/Modelo llegaron con origen Tecnología y default `null`.

FE 4.1–4.5 completadas. La interacción de asignar/override/default y sus previews pertenece a la entrega 5.
