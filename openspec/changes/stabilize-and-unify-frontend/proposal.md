## Why

El frontend ofrece muchas pantallas funcionales y sus 36 pruebas pasan, pero actualmente no compila por errores TypeScript y expone recorridos duplicados para catálogo, compras/ingresos y ventas/egresos. Debe estabilizarse antes de adaptar las imágenes de referencia para que el diseño final se construya sobre contratos confiables.

## What Changes

- Corregir todos los errores TypeScript actuales y mantener `npm test` y `npm run build` como puerta de calidad.
- Consolidar la navegación en módulos de Inicio, Ventas, Compras, Inventario, Catálogo, Terceros, Reportes y Administración.
- Presentar compras y ventas como recorridos comerciales únicos que actualizan inventario automáticamente.
- Reservar ingresos y egresos directos para operaciones no comerciales, con nombres y tipos explícitos.
- Unificar las pantallas duplicadas de productos, clientes y proveedores sobre los endpoints canónicos.
- Mostrar estados consistentes de documento, inventario, cartera y SRI con acciones válidas según rol y estado.
- Adaptar las imágenes de referencia por recorrido, conservando accesibilidad y comportamiento responsive.

## Capabilities

### New Capabilities

- `unified-product-navigation`: arquitectura de información, módulos y rutas únicas por tarea.
- `commercial-operation-ui`: creación y seguimiento de compras y ventas conectadas con stock y cartera.
- `inventory-operation-ui`: existencias, movimientos no comerciales, transferencias, conteos y kárdex.
- `sri-operation-ui`: seguimiento de emisión, errores, reintentos, XML, RIDE y anulaciones permitidas.
- `reference-screen-adaptation`: proceso verificable para incorporar las imágenes de referencia sin alterar contratos de dominio.

### Modified Capabilities

- Ninguna; este repositorio todavía no tenía especificaciones OpenSpec versionadas.

## Impact

- Rutas y navegación: `src/App.tsx`, `src/components/shared/Sidebar.tsx` y layouts.
- Flujos: páginas y features de empresa, catálogo, inventario, compras, ventas, retenciones, documentos SRI y reportes.
- Contratos: tipos de `src/types`, cliente API y hooks de React Query.
- Calidad: TypeScript estricto, Vitest, ESLint, build de Vite y validación visual responsive.