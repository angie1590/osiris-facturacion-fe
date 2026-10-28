# Evidencia Gate 7.6

- `src/features/productos/api.ts` define las operaciones para categorías seleccionables, atributos efectivos, detalle, alta/edición integral y preview firmado. `api.test.ts` verifica rutas y payloads sin campos legacy.
- `/productos` carga la pantalla canónica con permiso efectivo `PRODUCTOS.leer`; mutaciones aparecen solo con los permisos efectivos correspondientes. Los alias `/products/new`, `/products/:id` y `/products/:id/edit` conservan la intención existente.
- El formulario trabaja con atributos efectivos por UUID, unidad y origen; serializa booleanos/números sin etiquetas visuales, deja que backend aplique defaults explícitos y no inventa valores.
- Alta y edición usan un solo POST/PUT integral. La edición parte del detalle canónico. El cambio de categoría muestra el impacto y solo confirma con el token del preview actual.
- Tests UI cubren alta, edición, defaults, unidad/número, faltantes, token, stale/renovación, 422/red con borrador conservado, deep link y permisos. Los auxiliares de bodegas/proveedores siguen disponibles en el detalle.
- Verificación final: suite FE 344 passed en 32 archivos; lint y build limpios. BE coordinado: 1329 passed, 81 skipped; Ruff, mypy fuente focal y OpenSpec strict limpios. La prueba concurrente PostgreSQL opt-in pasó 1/1 en schema temporal.
- E2E Playwright autenticado: alta integral, edición con un PUT, preview y confirmación de cambio Teclado→Mouse con token. IVA 0% ya configurado; default explícito Núm. Botones=3.
- La ficha de Empresa permite varias tarifas y muestra error si se quita la última; backend no inserta IVA 0% implícitamente. El formulario Producto inicia sin IVA preseleccionado y exige elegir la tarifa aplicable.
- ICE solo aparece si `/productos/impuestos-disponibles` devuelve opciones ICE para empresa y tipo de producto; la prueba cubre ambos casos.
- Fixture UUID `622a198f-c7b4-4488-a515-2bcec7fadc43` limpiado. Conteos finales Producto/bridge/EAV/tax/bodega/stock/kardex/ventas/compras en cero; se borraron únicamente las 11 filas de auditoría del fixture. La empresa y el catálogo SRI no cambiaron.
- Captura a 390px mostró tarjetas/estado vacío sin overflow; a 1440px la tabla está visible y sin overflow. El 409 restante es `/categorias/sin-clasificar/conteo` por falta de scope y no bloquea Producto. Cutover de bridge/GET legacy sigue pendiente según Gate 7.7.
- El 409 fiscal se resolvió sin añadir impuestos: backend infiere la única empresa activa y el GET de impuestos devuelve IVA 0%; el formulario lo muestra seleccionado. Sin submit ni cambios a la empresa.