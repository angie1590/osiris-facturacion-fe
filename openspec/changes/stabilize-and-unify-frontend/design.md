## Context

React 19, React Router, React Query, Tailwind y componentes compartidos sostienen la aplicación. Hay rutas canónicas y heredadas en paralelo. Vitest pasa 36 pruebas, pero TypeScript reporta 27 errores en empresa, compras, retenciones, kárdex y reportes.

## Goals / Non-Goals

**Goals:**
- Recuperar build verde antes de cambios visuales amplios.
- Unificar rutas y contratos por tarea.
- Conservar el sistema de componentes y patrones existentes.
- Adaptar imágenes por recorridos completos y responsive.

**Non-Goals:**
- Reescribir toda la interfaz de una vez.
- Duplicar reglas tributarias del backend.
- Mantener dos pantallas visibles para la misma tarea.

## Decisions

### Decision: Estabilización antes de rediseño
Primero se corregirán tipos, contratos React Query y componentes compartidos. Solo con test y build verdes se adaptarán imágenes.

### Decision: Rutas canónicas como destino
Se seleccionará una ruta por entidad y operación. Las rutas antiguas redirigirán temporalmente cuando existan enlaces guardados y luego se retirarán.

### Decision: Compras y ventas separadas de movimientos directos
Los módulos comerciales mostrarán sus impactos derivados; Inventario contendrá únicamente operaciones no comerciales y consultas.

### Decision: Adaptación vertical por recorrido
Cada incremento incluirá navegación, listado, formulario, detalle, errores, permisos y responsive del mismo recorrido.

## Risks / Trade-offs

- Componentes heredados con tipos incompatibles -> corregir primero primitivas compartidas y después páginas.
- Cambiar rutas rompe marcadores -> añadir redirecciones temporales y pruebas de navegación.
- Imágenes sin estados alternos -> definirlos en la spec antes de implementar.
- Reglas duplicadas en Zod -> usar validación solo para feedback y tratar respuestas backend como autoridad.

## Migration Plan

1. Corregir los 27 errores TypeScript sin rediseño funcional.
2. Añadir pruebas de rutas, sidebar y contratos críticos.
3. Consolidar catálogo y terceros.
4. Consolidar compras/ventas y separar movimientos directos.
5. Adaptar imágenes por recorrido.
6. Retirar rutas y componentes sin consumidores.

Rollback: conservar redirecciones y realizar cada recorrido en cambios independientes; restaurar la ruta anterior sin modificar datos backend.

## Open Questions

- Orden de prioridad de las imágenes.
- Política visual definitiva para escritorio, tablet y móvil.
- Qué rutas antiguas necesitan compatibilidad temporal externa.