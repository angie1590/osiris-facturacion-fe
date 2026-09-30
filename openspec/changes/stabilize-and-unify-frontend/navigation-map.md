# Mapa de navegación del MVP

## Roles

- `operator`: consulta y operación diaria de ventas, terceros e inventario autorizado.
- `supervisor`: capacidades de operador más compras, configuración operativa, reportes y auditoría.
- `admin`: acceso completo, incluida la configuración global.

## Módulos y rutas objetivo

| Módulo | Rutas principales | Roles |
| --- | --- | --- |
| Inicio | `/` | admin, supervisor, operator |
| Ventas | `/ventas` | admin, supervisor, operator |
| Compras | `/compras`, `/retenciones`, `/cuentas-por-pagar` | admin, supervisor |
| Inventario | `/inventory/ingresos`, `/inventory/egresos`, `/inventory/conteos`, `/kardex` | según operación |
| Catálogo | `/productos`, `/categorias`, `/atributos`, `/categorias-atributos`, `/impuestos`, `/bodegas`, `/catalogs` | consulta general; configuración admin/supervisor |
| Terceros | `/personas` | admin, supervisor, operator |
| Reportes | `/reportes/*`, `/reports/*`, `/documentos-sri`, `/audit` | admin, supervisor |
| Administración | `/empresa`, `/configuracion-operativa`, `/admin/users`, `/admin/params` | admin/supervisor; parámetros solo admin |

## Compatibilidad temporal

- `/admin/company` redirige a `/empresa`.
- `/products`, `/products/new` y `/products/:id` permanecen durante la selección y migración del componente canónico hacia `/productos`.
- `/categories` permanece durante la migración hacia `/categorias`.
- `/customers` y `/suppliers` permanecen durante la consolidación de terceros en `/personas`.
- `/inventory/bajas/*` redirige al recorrido tipado de egresos.
- `/inventory/ajustes/*` redirige al recorrido tipado de ingresos.

Las rutas temporales no deben aparecer como una segunda entrada de primer nivel una vez seleccionado el componente canónico. Su retiro requiere comprobar referencias internas y enlaces externos.

## Reglas de acceso

1. Ocultar un enlace en el sidebar no sustituye la protección de la ruta.
2. Toda ruta administrativa o de reportes debe estar envuelta por `RoleGuard`.
3. Las acciones de escritura que compartan una ruta de consulta deben validarse también dentro de la página y en backend.
4. Las rutas de compatibilidad deben conservar los permisos de su destino.