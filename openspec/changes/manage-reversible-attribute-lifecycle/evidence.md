# Evidence: manage-reversible-attribute-lifecycle

Fecha: 2026-10-27. Cobertura histórica conciliada con la UI de Categorías actual y el recorrido E2E administrativo de `close-catalog-attribute-units`.

| Tarea | Evidencia |
|---|---|
| FE 2.1 | `CategoriasPage.test.tsx`: el historial consulta atributos con `only_active=false` y la vista activa los filtra en servidor. |
| FE 2.3 | `muestra ciclo de un atributo inactivo y ofrece reactivar solo con snapshot disponible` prueba disponibilidad y endpoint explícito de reactivación. |
| FE 2.4 | Las pruebas de ciclo comprueban que el botón de undo depende de `can_undo` y que tipo, fecha, valores/asignaciones están disponibles en el resumen. |
| FE 2.5 | `conserva el diálogo de ciclo cuando undo devuelve ATTRIBUTE_STATE_CHANGED` verifica 409 visible y no anuncia éxito; `ofrece undo de annotate_unit solo cuando el snapshot está disponible` confirma invalidación de queries tras éxito. |
| FE 3.2 | `refresca un preview stale sin mutar y confirma solo tras un segundo consentimiento` y las pruebas de conversión verifican preview, confirmación y preservación del draft. |
| FE 3.3 | Tests de baja, historial/reactivación y reversión cubren permisos, estados y conflicto 409; recorrido autenticado real de este gate confirmó baja, reactivación y undo contra API. |
| FE 3.4 | `npm test`: 317 passed; lint/build FE limpios. Playwright real cubrió el flujo de ciclo contra BE, modal/teclado/foco y screenshots desktop/móvil. |