# Catálogo de pantallas de referencia

## REC-001: Datos informativos del negocio

- Ruta objetivo: `/empresa`.
- Objetivo: completar la identidad comercial y tributaria necesaria para emitir comprobantes.
- Roles: `admin`, `supervisor`.
- Datos persistidos actuales: RUC, razón social, nombre comercial, logo, dirección matriz, teléfono, email, tipo de contribuyente, régimen, obligado a contabilidad, contribuyente especial, gran contribuyente, agente de retención y resoluciones.
- Acciones: guardar cambios, cargar/eliminar logo, resolver configuración incompleta y abrir sucursales/puntos de emisión.
- Estados: carga inicial, error de API, configuración incompleta con campos faltantes, formulario válido, guardado exitoso.
- Responsive: dos columnas desde escritorio medio y una columna en móvil; acciones de cabecera deben apilarse sin desbordar.

### Diferencias registradas

- Ciudad, teléfono secundario y calificación de artesano no existen en el contrato backend actual.
- La lectura local de un certificado RUC PDF no se implementará hasta definir parser, tratamiento de datos y campos destino. El archivo no debe subirse silenciosamente.

## REC-002: Opciones para facturación e impuestos

- Ruta objetivo: `/empresa`, como paneles posteriores a los datos del negocio.
- Objetivo: comunicar el modo de emisión y enlazar la configuración tributaria relacionada.
- Datos persistidos actuales: modo de emisión y condición de agente de retención.
- Navegación relacionada: `/impuestos` para catálogo SRI y `/configuracion-operativa` para sucursales, puntos y secuenciales.
- Estados: modo electrónico/físico según régimen, enlaces operativos disponibles y opciones no soportadas señaladas como pendientes, no como controles falsamente persistentes.

### Diferencias registradas

- Precio editable por artículo, reembolso de gastos, propinas y artesano no existen en el dominio actual.
- Los impuestos que emite el negocio no son equivalentes al catálogo global SRI ni a los impuestos asignados por producto; se requiere un cambio coordinado de dominio antes de persistir una selección empresarial.

## Componentes compartidos obligatorios

- `DataTable` para listados tabulares, con sus estados de carga/error/vacío y paginación compartida.
- `FormField` para etiqueta, error, ayuda y atributos accesibles.
- `PageHeader` para título y acciones de página.
- `ConfigurationPanel` para bloques de configuración colapsables o estáticos.
- `ConfigurationNotice` para advertencias de configuración con una acción clara.
- `DetailModal`, `ConfirmDialog`, `EmptyState` y `ErrorState` para estados equivalentes en todas las pantallas.

Las páginas solo deben definir columnas, datos y contenido de dominio; no deben volver a implementar la infraestructura visual o de estados de estos componentes.