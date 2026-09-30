## ADDED Requirements

### Requirement: Navegación única por tarea
La aplicación SHALL ofrecer una sola entrada visible para cada tarea principal y SHALL agruparlas en Inicio, Ventas, Compras, Inventario, Catálogo, Terceros, Reportes y Administración.

#### Scenario: Usuario busca registrar una compra
- **WHEN** abre el módulo Compras
- **THEN** encuentra el recorrido comercial sin tener que registrar además un ingreso manual

### Requirement: Navegación por rol
La aplicación SHALL ocultar o deshabilitar rutas y acciones no autorizadas de forma consistente con backend.

#### Scenario: Operador abre administración
- **WHEN** intenta acceder a una ruta administrativa
- **THEN** la aplicación muestra acceso denegado y no presenta acciones de edición