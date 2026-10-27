## 1. Formulario común de edición

- [x] 1.1 Integrar menú por fila y formulario de edición inline en el panel de atributos de Categorías, precargado para nombre/tipo/opciones/catálogo/límites.
- [x] 1.2 Reutilizar validación de tipos, select_options y catálogo de la creación; preservar draft ante errores y no duplicar componentes privados.
- [x] 1.3 Al cambiar tipo/opciones/límites solicitar preview backend y mostrar productos/valores afectados y remapeos antes de confirmar.
- [x] 1.4 Hacer submit al endpoint update existente solo después de confirmación; refrescar lista, asignaciones y estado de undo al completar.

## 2. Baja, reactivación y reversión

- [x] 2.1 Añadir filtro de activos/inactivos para atributos con uso de servidor.
- [x] 2.2 Exponer baja lógica vía confirmación común; presentar bloqueos por remapeos/dependencias y preservar lista si backend devuelve conflicto.
- [x] 2.3 Exponer reactivación explícita para bajas que tengan snapshot; manejar legacy sin snapshot con mensaje backend.
- [x] 2.4 Mostrar “Revertir último cambio” solo cuando backend informa que el snapshot sigue intacto, incluyendo tipo/fecha/resumen.
- [x] 2.5 Confirmar undo y refrescar atributos/remapeos; ante 409 refrescar disponibilidad y explicar por qué no se sobrescribieron los datos posteriores.
- [x] 2.6 Permitir configurar obligatoriedad/default por categoría y confirmar explícitamente el backfill fill-only para productos existentes.

## 3. Pruebas y cierre

- [x] 3.1 Añadir pruebas de listar/editar nombre sin cambio ID y editar definición/type.
- [x] 3.2 Probar preview con conversiones/remapeos, confirmación requerida y falla que conserva el formulario.
- [x] 3.3 Probar baja/reactivación/reversión visible por permisos, estados activos/inactivos y conflicto concurrente 409.
- [x] 3.6 Probar cambio opcional→obligatorio, captura del default, confirmación del backfill e invariancia de valores existentes.
- [x] 3.4 Ejecutar `npm test`, `npm run lint`, `npm run build` y Playwright sobre flujo completo contra backend compatible.
- [x] 3.5 Ejecutar `openspec validate manage-reversible-attribute-lifecycle --strict --no-interactive`.
