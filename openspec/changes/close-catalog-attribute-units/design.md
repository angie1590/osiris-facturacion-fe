## Context

Fuente: documento de arquitectura v2.0 de 2026-10-25 y cuatro ajustes operativos aceptados. Bases backend `768f6a1aeeb8e621f2219bb8cd315877cf8e5025`, frontend `1325129a90523b0a0ed8fdcd5d2c842cdd33331b`. Par backend: `osiris-facturacion-be/openspec/changes/close-catalog-attribute-units`.

Categorias ya tiene arbol, selector compartido, edicion inline, preview y configuracion de default; reconstruye herencia local y aun envia es_padre. Se reutilizan componentes y flujos de `manage-reversible-attribute-lifecycle` sin modificar ni archivar ese cambio. Sus pendientes administrativos se prueban aqui; los checkboxes antiguos no se toman como evidencia de funciones actuales.

## Goals / Non-Goals

**Goals:** entregas administrativas verticales 1-6, contratos reales, backend autoridad de herencia/completitud, reutilizacion y override, defaults deliberados, unidades, permisos y restauracion condicional.

**Non-Goals:** tocar formulario/alta/edicion de Producto, implementar entrega 7, activar FK/CHECK de Producto, retirar puente, conversiones, unidad comercial, empaques, variantes, remediacion persistente o ejecutar cambios de datos durante esta propuesta.

## Decisions

### 1. Un solo recorrido administrativo

Mantener `/categorias` con arbol izquierdo y panel derecho, conservando seleccion, expansion, filtro y borradores durante invalidaciones. Crear hijo/editar/mover no navega a otra pagina. Rutas antiguas `/atributos` y `/categorias-atributos` siguen redirigiendo una sola vez a `/categorias`; no nueva pagina maestra de atributos ni duplicar interfaces legacy. Unidad tiene recorrido propio `/unidades`, no otra vista para administrar categorias.

Las vistas usan componentes existentes o nuevas piezas exclusivamente en `src/components/shared` y `src/components/ui`. Evitar UI privada de feature. Extraer piezas del panel si reduce complejidad, no copiar formularios existentes. Nada de IDs como etiquetas de producto, categoria o atributo cuando existe nombre/ruta legible.

### 2. Entregas y contrato comun

IDs 1-6 coordinados con backend: contrato/preflight, integridad, jerarquia, efectivos, mappings/defaults, unidades. El FE se habilita solo tras publicar y verificar los DTO de la entrega correspondiente. OpenAPI valida o genera tipos; no resolver faltantes con payloads inventados. Entrega 8 es cierre posterior, no una razon para aplazar UI de 1-6.

| Uso | Contrato backend `/api/v1` |
| --- | --- |
| Arbol y hojas | GET /categorias/arbol y /categorias/seleccionables |
| Categoria | POST /categorias; PUT/DELETE /categorias/{id}; POST /categorias/{id}/reactivar; GET /categorias/{id} |
| Panel | GET /categorias/{id}/atributos-efectivos y /atributos-propios |
| Asignar/override | POST /categorias/{id}/atributos y /atributos/previsualizar |
| Configurar/quitar | PUT/DELETE /categorias/{id}/atributos/{mapping_id}; POST /categorias/{id}/atributos/{mapping_id}/previsualizar y /reactivar |
| Definicion/ciclo | GET/POST /atributos; PUT/DELETE /atributos/{id}; POST /{id}/previsualizar, /revertir, /reactivar; GET /{id}/reversion |
| Unidad | GET/POST /unidades; GET/PUT/DELETE /unidades/{id}; POST /unidades/{id}/reactivar |

Arbol contiene id/nombre/parent_id/tiene_hijos/is_default/conteos propios y efectivos/hijos. Efectivos contiene mapping_id, atributo_id, codigo/nombre/tipo, unidad expandida o null, restricciones/opciones/catalogo, obligatorio/default/orden, origen{id,nombre}, profundidad/heredado. FE no recomputa conteos ni precedencia con getAtributosAplicables. El selector visual compartido puede seguir dibujando jerarquia, pero no decide reglas de negocio.

Hermanos alfabeticos normalizados + ID. Atributos con orden no nulo primero, luego orden, nombre normalizado e ID; no reordenar alfabeticamente y destruir prioridad explicita recibida. Refetch tras crear/editar usa mismo contrato ordenado, no append provisional al final.

