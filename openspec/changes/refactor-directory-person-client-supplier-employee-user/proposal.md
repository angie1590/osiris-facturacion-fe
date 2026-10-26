## Why

Los flujos de Directorio deben buscar o crear Persona sin abandonar el alta y sin duplicar identidad ni persistir registros parciales. El documento adjunto fija el dominio y el backend es la autoridad; la UI existente debe evolucionar mediante componentes comunes para todos los modulos, no mediante formularios privados ni una segunda interfaz paralela.

## What Changes

- Adaptar el recorrido existente de Personas y roles comerciales, y los recorridos de Empleados, Usuarios y TipoCliente, conservando rutas canonicas y permisos.
- Crear `SearchOrCreatePersona` y cualquier otro bloque necesario exclusivamente en `src/components/shared`, usando primitivas de `src/components/ui` y configuracion de contexto.
- Prohibir crear o consumir componentes privados de `features/*/components`, `pages/*/components` o wrappers visuales locales. Las paginas solo orquestan datos/configuracion/acciones y componen UI comun.
- Soportar los cinco contextos: Cliente, Proveedor Persona, Empleado, Usuario directo y contacto de Proveedor Sociedad, tanto alta como cambio de contacto.
- Mantener la Persona nueva como borrador hasta el unico submit compuesto del padre; preservar estado, vincular automaticamente el resultado y no hacer `POST /personas` seguido de otra llamada para estas altas.
- Incorporar listados paginados de servidor, busqueda, orden, activos/inactivos, reactivacion, vinculos y dependencias antes de baja.
- Mostrar nombre, identificacion, estado, auditoria y datos de rol sin copiar identidad a DTO especializados; quitar actor de auditoria de los payloads productivos.
- Adaptar credenciales a politica backend de ocho caracteres, reset temporal de una sola visualizacion, revocacion de acceso y permisos efectivos.

## Capabilities

### New Capabilities

- `directory-party-roles-ui`: recorridos comunes de Directorio, altas contextuales atomicas, estados, permisos, detalles y ciclo de vida.

### Modified Capabilities

Ninguna spec principal existente: `openspec/specs` esta vacio. Mantener la navegacion consolidada del cambio completado `stabilize-and-unify-frontend` sin reescribir sus artefactos.

## Impact

- Base existente: `src/pages/PersonasPage.tsx`, `src/features/personas/api.ts`, `hooks.ts`, administracion, rutas, guards, tipos, manejo comun de errores y pruebas.
- UI compartida: `PageHeader`, `FilterBar`, `SearchInput`, `DataTable`, `TablePagination`, `FormField`, `SearchableSelect`, `DetailModal`, `ConfirmDialog`, `Section`, `EmptyState`, `ErrorState` y primitivas comunes. Cambios de API de componentes compartidos deben ser compatibles y verificarse con consumidores existentes.
- Roles: respetar permisos efectivos de leer/crear/actualizar/eliminar, no inferir autorizacion solo por nombre de rol. Backend conserva autoridad sobre cualquier llamada.
- Rutas: evolucionar la ruta que actualmente monta PersonasPage y las canonicas de administracion; levantar mapa real antes de editar. No inventar destinos ni agregar pantallas duplicadas para Clientes/Proveedores.
- Dependencia obligatoria: cambio backend `refactor-directory-person-client-supplier-employee-user`, capability `directory-party-roles`; cerrar primero contrato y endpoints. No simular atomicidad ni suplirlos con dos llamadas.
- No objetivos: redisenar el sistema visual, inventario/cartera/SRI, registrar sociedades como Persona natural, completar ventas B2B, habilitacion comercial multiempresa, multiempleo o portal de clientes. Esos limites deben permanecer visibles en la documentacion funcional.
