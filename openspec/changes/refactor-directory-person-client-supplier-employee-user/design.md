## Context

Fuente funcional: documento adjunto y contrato `directory-party-roles` del cambio backend homonimo. Stack existente React 19/TypeScript/React Query/Vite, React Hook Form y Zod disponibles. No se implementa backend en este repositorio.

Evidencia revisada: `PersonasPage.tsx` ya combina Personas, Clientes y proveedores usando `PageHeader`, `FilterBar`, `DataTable`, `FormField`, `DetailModal` y `ConfirmDialog`; busca sobre la pagina cargada y envia `usuario_auditoria: "frontend"`. `features/personas/api.ts` tiene reactivacion por PUT `activo=true`, listados comerciales limitados a 1000 y tipos sin metadatos semanticos. `SearchableSelect` compartido ya ofrece `onSearch` para busqueda remota. `features/personas/components` esta vacio. Por tanto se evoluciona el recorrido existente, no se reemplaza por una interfaz paralela.

## Goals / Non-Goals

**Goals:** un flujo de alta por negocio, preservacion de estado, atomicidad real, UI comun, nombres legibles, permisos, paginacion real, estados accesibles y pruebas en los cinco contextos.

**Non-Goals:** UI privada por modulo, reescritura visual, duplicar reglas SRI/backend, llamadas compensadas Persona+rol, editar identidad encontrada implicitamente, inventar aislamiento comercial por empresa o Cliente Sociedad.

## Decisions

### 1. Regla obligatoria de componentes comunes

Toda UI reutilizable se crea o consume solo en `src/components/shared` y `src/components/ui`; ningun componente visual nuevo se define dentro de features, paginas o directorios privados. No importar componentes privados existentes de otro modulo para estos recorridos. Las paginas existentes siguen siendo puntos de montaje/orquestacion, no bibliotecas de UI. Hooks, tipos y API pueden continuar en features porque no son componentes; sus imports transitivos no deben introducir UI privada.

Alternativa descartada: un PersonaForm/ClienteForm/EmpleadoForm distinto por modulo; aunque parezca mas rapido, infringe la restriccion y duplica errores, validacion y estados. Para formularios especializados, usar configuracion de campos/secciones/acciones del formulario comun, no wrappers locales. Los componentes comunes tienen API documentada, no imports a paginas, ni condicionales por ruta; reciben capacidades/configuracion. Los bloques Persona tambien son comunes a cualquier modulo que requiera identidad, no copias con nombres distintos.

| Necesidad              | Base compartida                                       | Extension minima                                           |
| ---------------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Cabecera/filtros       | PageHeader, FilterBar, SearchInput                    | Parametros de busqueda/estado                              |
| Tabla/paginacion       | DataTable, TablePagination                            | Adaptacion controlada de orden/paginacion remotos si falta |
| Campos/seleccion       | FormField, SearchableSelect, primitivas ui            | Identificacion y formularios configurables                 |
| Alta/detalle           | DetailModal, Section, dialog                          | Contenedor/formulario comun configurable si no existe      |
| Confirmaciones         | ConfirmDialog                                         | Dependencias/acciones semanticas sin modal privado         |
| Estados                | EmptyState, ErrorState, skeleton/toast                | Mantener convenciones existentes                           |
| Persona contextual     | Nuevos SearchOrCreatePersona y bloque de campos comun | API unica consumida por los cinco contextos                |
| Roles/estado/auditoria | badge, DetailModal y bloques comunes                  | Crear bloque comun solo si evita duplicacion real          |

Antes de crear un bloque, verificar si la primitiva existente lo resuelve. Cualquier extension compartida debe ser compatible y probar sus consumidores actuales. Agregar una comprobacion automatizada de imports/definiciones para las superficies tocadas, incluida UI local usada indirectamente; no prohibir rutas de pagina ni la logica no visual de features. No ampliar el refactor a toda la aplicacion sin necesidad.

