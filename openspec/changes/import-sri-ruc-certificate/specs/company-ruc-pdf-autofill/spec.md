## ADDED Requirements

### Requirement: Carga y revisión
La aplicación SHALL permitir seleccionar un PDF SRI de hasta 5 MB y SHALL mostrar la vista previa devuelta por backend antes de modificar el formulario.

#### Scenario: PDF procesado
- **WHEN** el backend devuelve datos detectados
- **THEN** se muestran campos aplicables, información adicional y advertencias con acciones Aplicar o Cancelar

### Requirement: Aplicación confirmada
La aplicación MUST modificar únicamente el formulario local cuando el usuario confirma y MUST requerir el guardado normal para persistir.

#### Scenario: Usuario confirma vista previa
- **WHEN** pulsa Aplicar al formulario
- **THEN** los campos compatibles se actualizan, el formulario queda sucio y la empresa aún no se guarda

### Requirement: Estados consistentes
La carga SHALL usar componentes compartidos y comunicar selección, procesamiento, error y éxito sin subir archivos distintos de PDF.

#### Scenario: PDF rechazado
- **WHEN** la API rechaza el documento
- **THEN** se muestra el mensaje legible y el formulario existente permanece intacto