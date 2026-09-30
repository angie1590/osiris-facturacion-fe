# Evidencia visual: configuración de empresa

## Entorno

- Ruta: `/empresa`.
- Navegador: Chromium controlado con Playwright.
- Datos: autenticación, empresa y sucursal interceptados con respuestas estables.
- Estados inspeccionados: formulario completo, paneles expandidos, navegación móvil cerrada.

## Resultados

- Los seis paneles conservan ancho uniforme y no se solapan.
- La grilla de campos cambia de dos columnas a una columna en móvil.
- `PageHeader` apila título y acción debajo de `sm`, manteniendo visible `Guardar cambios`.
- `Topbar` oculta la etiqueta de rol debajo de `sm` y conserva el botón de cuenta accesible.
- En una medición móvil de 312 px CSS, `documentElement.scrollWidth` y `clientWidth` fueron iguales.
- El host de navegador integrado limita y reescala contextos Playwright; se verificó además un caso extremo de aproximadamente 182 px para comprobar apilado. Ese ancho no se considera viewport soportado.

## Alcance visual aprobado

- REC-001 y REC-002 se implementaron como un único recorrido vertical de empresa.
- Se mantuvo la identidad azul/cian de Osiris en lugar de copiar la paleta magenta de la referencia.
- Los campos sin contrato persistente quedaron documentados como diferencias, no como controles ficticios.
- Los patrones de panel, aviso, cabecera, campo y tabla permanecen en componentes compartidos.