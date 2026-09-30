## ADDED Requirements

### Requirement: Adaptación guiada por recorrido
Cada imagen de referencia SHALL asociarse a una ruta, un objetivo de usuario, estados de carga/vacío/error, permisos y comportamiento responsive antes de su implementación.

#### Scenario: Imagen de pantalla nueva
- **WHEN** se aprueba una imagen de referencia
- **THEN** existe una especificación que identifica datos, acciones y estados antes de modificar componentes

### Requirement: Conservación del contrato funcional
La adaptación visual MUST conservar contratos API y reglas de dominio, salvo que un cambio OpenSpec coordinado los modifique explícitamente.

#### Scenario: Diseño contradice una regla
- **WHEN** una imagen muestra una acción no permitida por el dominio
- **THEN** se registra la decisión pendiente en lugar de implementar la contradicción silenciosamente

### Requirement: Composición con componentes compartidos
Las pantallas SHALL reutilizar componentes comunes para tablas, campos, paneles, diálogos y estados de carga, error y vacío. Una página MUST limitarse a configurar datos, columnas, acciones y contenido específico del dominio cuando exista un componente compartido aplicable.

#### Scenario: Nuevo listado tabular
- **WHEN** una pantalla necesita presentar una colección de registros
- **THEN** utiliza `DataTable` y sus estados compartidos en lugar de implementar una tabla y paginación propias

#### Scenario: Nuevo bloque de configuración
- **WHEN** una pantalla necesita agrupar opciones relacionadas
- **THEN** utiliza el panel de configuración compartido con el mismo encabezado, espaciado y comportamiento responsive