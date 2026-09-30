## ADDED Requirements

### Requirement: Operaciones no comerciales explícitas
La interfaz SHALL ofrecer inventario inicial, ajuste, transferencia, devolución, baja, consumo interno y conteo como operaciones diferenciadas de compras y ventas.

#### Scenario: Ajuste negativo
- **WHEN** el usuario elige ajuste negativo
- **THEN** la interfaz exige motivo, valida stock y presenta el documento generado

### Requirement: Consulta de existencias y kárdex
La interfaz SHALL permitir consultar stock por bodega y kárdex por producto con nombres legibles y filtros de período.

#### Scenario: Consulta de producto
- **WHEN** se selecciona un producto y período
- **THEN** se muestran movimientos, referencias y saldo acumulado sin exponer IDs como etiqueta principal