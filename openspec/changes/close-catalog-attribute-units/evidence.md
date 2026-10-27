# Evidence: close-catalog-attribute-units

Fecha: 2026-10-27. Recorrido de navegador autenticado como Administrador en `http://localhost:4174`; backend conectado a la base local de desarrollo. Todas las filas creadas llevaron prefijo `E2E_GATE_` y fueron eliminadas al final.

## Gates frontend

| Gate | Evidencia |
|---|---|
| FE 5.9 | En la UI real: crear/asignar y reutilizar atributo, configurar override en categoría hoja, limpiar default local, aplicar default explícito con backfill opt-in (preview: 0 productos activos), quitar asignación local con preview (0 valores), baja global (204) y reactivación conservando identidad (200). |
| FE 6.7 | Alta de unidad (201), atributo decimal sin unidad/default 16, atributo decimal con unidad/default 32 y presentación `32 e2eU`; la unidad reportó 1 atributo activo y 1 snapshot histórico. Se editó nombre descriptivo (200); la baja devolvió `UNIT_IN_USE` (409) y conservó la unidad activa. |
| Anotación/undo | Preview real: 0 valores actuales/históricos, 1 default y ninguna conversión; confirmación (200) mantuvo `16` y mostró `16 e2eU`. Cambio A-B devolvió `ATTRIBUTE_UNIT_CHANGE_REQUIRES_CONVERSION` (409). Undo por snapshot (200) restauró `unidad_id=null` y el default 16. |
| FE 7.1 | Los tests de UI/contratos incluyen modal único, previews, errores y estados administrativos. Suite completa repetida después del E2E: 316 tests passed en 28 archivos. |
| FE 7.2 | `npm run lint` limpio; `npm run build` pasó TypeScript y Vite. |
| FE 7.3 | Playwright real comprobó preview en escritorio/móvil y navegación por teclado: Enter abre, Tab recorre los modos, Escape cierra y restaura el foco al disparador. Se añadió test de regresión; suite completa: 317 tests passed. Capturas responsive mostradas en la sesión del gate. |
| FE 7.4 | Las respuestas reales coincidieron con los contratos OpenAPI y errores funcionales. No se abrió ni modificó el formulario/página de Producto. |
| FE 7.5 | Revisión de la superficie: no se retiraron rutas ni imports; no había elementos administrativos obsoletos que retirar sin afectar consumidores. |

## Datos y alcance

La prueba encontró 19 productos, todos inactivos, y 0 productos activos por categoría. No se creó ni reactivó producto, no se escribieron valores EAV y no se alteraron stock, impuestos, cartera, SRI ni documentos. Se limpiaron por UUID los dos atributos, cuatro mappings, dos snapshots, 15 auditorías y una unidad de prueba. Los conteos de nueve tablas volvieron a la línea base registrada por BE.

Durante la sesión también respondió 409 `GET /categorias/sin-clasificar/conteo` porque no había una empresa seleccionada; es una consulta de fondo ajena al CRUD de categorías/unidades y no bloqueó los recorridos ni se modificó su comportamiento.