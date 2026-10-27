## Why

El formulario canónico `/productos` crea el producto y guarda EAV en una segunda solicitud; lee asignaciones directas mediante el GET legacy y al editar no precarga categoría ni valores. También existe una experiencia `/products` separada, lo que dificulta tener un único recorrido integral confiable.

La entrega 7 alinea la interfaz con el contrato backend: una categoría principal, atributos efectivos, impuestos y datos editables en una sola mutación, con preview de impacto al cambiar categoría y conservación del borrador ante errores.

## What Changes

- Mantener una única implementación de formulario en español bajo `/productos`; normalizar rutas inglesas de producto a esa experiencia, sin crear una segunda UI.
- Consumir categorías seleccionables, resolver atributos efectivos y mostrar tipos/unidades sin modificar los valores persistidos.
- Enviar el conjunto editable de categoría, datos generales, impuestos y EAV en una sola solicitud de alta o edición; no enviar actor ni lista de categorías.
- Precargar el detalle canónico y presentar categoría, atributos y perfil tributario existentes al editar.
- Solicitar preview firmado antes de cambiar categoría, mostrar conservados/desactivados/defaults/faltantes y confirmar solo con token vigente.
- Conservar el formulario y marcar errores por campo ante validación, error de red o preview obsoleto; retirar el GET legacy de Producto solo tras el cutover backend.
- Aplicar permisos efectivos de Producto a rutas y acciones, además de los permisos de lectura auxiliares requeridos.

## Capabilities

### New Capabilities
- `product-integral`: comportamiento del formulario único para alta, edición, lectura, cambio de categoría, errores y permisos efectivos.

### Modified Capabilities
- Ninguna. `openspec/specs/` no contiene capacidades vigentes; no se modifican requisitos fuera del formulario integral.

## Impact

- UI y rutas: `src/pages/ProductosPage.tsx`, alias de `/products`, y navegación relacionada.
- Contratos/clientes: `src/features/productos/api.ts`, tipos de producto, categorías seleccionables, atributos efectivos, preview y errores por campo.
- Calidad: pruebas de formulario/API, suite frontend, lint, build y E2E autenticado con productos activos.
- Límites: el backend sigue siendo autoridad de reglas. Los flujos independientes de bodegas y proveedores no se mezclan en la mutación integral; no se realizan cambios de stock, compras, ventas, SRI ni documentos.
