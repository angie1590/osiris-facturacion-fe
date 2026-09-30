# Componentes canónicos

## Criterio

La selección prioriza compatibilidad con los routers registrados por el backend actual. Una pantalla visualmente más completa no puede ser canónica si depende de un contrato que la API no publica.

## Decisiones

| Dominio | Componente canónico | Ruta objetivo | Contrato backend |
| --- | --- | --- | --- |
| Productos | `src/pages/ProductosPage.tsx` | `/productos` | `/api/v1/productos` |
| Categorías | `src/pages/CategoriasPage.tsx` | `/categorias` | `/api/v1/categorias` |
| Personas y especializaciones | `src/pages/PersonasPage.tsx` | `/personas` | `/api/v1/personas`, `/clientes`, `/proveedores-persona`, `/proveedores-sociedad` |

## Capacidades que deben migrarse

Antes de convertir las rutas inglesas en redirecciones, las pantallas canónicas deben incorporar las capacidades útiles que hoy solo existen en `src/pages/catalog/`:

### Productos

- Paginación de servidor, filtros de categoría/estado/bajo stock y orden por existencias.
- Activación y desactivación con confirmación y recategorización cuando corresponda.
- Galería, detalle ampliado, código interno configurable y atributos personalizados.
- Formularios con validación estructurada y errores legibles.

### Categorías

- Vista jerárquica, búsqueda, gestión de atributos y protección por rol.
- Confirmaciones de eliminación y tratamiento explícito de categorías con productos o hijos.

### Personas

- Validación ecuatoriana de cédula y RUC.
- Edición, desactivación y búsqueda especializada.
- Presentación separada de clientes, proveedores persona y proveedores sociedad dentro del mismo módulo.

## Rutas temporales

- `/products`, `/products/new` y `/products/:id` continúan operativas hasta migrar las capacidades anteriores.
- `/categories` continúa operativa hasta completar la vista jerárquica en `/categorias`.
- `/customers` y `/suppliers` continúan operativas hasta completar validación, edición y desactivación en `/personas`.

Después de la migración, estas rutas deben redirigir a sus destinos españoles y dejar de aparecer en el sidebar. No se eliminarán componentes hasta confirmar que no existen consumidores internos.