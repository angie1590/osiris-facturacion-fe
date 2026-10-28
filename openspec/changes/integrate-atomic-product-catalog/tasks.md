## 1. Gate 7.1 — Contratos coordinados

- [x] 1.1 Documentar la experiencia única, una mutación integral, preview y manejo de errores en propuesta/spec.
- [x] 1.2 Definir fuente de datos, borrador, permisos efectivos y secuencia de compatibilidad en el diseño.
- [x] 1.3 Alinear payload/respuesta/errores con la especificación backend `product-integral`.
- [x] 1.4 Validar ambos cambios con OpenSpec estricto y resolver cualquier diferencia contractual antes de conectar UI.

## 2. Gate 7.6 — Formulario integral

- [x] 2.1 Añadir tipos y clientes para categorías seleccionables, atributos efectivos, detalle, alta/edición y preview.
- [x] 2.2 Unificar formulario y navegación de producto en `/productos`; redirigir aliases ingleses conservando create/detail/edit.
- [x] 2.3 Cargar atributos efectivos por UUID; renderizar tipos, opciones, límites y unidades sin inventar defaults ni contaminar valores.
- [x] 2.4 Precargar edición desde detalle canónico y enviar categoría, datos generales, impuestos y EAV en una sola mutación.
- [x] 2.5 Implementar diálogo de cambio de categoría que muestre conservados, desactivados, defaults y faltantes, y confirme con token vigente.
- [x] 2.6 Mapear errores `fields`, 422, 409 stale y fallos de red; conservar el borrador y solicitar preview nuevo cuando corresponda.
- [x] 2.7 Aplicar permisos efectivos de Producto a ruta y acciones; distinguir pendiente, denegado, error y vacío.
- [x] 2.8 Retirar del flujo canónico `usuario_auditoria`, `categoria_ids`, GET legacy y segundo PUT EAV una vez habilitado el contrato BE.

## 3. Gate 7.8 — Verificación y cierre

- [x] 3.1 Probar alta, edición, carga de atributos/unidades, preview, confirmación, errores y permisos efectivos.
- [x] 3.2 Ejecutar suite FE completa, lint y build.
- [x] 3.3 Ejecutar Playwright autenticado con productos activos para alta, edición y cambio de categoría; comprobar navegación/responsive.
- [x] 3.4 Limpiar fixture de prueba y verificar conteos; confirmar que no se alteraron stock, kardex, compras, ventas, SRI ni documentos.
- [ ] 3.5 Retirar GET legacy y página/ruta duplicada solo después del cutover BE y de verificar cero consumidores.
- [x] 3.6 Actualizar documentación y registrar evidencia coordinada de cada gate.
