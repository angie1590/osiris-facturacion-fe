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