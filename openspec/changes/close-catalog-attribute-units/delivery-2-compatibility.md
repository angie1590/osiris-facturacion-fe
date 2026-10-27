# Entrega 2: compatibilidad FE sin habilitar UI

## Alcance

Se amplian `src/features/categorias/catalog-compatibility.test.ts` y la suite
existente `src/pages/CategoriasPage.test.tsx`. No hay adaptador nuevo ni cambio
de runtime: `parseApiError` y los handlers actuales preservan mensaje y
borradores en los recorridos probados. No se modifican Producto, interfaces
legacy, guards, contratos OpenAPI ni checkboxes de tareas.

## Fuentes de los fixtures actuales

Fuentes BE leidas en el repositorio hermano `osiris-facturacion-be`:

- `src/osiris/modules/inventario/atributo/models.py`: `AtributoRead` devuelve
  `codigo`, `unidad_id` opcional/nullable y restricciones planas; no devuelve
  `unidad` expandida ni `es_sistema`. Create/Update usan `extra=forbid` y no
  aceptan `codigo`. Update conserva la distincion mediante campos enviados;
  `unidad_id` omitido y null no son el mismo payload.
- `src/osiris/modules/common/unidad/models.py`: `UnidadRead` incluye
  `es_sistema`, `activo`, timestamps y auditoria `created_by`, `updated_by`,
  `usuario_auditoria`. Los tres campos de auditoria admiten null/omision.
- `src/osiris/modules/inventario/categoria/repository.py` y
  `src/osiris/modules/inventario/categoria_atributo/service.py`: los fixtures
  409 reproducen exactamente codigo, mensaje y `acciones_permitidas` de
  `CATEGORY_DUPLICATE_NAME` y `ATTRIBUTE_ALREADY_ASSIGNED`.
- `src/osiris/core/catalog_permissions.py`: declara permisos efectivos
  independientes para CATEGORIAS/ATRIBUTOS/UNIDADES; no registra rutas.

Los golden de lectura son ejemplos manuales derivados de esas fuentes, no
schemas generados ni respuestas capturadas de una app real. La suite FE puede
correr sin el repositorio BE. Su sincronizacion futura requiere contrastar
nuevamente esos modelos o publicar un contrato actual verificable.

## Casos cubiertos

- 2.1: fixtures con `codigo` estable ante cambio de nombre en el fixture,
  atributo con unidad/null, flags de unidad sistema/ordinaria y activa/inactiva,
  simbolos MB/Mb exactos, payload numerico separado del simbolo.
- La interfaz manual privada `AtributoOption` se extrae con el AST TypeScript
  de la pagina existente y se comprueba su asignabilidad con el compilador en
  memoria, sin editarla. Incluye respuestas aditivas con/sin unidad. Esto no
  convierte la interfaz en un validador runtime ni le agrega propiedades.
- El dominio de contrato objetivo existente rechaza metadatos de lectura en
  Create/Update; no genera ni inyecta `codigo`. Se prueba seleccion explicita
  del write, omision/null/UUID de unidad y ausencia de consentimiento implicito.
  Estas son pruebas del contrato objetivo, no de un submit de pagina actual.
- 2.2: ademas de parser y helpers, `CategoriasPage.test.tsx` monta la pagina
  real con React Testing Library. Un 409 `CATEGORY_DUPLICATE_NAME` muestra el
  mensaje backend en el toast, mantiene abierto el dialogo con el nombre escrito,
  deja una sola categoria en la cache y no refetch/duplica optimistamente. Un
  409 `ATTRIBUTE_ALREADY_ASSIGNED` en la mutacion actual de configuracion de
  asignacion muestra el mensaje inline, mantiene abierto el dialogo y conserva
  los controles editados y la unica fila existente. Se verifican payloads y
  numero de llamadas. No existe en esta pagina una mutacion para crear otra
  asignacion; el caso de mapping ejercita la mutacion existente, sin inventar
  un flujo nuevo.
- 2.3: la pagina actual hace visible un atributo recibido con campos aditivos
  (`codigo`, `unidad_id`, `activo`) y conserva sus IDs en cache tras fetch y
  refetch. La prueba existente de `getCategoriasCanonicas` conserva tambien
  identidades/flags de categoria, ruta y parametros legacy y ausencia de
  mutaciones a endpoints objetivo.

## Limites y Gates Pendientes

`contracts/catalog-administration-v1.openapi.json` y `catalog-contracts.ts`
siguen siendo contrato objetivo, marcado no desplegado. Los fixtures actuales
de atributo/unidad no pasan sus schemas Read estrictos: tienen formas distintas.
No se corrige esa diferencia mediante fallback, coercion o edicion del snapshot.

- La generacion/inmutabilidad real de `codigo`, validacion/serializacion Pydantic,
  constraints, migraciones y semilla protegida de 22 unidades se verificaron en
  BE y en el esquema local. El detalle reproducible esta en
  `osiris-facturacion-be/openspec/changes/close-catalog-attribute-units/delivery-2-evidence.md`.
- Disponibilidad/autorizacion de endpoints Unidad o despliegue de la app objetivo.
- No se habilita UI que dependa de endpoints objetivo aun no montados. La
  evidencia BE cierra constraints, semilla, preflight y migracion aditiva de la
  entrega 2; no habilita CRUD de unidades ni el contrato objetivo aislado.
- No se ejecutaron navegador contra entorno real, screenshots ni E2E con
  credenciales. La cobertura nueva es de componentes actuales montados en
  Vitest/React Testing Library, no de una API live ni de CRUD objetivo de Unidad.
- Entregas 3+ ni Producto atomico, stock o formulario/guardado de Producto.

## Verificacion

- `npx vitest run src/pages/CategoriasPage.test.tsx src/features/categorias/catalog-compatibility.test.ts`:
  36 pruebas correctas en las dos suites; incluye los tres casos RTL agregados.
- `npm test -- --run`: 278 pruebas correctas en 27 archivos.
- `npm run lint`: correcto.
- `npm run build`: correcto (`tsc -b` y Vite).
- `cmp` del snapshot OpenAPI FE con el del BE: identicos; no se editaron.
- Backend: suite completa 1205 passed/73 skipped; pruebas PostgreSQL de migracion
  y concurrencia 106 passed/13 skips SQLite; fresh install y paridad Alembic de
  las tablas de catalogo verificados en el informe BE.
- `openspec status --change close-catalog-attribute-units --json`: los cuatro
  artefactos de planificacion reportan `done`; las tareas 2.1-2.4 FE tienen
  evidencia, sin marcar automaticamente las entregas posteriores.