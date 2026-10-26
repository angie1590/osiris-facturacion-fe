## 1. Inventario y contrato backend

- [x] 1.1 Inventariar rutas canonicas/legacy y componentes/imports de Personas, roles comerciales, TipoCliente, Empleados y Usuarios; registrar UI privada que no se puede consumir en el nuevo recorrido.
- [x] 1.2 Ejecutar baseline de tests/lint/build y conservar sistema visual/navegacion del cambio stabilize-and-unify-frontend; evitar pantallas duplicadas.
- [x] 1.3 Acordar con backend union compuesta, Persona/vinculos, errores, filtros/orden/paginacion, metadatos de contribuyente y acciones/permisos; usar OpenAPI, no supuestos de mocks.
- [x] 1.4 Registrar gates cruzados: no habilitar UI contextual sin backend fase 4 y endpoint del rol; comercial requiere fase 5, acceso fases 6/7, auditoria/RBAC fase 8.

## 2. Tipos y capa de datos

- [x] 2.1 Adaptar tipos/api/hooks existentes a persona_id o persona_nueva y contacto_id o contacto_nuevo mutuamente excluyentes, incluyendo update de contacto; conservar rama por ID compatible.
- [x] 2.2 Agregar consultas de Persona exacta/textual/vinculos y listas paginadas/ordenadas con query keys por parametros y contexto autorizado; quitar truncamiento de 50/1000 como estrategia de busqueda.
- [x] 2.3 Sustituir reactivacion por PUT activo por accion explicita y tipar conflictos de dependencias/duplicidad/inactivos; agregar acciones de Usuario segun contrato.
- [x] 2.4 Retirar usuario_auditoria de DTO/payloads productivos tocados y mantener auditoria readonly; usar lib/api-error.ts para detail y errores de campos compuestos.
- [x] 2.5 Probar serializacion y una sola peticion por alta compuesta, parametros de filtros/orden/total y ninguna llamada Persona independiente dentro del flujo contextual.

## 3. Componentes comunes y gate arquitectonico

- [x] 3.1 Inventariar APIs de PageHeader, FilterBar, DataTable, TablePagination, FormField, SearchableSelect, DetailModal, ConfirmDialog y estados comunes; definir extensiones minimas compatibles.
- [x] 3.2 Crear/extender formulario comun configurable en src/components/shared si los existentes no resuelven secciones/campos/acciones; prohibir wrappers y formularios visuales locales en paginas/features.
- [x] 3.3 Crear campo/bloque comun de identificacion y datos Persona, con labels, obligatorios, feedback de campo y restricciones configurables; usar solo primitivas comunes.
- [x] 3.4 Crear SearchOrCreatePersona comun con valor controlado none/existing/new, busqueda remota, resumen readonly, borrador, permisos y restricciones por capacidades.
- [x] 3.5 Implementar estados buscando/encontrada/inactiva/ausente/error y cancelacion/versionado de respuestas; invalidar seleccion al cambiar identidad y no tratar fallo de red como ausencia.
- [x] 3.6 Extender bloques comunes de estado/roles/auditoria/dependencias solo si hace falta; componer ConfirmDialog/DetailModal existentes sin modales privados.
- [x] 3.7 Agregar comprobacion automatizada de imports/definiciones para UI tocada: prohibir crear/consumir componentes privados incluso transitivos; permitir pages orquestadoras y features no visuales, sin acoplar componentes comunes a rutas.
- [x] 3.8 Probar componentes comunes existentes y nuevos, documentar props/capacidades y verificar que extensiones no rompen consumidores de otros modulos.

## 4. Persona master y TipoCliente

- [x] 4.1 Adaptar PersonasPage existente a UI comun, paginacion/busqueda/orden de servidor, filtro de activos/inactivos y feedback de carga/vacio/error sin filtrar solo pagina cargada.
- [x] 4.2 Implementar create/edit explicitos Persona con componente comun y errores de identidad/tipo; no modificar Persona encontrada implicitamente desde un rol.
- [x] 4.3 Incorporar detalle comun Persona con roles, usos como contacto, estado y auditoria legible respetando permisos; no mostrar IDs en lugar de nombres disponibles.
- [x] 4.4 Consultar dependencias antes de baja, mostrar bloqueo comun y manejar 409 posterior; implementar reactivacion explicita con mismo ID y permisos.
- [x] 4.5 Adaptar/crear la unica vista canonica TipoCliente con formulario comun, descuento 0..100, nombre unique, dependencias de Clientes y reactivacion; no crear UI especifica del catalogo.
- [x] 4.6 Ampliar PersonasPage.test.tsx y pruebas cercanas para busqueda fuera de pagina, inactivos, dependencias, edicion explicita y mensajes backend.

## 5. Cliente y Proveedor Persona

- [x] 5.1 Integrar Nuevo Cliente con SearchOrCreatePersona, TipoCliente activo y submit compuesto; preservar seleccion de tipo al abrir/cancelar/completar Persona.
- [x] 5.2 Manejar Cliente activo existente con ver detalle e inactivo con reactivar autorizado; permitir cambio de TipoCliente y bloquear cambio Persona tras alta.
- [x] 5.3 Integrar Nuevo Proveedor Persona con el mismo componente en modo RUC natural, nombre comercial y contribuyente semantico; evitar validacion por nombre/codigos dispersos.
- [x] 5.4 Incorporar detalle/edicion de datos de rol, baja y reactivacion de Proveedor Persona mediante UI comun; preservar identidad y no afectar otros roles.
- [x] 5.5 Probar ambos recorridos completos: Persona existente/nueva/inactiva, rol duplicado, campos conservados, una llamada, rollback backend comunicado y 403/409/422 legibles.

## 6. Proveedor Sociedad y contacto mutable