### 3. Jerarquia e identidad

POST/PUT canonicos no incluyen es_padre; read tiene_hijos sirve para expansion/hojas. La UI permite cualquier profundidad, excluye candidatos invalidos, protege controles de Sin clasificar y distingue categoria temporal visualmente. Explicar B3 antes de confirmar creacion/movimiento cuando pueda desplazar productos existentes. Reactivar categoria ordinaria inactiva conserva ID; no crear otro nombre equivalente. Buckets B3 se reactivan solo internamente, no con controles de usuario.

Nombres repetidos en ramas distintas se distinguen por ruta. Mostrar CATEGORY_DUPLICATE_NAME del servidor y conservar borrador. UI no pretende solucionar carreras con una comparacion local.

### 4. Asignaciones propias, heredadas y defaults

Agregar atributo abre busqueda de canonicos activos con tipo, unidad y uso legible o crear nuevo y asignar atomicamente. Propios: configurar, quitar de esta categoria, editar definicion global, baja global segun permiso. Heredados: ver categoria de origen, sobrescribir configuracion aqui, editar definicion global; no quitar mapping del ancestro. Override usa mismo atributo_id y crea/reactiva mapping local, no PUT al mapping heredado.

Configurar muestra titulo con atributo/categoria exacta, orden opcional, obligatorio independiente del default. null limpia default/orden; omitir conserva. Permitir obligatorio sin default cuando backend reporta cero faltantes. Si hay faltantes, bloquear con PRODUCT_REQUIRED_ATTRIBUTES_MISSING y ofrecer default explicito+checkbox opt-in, o cancelar para completar valores. Nada de default seguro inferido ni cola persistente. Enviar aplicar_default_a_existentes=false si no se marca, tambien al asignar/crear. Confirmacion enumera alcance y garantiza no sobrescribir valores existentes. Respetar overrides: no anunciar que un default de padre afecta productos con mapping efectivo hijo distinto.

Quitar local muestra categorias/productos/valores que dejan de aplicar y los que conservan otra asignacion efectiva; baja global muestra alcance global y usa snapshot. No usar el generico Eliminar ambiguo para ambos efectos. Filtros activos/historial y acciones de reactivacion/undo en la misma vista, con resumen de fecha/operacion. Legacy sin snapshot informa recuperacion administrativa, no activacion parcial.

### 5. Unidades y los cuatro ajustes

Unidad de atributo independiente de unidad comercial (fuera de alcance). En `/unidades`, listar/buscar por nombre/codigo/simbolo/magnitud, filtrar activos/historial y administrar con permisos. Seed protegido de 22 unidades del v2 proviene de BE, no seed local. Mostrar nombre y simbolo exacto, conservar MB frente a Mb. Unidades del sistema no editables ni desactivables; en uso actual/historico mostrar conflicto del servidor.

En atributo numerico preguntar si usa unidad; crear desmarcado, editar refleja unidad real. Al activar exigir unidad activa, busqueda por magnitud cuando disponible; al desactivar enviar unidad_id:null. Ocultar control para no numericos sin intentar quitar unidad historica silenciosamente. Defaults muestran sufijo, payload solo numero/texto canonico. Panel presenta `integer · GB` y valores/defaults con sufijo; no cambiar numeros ni concatener simbolos al payload.

Primer ajuste: FK directa Producto.categoria_principal_id queda disenada pero no activada; no introducir es_principal en puente ni tocar ProductosPage. El CHECK y retiro de puente esperan entrega 7/8 coordinada. No afirmar que Producto ya es atomico.

Segundo ajuste: remapeo incompatible no completa obligatorio. Si una conversion de definicion invalida valores obligatorios, bloquear aplicacion y mostrar faltantes hasta que se aporten valores validos; opcionales mantienen el remapeo preservado.

Tercer ajuste: null -> unidad con datos exige preview y confirmar_anotacion_unidad=true; mostrar cuantos valores/productos se reinterpretan sin alterar numeros. A -> B o A -> null con uso historico muestra bloqueo, no sugerir conversion automatica. Undo de anotacion permitido solo cuando BE informa post-estado intacto; no quitar unidad con PUT ordinario.

