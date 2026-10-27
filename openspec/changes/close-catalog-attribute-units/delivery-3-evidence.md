# Entrega 3: jerarquía en Categorías

- `/categorias` consume `GET /api/v1/categorias/arbol`; el árbol y los contadores usan respuestas del backend. Las búsquedas/selector derivan una lista de nodos para presentación, no autoridad de hojas.
- POST/PUT envían nombre y parent_id, nunca `es_padre`; mover a raíz envía `parent_id: null`. El selector conserva rutas de tres niveles en tests.
- El estado de permisos efectivo del actor controla la lectura del árbol, crear/editar/baja/reactivar; el panel y sus consultas solo se habilitan con CATEGORIAS+ATRIBUTOS.leer. Las claves de query se aíslan por actor.
- `Sin clasificar` muestra estado temporal y deshabilita selección/edición/creación de hijos/baja. El historial ofrece reactivar categoría ordinaria con su ID y refresca tras éxito.
- Tests de página: **19 passed**; suite FE: **287 passed en 27 archivos**; lint y build correctos. OpenSpec estricto y snapshot OpenAPI FE/BE coincidente.
- El rol activo `Administrador` obtiene acceso a la pantalla sin grants individuales de catálogo; el frontend recibe permisos efectivos completos y muestra acciones.
- B3 muestra conteo y requiere `confirmar_b3: true`; reenvía payload/token exactos al crear o mover. Ante preview stale renueva el preview; solo abre confirmación si quedan productos directos y no reintenta la mutación con token viejo.
- Recorrido live de solo lectura en `/categorias`: árbol real y atributos cargados, selección de Tecnología y expansión Tecnología > Computadores > hoja. Capturas desktop/mobile verificadas y Tab recorre controles con nombres accesibles. En móvil las etiquetas quedan completas y las acciones pasan a segunda línea. FE 3.5 completado.
- API E2E BE 3.7: create raíz, B3 con confirmación firmada, bucket protegido, hijo/nieto, selección, movimiento a raíz y reactivación con identidad preservada. El cleanup borró filas y auditorías por IDs/prefijo y verificó cero residuos; baseline final 39 categorías/19 productos/19 vínculos.
- Entrega 3 BE/FE cerrada; no se inició la entrega 4 en este alcance.
- Revalidación tras iniciar entrega 4: FE **289 passed** en 27 archivos; lint, build, OpenSpec estricto y contrato compartido coincidente.

## Entrega 4: panel efectivo (en curso)

- Completadas FE 4.1-4.4: el panel consulta `/atributos-efectivos` y `/atributos-propios`, presenta tipo/unidad/origen/obligatorio/default con orden del backend, mantiene caché por actor/categoría y estados de carga/vacío/error/reintento.
- La prueba de refetch verifica que no se reutiliza el panel previo, el orden explícito se preserva aunque contradiga el alfabético y permisos insuficientes no llaman los endpoints efectivos. No se modificó `ProductosPage` ni el formulario/guardado.
- FE 4.5 permanece pendiente de fixture/API real de overrides, null, inactivos y árbol profundo coordinado con el trabajo BE restante. No se inició entrega 5.
- No se alteró ProductosPage ni su flujo de guardado. Sin capturas ni E2E de Producto en este alcance.