- [x] 6.1 Integrar datos juridicos Sociedad en formulario comun separado del bloque de contacto natural; tipo contribuyente semantico, telefono opcional y errores de RUC/email.
- [x] 6.2 Usar SearchOrCreatePersona para contacto en alta, preservando datos sociedad y enviando una sola operacion compuesta con contacto existente/nuevo.
- [x] 6.3 Implementar Cambiar contacto con el mismo componente comun, Persona existente/nueva y PUT compuesto; no editar/desactivar contacto anterior.
- [x] 6.4 Adaptar listado/detalle/baja/reactivacion Sociedad con componentes comunes, nombres legibles y permiso de actualizar contacto.
- [x] 6.5 Probar alta/cambio de contacto, cancelar sin perdida de datos, multiples sociedades por contacto y fallo de sociedad sin alta Persona independiente.

## 7. Empleado con acceso

- [x] 7.1 Adaptar recorrido canonico de Empleados usando formulario comun con secciones Persona/Laboral/Acceso; SearchOrCreatePersona sin cambiar ruta ni perder campos.
- [x] 7.2 Capturar Empresa autorizada, salario decimal como valor textual exacto, fechas/foto y credenciales de ocho o mas caracteres; mantener backend como autoridad de edad/fechas.
- [x] 7.3 Enviar una peticion Persona+Empleado+Usuario o Persona existente+Empleado+Usuario; mapear errores por seccion y manejar Usuario previo como conflicto administrativo.
- [x] 7.4 Mostrar en baja que Usuario y sesiones se revocan, y en reactivacion el Usuario existente con acciones administrativas separadas de rol/reset/reactivar; no reactivar acceso implicitamente.
- [x] 7.5 Probar Persona existente/nueva, errores laborales/username, rollback, campos conservados, baja y reactivacion sin acceso automatico; usar solo UI comun en listado/detalle/formulario.

## 8. Usuario directo y seguridad

- [x] 8.1 Adaptar recorrido canonico Usuarios a SearchOrCreatePersona + formulario comun de username/Rol/password, sin exigir Empleado ni editar identidad desde credenciales.
- [x] 8.2 Enviar alta directa Persona+Usuario en una llamada, con feedback de username normalizado/case-insensitive y politica unica de contrasena.
- [x] 8.3 Mostrar nombre completo/identificacion/username/Rol/activo/cambio obligatorio/indicador de codigo de aprobacion; no exponer hashes y permitir detalle Persona con permiso.
- [x] 8.4 Implementar cambio Rol, reset temporal, activar/desactivar, invalidar sesion y permisos efectivos mediante controles/confirmaciones comunes segun RBAC.
- [x] 8.5 Mostrar password temporal solo en resultado autorizado, descartarlo al cerrar y excluirlo de cache/storage/URL/logs; conservar credenciales de formulario solo en memoria durante el flujo.
- [x] 8.6 Probar alta directa existente/nueva, usuario inactivo/duplicado, campos inmutables, reset/cambio obligatorio y 403 de acciones de seguridad.

## 9. Permisos estados y entrega

- [x] 9.1 Aplicar permisos efectivos en todos los recorridos: leer/crear/actualizar/eliminar y acciones de seguridad, incluidos crear Persona embebida y reactivacion; manejar denegacion backend sin asumir que ocultar boton autoriza.
- [x] 9.2 Unificar errores y estados de carga/vacio/sin coincidencias/red/permiso/conflicto, preservar borradores ante error y bloquear doble submit; usar solo componentes comunes.
- [x] 9.3 Completar accesibilidad y responsive desktop/tablet/mobile de los recorridos, no de widgets aislados: labels, required, foco, teclado, textos y tablas sin solapamiento.
- [x] 9.4 Verificar rutas/redirecciones y ausencia de segunda pantalla visible; retirar solo UI privada que el cambio deja sin consumidores, sin refactor ajeno al alcance.
- [x] 9.5 Documentar componentes comunes/configuracion, Search-or-Create, atomicidad, permisos y limites de Cliente Sociedad/directorio global/Consumidor Final; no declarar multiempresa o B2B completos.

## 10. Gates de cierre ejecutables

- [x] 10.1 Ejecutar pruebas parametrizadas del mismo SearchOrCreatePersona en Cliente, Proveedor Persona, Empleado, Usuario y contacto Sociedad, incluidos cambio contacto y respuestas async invertidas.
- [x] 10.2 Ejecutar test automatizado de UI exclusivamente comun, incluyendo nuevos componentes y consumidores transitivos; fallar ante UI privada en cualquier superficie tocada.
- [x] 10.3 Ejecutar `npm test` con suite completa y corregir fallos antes de cierre; conservar tests de guards, componentes compartidos y rutas existentes.
- [x] 10.4 Ejecutar `npm run lint` y `npm run build`; resolver regresiones de tipos/hooks/UI compartida y no marcar Done con gates fallidos.
- [x] 10.5 Ejecutar E2E con Playwright sobre backend real en desktop y mobile para cinco contextos: existente/nueva, inactivos, permisos y errores; verificar una peticion compuesta y ausencia de registros parciales con fixtures controlados.
- [x] 10.6 Ejecutar `openspec validate refactor-directory-person-client-supplier-employee-user --strict --no-interactive` y contrastar documento->spec->tests con backend; cerrar implementacion solo cuando ambos repositorios satisfagan sus gates, sin archivar anticipadamente.

## Estado De Gates

Implementacion y gates conjuntos completados. Suite frontend: 125 pruebas verdes; lint/build aprobados. Backend: make test Docker 683 passed, mypy global y Ruff aprobados. Validacion OpenSpec estricta ejecutada y E2E actualizado 36/36, con cero limpieza pendiente y credenciales originales intactas. Listo para archivo posterior por solicitud explicita.
