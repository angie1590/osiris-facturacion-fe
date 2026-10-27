## Why

Categorias debe administrar un catalogo multiproposito usando los contratos canonicos del backend, sin reconstruir herencia ni obligar a inventar defaults. El documento v2.0 y sus cuatro ajustes operativos establecen las entregas 1 a 6 con UI administrativa vertical, dejando Producto atomico para una fase posterior.

## What Changes

- Mantener `/categorias` como unica vista de categorias y atributos; consumir arbol, hojas seleccionables y atributos efectivos con orden estable del servidor.
- Separar Agregar existente / Crear y asignar; para heredados ofrecer origen, override local y edicion global, sin quitar relaciones de ancestros accidentalmente.
- Diferenciar quitar asignacion y baja global, con previews y confirmaciones especificas; completar filtros, reactivacion y undo administrativo.
- **BREAKING**: dejar de enviar `es_padre = !parentId` tras el gate de contrato; no exigir default por ser obligatorio; null limpia el default y el backfill es siempre opt-in.
- Administrar unidades en `/unidades`, bajo permisos efectivos, con componentes compartidos. Integrar unidad numerica opcional en atributos/defaults, anotacion inicial confirmada y conflictos historicos sin perder el borrador.
- **BREAKING staged**: preparar tipos OpenAPI para contratos canonicos sin modificar `ProductosPage`, su flujo de guardado ni su categoria principal en estas entregas. Activacion de `Producto.categoria_principal_id` y Producto atomico pertenecen a entrega 7.

## Capabilities

### New Capabilities

- `catalog-administration-ui`: arbol, panel efectivo, atributos reutilizables, overrides, defaults, previews, bajas y restauracion dentro de Categorias.
- `attribute-units-administration-ui`: catalogo de unidades, seleccion numerica y anotacion semantica con proteccion historica.
- `catalog-ui-contract-transition`: contratos, permisos, concurrencia, compatibilidad y gates coordinados sin implementar Producto.

### Modified Capabilities

Ninguna spec principal existe actualmente en `openspec/specs`. Se conserva `manage-reversible-attribute-lifecycle` como antecedente sin editarlo ni archivarlo; sus pendientes de UI se verifican en este cambio en vez de asumirlos completados.

## Impact

- Coordinacion con el cambio backend `close-catalog-attribute-units`; solo contratos publicados y verificados, sin inventar payloads ni fallbacks silenciosos a herencia local.
- Rutas: `/categorias`, nueva `/unidades`; `/atributos` y `/categorias-atributos` continuan como redirecciones de compatibilidad sin paginas alternativas. No habilitar rutas duplicadas.
- Recorridos: raiz/hijo/movimiento, reutilizacion y override, defaults/backfill, quitar local/global, unidad/anotacion, baja/reactivacion/undo.
- Acceso administrativo inicial admin/supervisor segun permisos efectivos `CATEGORIAS`, `ATRIBUTOS`, `UNIDADES`; los nombres de rol no sustituyen autorizacion. Lecturas globales no se convierten en catalogos por empresa.
- UI exclusivamente existente o nueva en `src/components/shared` y `src/components/ui`; nombres y rutas legibles, responsive y accesible.
- Sin cambios de cantidades, stock, cartera, fiscalidad, SRI o documentos historicos. Fuera de alcance: formulario Producto, unidad comercial, conversiones, empaques, variantes y remediacion persistente.
- Esta solicitud genera solo planificacion; no implementa paginas, permisos, dependencias, migraciones ni operaciones sobre datos.