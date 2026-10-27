Coordinacion por entregas 1-6 con el cambio backend homonimo; verificar el gate de cada pareja antes de habilitar la siguiente. Crear artefactos no completa ninguna tarea; consumer-inventory.md documenta el inventario verificado de entrega 1 sin cambios de runtime.

## 1. Entrega 1 - Contratos y compatibilidad

- [x] 1.1 Inventariar usos de es_padre, herencia local, DTOs administrativos y rutas legacy; delimitar que ProductosPage/formulario/guardado no cambia en este alcance.
- [x] 1.2 Acordar con BE fixtures OpenAPI de arbol/seleccionables/efectivos/unidad/origen, mapping contextual, conteos/errores y precondicion_preview; verificar generacion o chequeo de tipos reales.
- [x] 1.3 Definir estados de permisos efectivos CATEGORIAS/ATRIBUTOS/UNIDADES por accion y matriz UI/API; no depender solo de roles ni enviar actor frontend como identidad.
- [x] 1.4 Acordar draft inmutable, invalidacion de preview y manejo de CATALOG_PREVIEW_STALE/ATTRIBUTE_STATE_CHANGED; probar contrato con payload/actor/objetivo distintos.
- [x] 1.5 Cerrar gate 1 con BE: fuente comun de errores, plan de despliegue backend primero y limitaciones de Producto documentadas; no usar fallback funcional de herencia local.

## 2. Entrega 2 - Preparacion de integridad sin tocar Producto

- [x] 2.1 Verificar tipos/fixtures de codigo estable, unidad_id nullable y registros protegidos; distinguir campos omitidos de null sin convertir unidades o valores en texto combinado.
- [x] 2.2 Adaptar mensajes de identidad historica de categoria/mapping y conflictos de unicidad sin borrar borradores ni insertar duplicados locales optimistas.
- [x] 2.3 Verificar compatibilidad de consultas/caches actuales con contratos aditivos backend y ausencia de cambios en flujos Producto o de stock.
- [x] 2.4 Cerrar gate 2 con BE: constraints/seed/preflight ensayados por backend y fixtures compatibles; no habilitar UI que requiera schema no desplegado.

## 3. Entrega 3 - Jerarquia y categorias

- [x] 3.1 Consumir /categorias/arbol con tiene_hijos/conteos/orden canonicos, preservar expansion/seleccion/busqueda y no enviar es_padre en POST/PUT tras gate de compatibilidad.
- [x] 3.2 Mantener selector compartido de padre por niveles con rutas legibles y candidatos validos; probar raiz/hijo/nieto y movimiento a raiz sin autoridad local de hoja.
- [x] 3.3 Deshabilitar acciones manuales de Sin clasificar y mostrar estado temporal; implementar confirmacion B3 con impacto y manejo de padres inactivos/ciclos/concurrencia.
- [x] 3.4 Exponer historial/reactivacion autorizada de categoria ordinaria conservando ID, con conflicto de nombre historico y sin reactivar productos/mappings por inferencia.
- [x] 3.5 Cerrar gate 3 con BE: pruebas de orden primera carga/refetch, seleccion, B3 y categoria protegida, con screenshots desktop/mobile y teclado.

## 4. Entrega 4 - Panel de atributos efectivos

- [x] 4.1 Consumir /categorias/{id}/atributos-efectivos y /atributos-propios; retirar getAtributosAplicables como fuente funcional del panel/conteos sin tocar formulario Producto.
- [x] 4.2 Mostrar nombre/tipo/unidad, propio/heredado/origen, obligatoriedad/default/orden segun backend; preservar prioridad de orden explicito y desempate estable.
- [x] 4.3 Aislar caches por categoria/activos/historial y refrescar panel/arbol tras mutacion; no mostrar datos viejos como pertenecientes a otra seleccion.
- [x] 4.4 Implementar carga/vacio/error/reintento y nombres/rutas legibles; verificar 403 y ausencia de pantalla alternativa que exponga datos.
- [x] 4.5 Cerrar gate 4 con BE: fixture y API real coinciden para overrides/null/inactivos/arbol profundo, sin recorridos de ancestros funcionales en FE.

## 5. Entrega 5 - Recorridos de asignacion, defaults y ciclo