Cuarto ajuste: nombre de categoria inactiva tambien reservado entre hermanos. Ofrecer reactivacion ordinaria o renombrado explicito; Sin clasificar lo reutiliza BE internamente. No fusion ni borrado de duplicados en cliente.

### 6. Previews, estado y errores

Guardar conserva el payload exacto validado, con identificador de entidad/accion. Preview read-only devuelve precondicion_preview opaca, resumen, conteos/faltantes/incompatibles y acciones permitidas. Confirmacion devuelve mismo payload, token y flags de backfill/anotacion. Si draft cambia, invalidar preview; nunca reconstruir payload distinto desde estado mutable al confirmar.

Backend vuelve a comprobar bajo lock. CATALOG_PREVIEW_STALE o ATTRIBUTE_STATE_CHANGED -> mostrar razon, mantener borrador, invalidar disponibilidad y exigir nueva previsualizacion. 409/422/red no cierran el formulario ni muestran exito. Evitar doble submit; confirmar solo tras respuesta final exitosa. Invalidar arbol, efectivos, propios, atributo/ciclo y remapeos afectados sin mezclar caches de activos/historial o IDs.

detail comun: code, message, conteos, affected_ids autorizados, acciones_permitidas. Usar UNIT_DUPLICATE_CODE y UNIT_DUPLICATE_SYMBOL (no alias invertidos); ATTRIBUTE_UNIT_ANNOTATION_REQUIRES_CONFIRMATION, ATTRIBUTE_UNIT_CHANGE_REQUIRES_CONVERSION, ATTRIBUTE_UNIT_REMOVAL_REQUIRES_MIGRATION; PRODUCT_REQUIRED_ATTRIBUTES_MISSING y CATEGORY_DUPLICATE_NAME. Demas codigos conservan contrato backend; no usar codigos de remediacion persistente.

### 7. Permisos y accesibilidad

Permisos efectivos CATEGORIAS/ATRIBUTOS/UNIDADES con leer/crear/actualizar/eliminar; roles admin/supervisor no bastan. Ocultar/deshabilitar por accion; backend autoridad final, 403 conserva borrador y no muta. Lecturas sin permiso no exponen arbol/datos via pantalla alternativa. No usar usuario_auditoria:"frontend" como actor en nuevas llamadas; JWT/contexto resuelve actor.

Arbol/menu/modales con nombres accesibles, foco y teclado; controles pendientes estables, errores role alert, listas con carga/vacio/error/reintento. Responsive en desktop/mobile sin desbordes del titulo contextual, sufijos o menus. Carga de efectivos no muestra como definitivos los atributos de la categoria anterior. Jerarquia temporal visible pero no seleccionable manualmente.

## Risks / Trade-offs

- API incompatible -> contrato por gate y backend primero, sin fallback de herencia local; inventariar consumidores antes de retirar es_padre.
- Cambio global desde panel local -> confirmacion de alcance y permisos separados de configurar mapping.
- Preview viejo -> token vinculado al draft y nueva previsualizacion tras 409; no confirmacion ciega.
- Snapshots/unidades historicas -> mostrar bloqueos sin borrar datos; no forzar reactivacion legacy.
- Producto actual separado -> limitacion explicita hasta entrega 7; no tocar su formulario indirectamente por cambiar una utilidad compartida sin regresiones.

## Migration Plan

1. Entrega 1: tipos/API acordados, inventario de consumidores y tareas BE/FE vinculadas; sin codigo en esta propuesta.
2. Entregas 2-3: esperar preflight/constraints backend y habilitar UI de jerarquia/identidad solo con contratos publicados y permisos.
3. Entregas 4-5: mover panel a efectivos, asignar/override/defaults, previews y ciclo administrativo sin pagina paralela.
4. Entrega 6: habilitar `/unidades`, selector/sufijos/anotacion y undo junto con backend protegido por historia.
5. Rollback operativo: retirar controles nuevos preservando borradores/datos y el schema de backend; no volver a backfill implicito ni borrar referencias historicas.
6. Entregas 7 y 8 requieren cambio posterior autorizado: Producto atomico/categoria principal, luego E2E integral y retirada legacy. No activar CHECK de Producto en este despliegue.

## Open Questions

Sin decisiones funcionales abiertas. La entrega 1 acuerda precondicion_preview y compatibilidad OpenAPI con pruebas; los datos ambiguos se reportan para conciliacion humana, no mediante nuevas decisiones automaticas en FE.