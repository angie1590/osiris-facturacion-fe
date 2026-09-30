## ADDED Requirements

### Requirement: Estado SRI accionable
La interfaz SHALL distinguir borrador, pendiente, autorizado y rechazado, y SHALL ofrecer solo las acciones válidas para cada estado.

#### Scenario: Documento rechazado
- **WHEN** una factura recibe rechazo del SRI
- **THEN** el usuario ve el mensaje y una acción de reintento o corrección compatible

### Requirement: Descarga de comprobantes
La interfaz SHALL permitir descargar XML autorizado y RIDE cuando el backend los habilite.

#### Scenario: Factura autorizada
- **WHEN** el usuario abre una factura autorizada
- **THEN** puede descargar XML y RIDE con nombres de archivo identificables