### 2. Contrato comun SearchOrCreatePersona

API objetivo: valor controlado discriminado (`none`, `existing` con Persona, `new` con borrador), callback de cambios, tipos permitidos, restricciones/capacidades, errores de servidor y permiso de crear/editar/reactivar. Adaptador comun de consulta inyectado o hooks compartidos sin acoplarse al formulario padre. No almacenar persona_id independiente de un borrador ambiguo.

Estados: vacio, buscando, encontrada activa, encontrada inactiva, no encontrada, borrador nuevo, error de busqueda y conflicto de submit. Una busqueda fallida no equivale a no encontrada. Debounce/cancelacion o version de solicitud evita resultados obsoletos; cambiar tipo/identificacion invalida seleccion anterior. Busqueda exacta normalizada incluye inactivos y busqueda textual puede ayudar por nombre, pero antes de alta debe resolverse identificacion.

| Contexto             | Restriccion                                        | Submit padre                  |
| -------------------- | -------------------------------------------------- | ----------------------------- |
| Cliente              | CEDULA/RUC natural/PASAPORTE vigentes              | POST clientes                 |
| Proveedor Persona    | RUC natural obligatorio                            | POST proveedores-persona      |
| Empleado             | Tipos de Persona; datos laborales y acceso         | POST empleados                |
| Usuario directo      | Tipos de Persona; no exige Empleado                | POST usuarios                 |
| Sociedad alta/cambio | Contacto natural; identidad fiscal sociedad aparte | POST/PUT proveedores-sociedad |

Persona encontrada se muestra en resumen de solo lectura; correccion explicita autorizada abre UI comun y se audita separadamente. Persona inactiva muestra reactivacion con permiso; no seleccionarla para alta como si fuera activa. Detectar roles existentes mediante vinculos: activo muestra ver existente; inactivo muestra reactivar, nunca nuevo duplicado.

### 3. Borrador contextual y un submit

Los datos del padre y Persona se mantienen en estado/formulario controlado del padre. Completar Persona contextual significa validar/seleccionar borrador, no persistirlo. Solo guardar padre envia la union compuesta; exito devuelve/vincula Persona definitiva, invalida caches pertinentes y finaliza el recorrido. En carrera, aceptar Persona resuelta por backend y refrescar su resumen, no escribir los datos propuestos sobre ella.

Cancelar/cerrar seccion Persona conserva campos laborales/comerciales/credenciales del padre. Cambiar seleccion no borra esos campos. Errores 409/422 mantienen el borrador y los campos para correccion; bloquear doble submit. Nunca hacer POST Persona + POST rol para estos contextos. Persona master si puede crear Persona de forma independiente.

### 4. Navegacion y recorridos completos

Mantener la ruta que monta PersonasPage y sus vistas comerciales; confirmar rutas reales de Empleados/Usuarios/TipoCliente antes de modificarlas. Si falta una ruta de negocio, agregar una sola canonica dentro de la estructura existente y redirigir legacy, no duplicar pantalla. Consumir exclusivamente UI comun en cada pagina orquestadora.

Clientes: buscar/crear Persona, TipoCliente activo, cambio de tipo, detalle y reactivacion. Proveedor Persona: RUC natural, nombre comercial y catalogo filtrado por semantica. Sociedad: datos juridicos separados de contacto, contacto editable y telefono opcional. Empleado: Persona, laboral (decimal salario, fechas) y acceso en una sola operacion; conservar password solo en memoria, no URL/storage/logs. Usuario: Persona, username/rol/password, lista con nombre/identificacion/rol/estado/cambio obligatorio/indicador de codigo de aprobacion, reset, activar/desactivar, logout forzado y permisos efectivos. Credenciales no editan identidad.

### 5. Consultas, ciclo de vida y errores

