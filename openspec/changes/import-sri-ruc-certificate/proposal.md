## Why

El formulario de empresa puede autocompletarse con datos oficiales del certificado RUC, evitando transcripción repetitiva sin sacrificar revisión humana.

## What Changes

- Añadir carga PDF dentro de `/empresa` usando componentes compartidos.
- Mostrar progreso, errores y una vista previa de campos detectados.
- Aplicar al formulario solo después de confirmación explícita.
- Mostrar datos informativos no persistibles sin fingir que se guardarán.

## Capabilities

### New Capabilities
- `company-ruc-pdf-autofill`: carga, revisión y aplicación de datos del certificado SRI.

### Modified Capabilities

## Impact

- Feature empresa y `EmpresaCanonicaPage`.
- Reutiliza `ConfigurationNotice`, `ConfigurationPanel`, `DetailModal` y `FormField`.