- [x] 5.1 Cambiar accion principal a Agregar atributo: buscar canonico existente con tipo/unidad/uso o crear y asignar atomicamente; manejar duplicado activo y reactivacion historica.
- [x] 5.2 Separar menus de propios/heredados: origen/override/configuracion/editar-global/quitar-local/baja-global por permiso; override no actualiza mapping ancestro.
- [x] 5.3 Permitir obligatorio sin default cuando servidor lo autorice; implementar default/orden omitido-null-valor y eliminar exigencia/default artificial en controles.
- [x] 5.4 Mostrar preview de faltantes y backfill opt-in false por defecto; exigir confirmacion concreta, respetar overrides y enviar payload exacto/precondicion antes del cambio final.
- [x] 5.5 Bloquear aplicacion de conversion que invalida obligatorios aunque haya remapeos; mostrar PRODUCT_REQUIRED_ATTRIBUTES_MISSING sin cola persistente ni exito falso.
- [x] 5.6 Implementar quitar local con impacto resultante y confirmacion, separado de baja global; informar conservacion de valores aun aplicables y conflictos de remapeos.
- [x] 5.7 Completar filtros activos/historial de atributos, reactivacion, resumen fecha/operacion y undo autorizado en Categorias; manejar legacy sin snapshot y 409 sin perder borrador.
- [x] 5.8 Capturar draft inmutable de todas las confirmaciones, invalidarlo al editar y bloquear doble submit; ante errores/red/stale preservar borrador y refrescar disponibilidad.
- [ ] 5.9 Cerrar gate 5 con BE: asignar/reusar/override/default-null/backfill/quitar-local/baja-global/undo, sin navegar fuera de categoria ni recalcular herencia.

## 6. Entrega 6 - Unidades administrativas

- [x] 6.1 Crear recorrido /unidades con shared/ui, listado/busqueda/magnitud/activos/historial, permisos efectivos y estados protegidos del seed; simbolos MB/Mb permanecen distintos.
- [x] 6.2 Implementar alta/edicion/baja/reactivacion no sistema con mensajes UNIT_DUPLICATE_CODE/SYMBOL, UNIT_PROTECTED/IN_USE/INACTIVE; historia proviene de backend, no conteo local.
- [x] 6.3 Integrar usa unidad visual solo en integer/decimal; seleccionar nombre/simbolo activo y enviar unidad_id/null; edicion precarga estado, sin boolean persistido ni unidad comercial.
- [ ] 6.4 Mostrar sufijo en panel y default de categoria conservando payload numerico separado; cambios de tipo no quitan unidad historica silenciosamente.
- [ ] 6.5 Implementar preview/confirmacion de primera anotacion con conteos, texto sin conversion y confirmar_anotacion_unidad=true; draft/payload/token exactos y cancelacion sin mutacion.
- [ ] 6.6 Mostrar bloqueo A-B/A-null con datos historicos y permitir undo de anotacion solo mediante snapshot disponible, no PUT null; refrescar panel/unidades/ciclo/remapeos tras exito.
- [ ] 6.7 Cerrar gate 6 con BE: administrar unidad, atributo numerico con/sin unidad, default, anotacion/409/undo; screenshots responsive y validacion de invariancia numerica sin cambiar formulario Producto.

## 7. Gates ejecutables del alcance actual

- [ ] 7.1 Ejecutar tests de recorridos administrativos reales y fixtures de 403/409/422/red, previews stale, herencia/override, defaults opt-in y proteccion historica, incluyendo regresion de utilidades compartidas.
- [ ] 7.2 Ejecutar `npm test`, `npm run lint` y `npm run build` completos con cero fallos; no contar tests retirados de paginas obsoletas como cobertura de la UI nueva.
- [ ] 7.3 Ejecutar Playwright administrativo contra backend compatible con fixtures autorizados en entorno aislado; verificar teclado/foco, menus/modales/arbol y screenshots desktop/mobile sin solapes.
- [ ] 7.4 Verificar tipos/respuestas contra OpenAPI, documentar rutas/errores y evidencias por gate junto a BE; mantener explicito que Producto atomico y E2E de Producto siguen pendientes.
- [ ] 7.5 Retirar solo imports/rutas/paginas administrativas sin consumidores, conservando redirecciones aprobadas y sin tocar pagina Producto ni borrar cambios ajenos.
- [ ] 7.6 Ejecutar `openspec validate close-catalog-attribute-units --strict --no-interactive` en ambos repositorios; conciliar pendientes previos por evidencia sin modificar checkboxes antiguos automaticamente.

## Fuera de esta ejecucion - Entregas futuras 7 y 8

Formulario Producto con categoria_principal_id, alta/edicion atomica, preview de cambio de categoria, corte CHECK/puente y E2E integral se implementan en un cambio posterior autorizado tras gates 1-6 verdes. La seccion 7 anterior es solo gates actuales, no la entrega funcional 7 de v2.