Tipos/API desde contrato backend, no inferidos de mocks. Listados controlan `q`, filtros, `limit`, `offset`, orden y total del servidor. No bajar 1000 registros para simular paginacion ni filtrar solo la primera pagina. `only_active=true` por defecto; `false` incluye ambos estados, y solo inactivos usa filtro explicito. Filtros/orden reinician pagina. Caches incluyen parametros y contexto autorizado.

Consultar vinculos para badges/detalle y dependencias antes de baja Persona; si no se puede consultar, no presentar baja como segura. Tras confirmar, el backend vuelve a validar y un nuevo 409 actualiza dependencias. TipoCliente muestra clientes activos bloqueantes. Reactivar llama accion explicita, no PUT arbitrario; Empleado advierte y muestra Usuario existente, cuya reactivacion/rol/reset es decision administrativa separada.

Usar `lib/api-error.ts` y feedback comun; conservar `detail` y mapear campos de Persona embebida/rol/usuario. 401 sigue flujo de sesion, 403 indica permiso, 404 referencia ausente, 409 conflicto con acciones, 422 errores junto al campo. Nunca tratar error de red como ausencia ni reemplazar detalle por "Error inesperado". Quitar `usuario_auditoria` de inputs productivos y mantener auditoria solo lectura.

### 6. Permisos y accesibilidad

UI usa permisos efectivos de leer/crear/actualizar/eliminar, incluidos crear Persona en alta contextual, reactivacion como actualizar, reset/logout/roles segun contrato. No basta RoleGuard por nombre de rol. Backend sigue validando aun si UI oculta boton. Vinculos sensibles respetan visibilidad; no presentar un ID como sustituto de nombre si existe dato permitido.

Campos obligatorios con `*`, labels asociados, errores accesibles, foco de modal, teclado en SearchableSelect y estados de carga/anuncio. Responsive desktop/tablet/mobile: formulario por secciones y tabla con tratamiento comun sin solapamientos; conservar sistema visual, no introducir estilos locales divergentes. Credencial temporal visible solo en resultado autorizado, no cache/storage/telemetria; al cerrar se descarta y se limpia memoria.

## Risks / Trade-offs

- Backend aun no entrega compuesto -> no implementar fallback de dos requests; bloquear habilitacion de recorrido y mostrar error comun si hay incompatibilidad de despliegue.
- Componentes comunes afectan otros modulos -> extensiones compatibles, pruebas comunes y suite completa.
- Borrador/contexto se desmonta -> estado en padre y tests abrir/cancelar/completar/cambiar seleccion.
- Busqueda async obsoleta -> cancelar/versionar y test respuestas invertidas.
- Datos sensibles/globales -> no caches compartidas entre sesiones/empresas autorizadas ni promesas de aislamiento inexistente.

## Migration Plan

1. Inventariar rutas/imports tocados y fijar contrato backend (fase 1 del cambio par).
2. Entregar tipos/hooks sin UI alternativa; construir y probar primitives comunes contra contratos.
3. Integrar por recorridos: Persona/TipoCliente, Cliente, Proveedor Persona, Sociedad, Empleado y Usuario. Habilitar cada recorrido tras el backend correspondiente.
4. Retirar payload de actor, updates arbitrarios de activo y busquedas truncadas; conservar rutas canonicas/redirecciones verificadas.
5. Suite completa, lint/build, prueba E2E desktop/mobile de los cinco contextos y gate de componentes comunes; documentar limites y contratos.

Rollback: deshabilitar nuevas operaciones dependientes si backend no es compatible, sin volver a dos requests ni borrar identidades persistidas. Mantener lectura y rutas existentes. No almacenar borradores con credenciales para recuperacion.

## Open Questions

- Confirmar forma exacta de errores/vinculos/metadatos y permisos efectivos con backend antes de tipar consumidores.
- Rutas exactas de administracion y estrategia de redireccion se resuelven con inventario inicial, no con nombres supuestos.
- Resolver politica RUC/pasaporte en backend; no decidirla unilateralmente en Zod.

## Traceability

