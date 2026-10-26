# Osiris Frontend

## Directorio: contrato e integración

El cambio `refactor-directory-person-client-supplier-employee-user` usa las rutas canónicas `/personas`, `/admin/empleados` y `/admin/usuarios`. Personas reúne los maestros Personas, Clientes, Proveedores Persona/Sociedad y Tipos de Cliente. Las páginas orquestan `DirectoryWorkspace`; la UI reutilizable vive exclusivamente en `src/components/shared` y `src/components/ui`, no en componentes privados de features o páginas.

`directoryConfig` define por recurso título, módulo de permiso, vínculo de rol y campos. `DirectoryForm`, `ConfigurableFields`, `PersonaFields` y `SearchOrCreatePersona` comparten el flujo; hooks/tipos/API de `features/personas` son lógica, no una segunda UI.

### SearchOrCreatePersona

Valor controlado `PersonaSelection`: `{ kind: "none" }`, `{ kind: "existing", persona }` o `{ kind: "new", borradorPersona }`. Props: `value`, `onChange`, `canCreate`, `canReactivate`, `forzarRUCnatural`, `disabled`, `errors`, y adaptadores opcionales `lookup(identification, signal)`/`reactivate(id)`. El mismo bloque se usa en Cliente, Proveedor Persona (RUC natural obligatorio), Empleado, Usuario directo y contacto Sociedad (alta/cambio).

La consulta exacta incluye inactivos; cancelación y versión de solicitud evitan respuestas obsoletas. Un fallo de red/permiso no equivale a ausencia. Una identidad activa se selecciona sin edición implícita; una inactiva necesita reactivación autorizada. Completar Persona solo selecciona un borrador. Cancelarla/cambiar selección conserva los campos del formulario padre; un error de submit conserva sus datos para corregir. No se persiste con POST Persona separado: únicamente el maestro Personas admite esa alta independiente.

`buildDirectoryInput` genera `persona_id` XOR `persona_nueva`; para Sociedad, `persona_contacto_id` XOR `persona_contacto_nueva`. El alta usa una sola petición del recurso. En PUT Sociedad, omitir ambas conserva contacto; enviar una cambia contacto atómicamente sin alterar Persona anterior. El backend resuelve Persona activa existente sin sobrescribir, recupera carreras de identidad específicas y hace rollback de la unidad de trabajo ante fallos. Persona inactiva/rol duplicado produce `409`; no se simula atomicidad con dos llamadas.

`GET /api/v1/personas/contrato` entrega OpenAPI autenticado por el prefijo API y requiere `PERSONAS.leer`. `supportsComposite` revisa el esquema POST antes de habilitar altas/cambio contextual; no usar fallback de dos requests si el servidor no confirma soporte. `GET /api/v1/personas/{id}/vinculos` permite detectar roles y dependencias; el backend filtra detalles por permisos y vuelve a validar la baja.

### Permisos y seguridad

Se consumen permisos efectivos por entidad: `PERSONAS`, `TIPOS_CLIENTE`, `CLIENTES`, `PROVEEDORES_PERSONA`, `PROVEEDORES_SOCIEDAD`, `EMPLEADOS`, `USUARIOS`, sin inferir acceso por nombre de rol. El bootstrap backend `a9c3d6e41f82` añade concesiones CRUD faltantes solo a Administrador/Admin activos; los demás necesitan concesión explícita. La API siempre vuelve a autorizar.

Crear rol exige su `crear` y `PERSONAS.leer`; insertar Persona requiere también `PERSONAS.crear`, y alta Empleado requiere `USUARIOS.crear`. Consultar permisos propios (`GET /api/v1/usuarios/{id}/permisos`) exige autenticación, no `USUARIOS.leer`; consultar otros sí lo exige. Reactivación/reset/invalidación requieren `actualizar` del recurso. Los payloads productivos no envían `usuario_auditoria`: el JWT determina el actor.

Username se normaliza trim/lowercase y es único incluyendo inactivos (índice funcional SQL). Contraseñas nuevas: ocho o más caracteres. Persona/username de Usuario y Persona de roles son inmutables (`409` ante cambio efectivo); Rol activo es editable. Read nunca contiene claves/hashes/código de aprobación, solo indicadores autorizados. La temporal del reset se presenta en el resultado autorizado y se descarta al cerrarlo, sin cache/storage/URL/logs.

Alta Empleado guarda Persona+Empleado+Usuario juntos. Su baja revoca Usuario y access/refresh sin afectar Persona o roles comerciales. Reactivar Empleado no restaura Usuario; reactivarlo requiere acción separada y, con Empleado inactivo, `confirmar_empleado_inactivo=true` como decisión administrativa explícita. `POST /api/v1/usuarios/{id}/invalidar-sesion` revoca tokens previos sin desactivar cuenta.

### Lecturas y límites

Los maestros usan paginación/filtros del servidor: `only_active=true` por defecto, `false` incluye ambos estados y `estado=inactivo` selecciona inactivos. La identidad se muestra desde la proyección Read `persona` (incluido contacto de Sociedad); no se copia a tablas de rol. Sociedad exige email y admite teléfono opcional. El catálogo se filtra por flags activos `aplica_persona_natural`/`aplica_sociedad`: `01`/`03` natural, `02`/`05` sociedad, `04` ambos, desconocidos ninguno. La validación local de identificación no prueba estado/existencia SRI; reglas de comprobantes son independientes.

Persona es exclusivamente natural y global, con composiciones FK 1:1 de Cliente/Proveedor Persona/Empleado/Usuario. Sociedad conserva identidad jurídica separada y contacto natural mutable 1:N. Cliente Sociedad sigue pendiente: no hay B2B completo. Directorio comercial global no significa aislamiento por tenant. Consumidor Final conserva `cliente_id=null`, sin identidad ficticia. Habilitación comercial por Empresa, multiempleo, portal, exterior y placa fiscal son capacidades futuras; este cambio no altera stock, cartera histórica ni FE-EC.

Esta documentación refleja interfaces actuales; no certifica E2E sobre backend real, responsive/accesibilidad completos, migraciones desplegadas ni cierre de tareas OpenSpec. Siguen requiriendo los gates conjuntos. Existen helpers legacy `getClientes`/`getProveedores*` que solicitan hasta 1000 filas para otros consumidores: no extender la garantía de paginación del maestro a todos los módulos.

## Base React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Abrir el servidor

Si el frontend ya está visible en la red, puedes buscarlo y abrir el navegador con:

```bash
npm run open:server
```

El script busca un host respondiendo en el puerto `5173` dentro de la subred local y, si no encuentra ninguno, abre `http://localhost:5173`.
