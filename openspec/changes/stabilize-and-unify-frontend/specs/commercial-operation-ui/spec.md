## ADDED Requirements

### Requirement: Compra como entrada comercial
La interfaz SHALL capturar proveedor, comprobante, fecha, bodega, productos, cantidades, costos e impuestos en un recorrido y SHALL mostrar su efecto de inventario y cartera.

#### Scenario: Compra registrada
- **WHEN** el usuario envía datos válidos
- **THEN** ve el documento creado y referencias a ingreso y cuenta por pagar aplicables

### Requirement: Venta como salida comercial
La interfaz SHALL capturar cliente, punto de emisión, bodega, productos, cantidades y pago y SHALL mostrar estados de inventario, cartera y SRI.

#### Scenario: Venta emitida
- **WHEN** el usuario emite una venta válida
- **THEN** ve secuencial, total y estado SRI sin registrar un egreso adicional