Documento secciones 41..48 y 59..61 -> UI comun, cinco contextos, formularios/detalles/listados/estados. RN-CTX-001..007 -> selector controlado, borrador, una llamada y preservacion. RN-GEN/RN-LIFE -> filtros, permisos, auditoria y reactivacion. RN-EMP/RN-USR -> secciones laboral/acceso y decisiones de seguridad. Secciones 66..71 -> limites declarados y gates conjuntos.

## Implementation Evidence

- Las paginas canonicas montan DirectoryWorkspace comun: Personas/TipoCliente, Clientes, proveedores natural/sociedad, Empleados y Usuarios. No se crearon formularios privados de features o pages ni se duplicaron pantallas de negocio.
- SearchOrCreatePersona/PersonaFields/DirectoryForm/ConfigurableFields son comunes; las diferencias son configuracion, campos y capacidades. El gate AST recorre imports directos/transitivos y detecta JSX privado, wrappers locales, barrels e imports dinamicos.
- Conservacion de estado, cancelacion, errores 422, backend incompatible, respuestas de busqueda obsoletas y cinco submits compuestos cubiertos por pruebas existentes/nuevas. No hay POST Persona independiente dentro del submit contextual.
- Contrato compatible confirmado por GET `/api/v1/personas/contrato`, evitando consultar OpenAPI en el origen estatico frontend. Backend entrega union compuesta, vinculos, metadata tributaria y acciones explicitas.
- Permisos separados aprobados por usuario. Acciones evaluadas por permisos efectivos del usuario autenticado; no se inferio autorizacion solo por nombre de rol. El backend registra denegaciones sin passwords/tokens en payload.
- Suite frontend: 125 pruebas despues de incorporar el orden remoto de columnas; lint/build verdes. Chequeo backend focalizado verde en 45 archivos; PostgreSQL aislado 90 pruebas y suite local backend 667.
- E2E real final: 36/36 comprobaciones en 1280x900 y 390x844; altas con Persona nueva y existente en los cinco contextos, preservacion del padre, una peticion, duplicidad/inactivos/reactivar/dependencias, baja laboral, cambio contacto y reset temporal sin almacenamiento. Capturas revisadas y controles verificados mediante geometria/hit-test tras scroll.
- Entorno para probar: `http://127.0.0.1:4175`, proxy a API `http://127.0.0.1:8003`. No se reemplazaron servidores existentes en 4174/8002.
- Runner reproducible: `scripts/directory-e2e.mjs` recibe fixture restringido de UAT, no credenciales hardcoded de usuarios reales. Informe final `/var/folders/5f/_3nn02690s35k6g2ynlbhhfm0000gn/T/osiris-directory-uat-k78_zkoj/report.json`. Limpieza logica de los cuatro lotes confirmada por API, cero pendientes y secretos temporales retirados.
- Incidencias preexistentes fuera de Directorio: remapeos de atributos devuelve 500 por esquema sin created_by y conteo categorias devuelve 409 sin empresa. No se ocultaron ni se marcaron como funcionalidad corregida.
- Validacion OpenSpec estricta correcta. No archivar: cierre conjunto espera `make test` del flujo Docker backend y gate mypy global heredado; todos los gates frontend fueron ejecutados.

### Joint Closure

Los bloqueos historicos anteriores quedaron resueltos a peticion del usuario. Make test Docker: 683 passed; mypy global estricto y Ruff backend verdes. Frontend: 125 pruebas, lint y build verdes. E2E repetido sobre API final 8003/frontend 4175: 36/36 en desktop/mobile, cero limpieza pendiente y sin alterar credenciales originales. Remapeos devuelve 200 con el esquema migrado.

Informe final: `/var/folders/5f/_3nn02690s35k6g2ynlbhhfm0000gn/T/osiris-directory-uat-rvzdoqaf/report.json`. Tareas 55/55 completadas, backend 63/63. Listo para archivo posterior explicito, sin archivar automaticamente.
