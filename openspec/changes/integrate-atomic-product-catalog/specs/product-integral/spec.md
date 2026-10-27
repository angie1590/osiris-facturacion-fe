## ADDED Requirements

### Requirement: El formulario integral tendrá una única ruta canónica
La interfaz MUST mantener una sola experiencia de alta, edición y detalle en `/productos`. Los aliases ingleses de producto MUST redirigir a la ruta española equivalente y conservar la intención de crear, ver o editar. El formulario MUST consultar categorías seleccionables y atributos efectivos del backend, no reconstruir herencia ni consultar `/categorias-atributos`.

#### Scenario: Abrir alta desde alias inglés
- **WHEN** el usuario navega a `/products/new`
- **THEN** la aplicación redirige a `/productos?accion=nuevo` y abre el formulario canónico

#### Scenario: Cargar opciones efectivas
- **WHEN** el usuario selecciona una categoría principal
- **THEN** el formulario carga y muestra atributos efectivos de esa categoría, incluyendo heredados, según el contrato del backend

#### Scenario: Error al cargar catálogo
- **WHEN** falla la carga de categorías o atributos
- **THEN** la interfaz muestra un estado de error explícito, distinto de una lista vacía, y no permite guardar como si la carga hubiera sido válida

### Requirement: Alta y edición enviarán una sola mutación integral
El formulario MUST enviar datos generales, `categoria_principal_id`, impuestos y valores EAV mediante un único POST de alta o PUT de edición. MUST NOT enviar `categoria_ids` ni `usuario_auditoria`, llamar una segunda vez a `PUT /productos/{id}/atributos` ni usar el GET legacy. La respuesta del servidor MUST actualizar el detalle y el listado visible.

#### Scenario: Alta integral
- **WHEN** un usuario completa datos válidos y confirma la creación
- **THEN** el cliente envía exactamente una solicitud POST integral con categoría, impuestos y atributos tipados

#### Scenario: Edición integral
- **WHEN** un usuario edita un producto existente sin cambiar su categoría
- **THEN** el formulario precarga detalle y valores, envía un único PUT integral y no elimina atributos omitidos

#### Scenario: Rechazo de servidor
- **WHEN** el POST o PUT integral es rechazado
- **THEN** el formulario conserva los datos y valores introducidos y no muestra éxito ni limpia el borrador

### Requirement: Los atributos dinámicos respetarán tipo, unidad y defaults explícitos
El formulario MUST renderizar controles según tipo, opciones, límites y signo recibidos del resolver efectivo. MUST presentar la unidad solo como sufijo visual, conservar el valor EAV tipado sin símbolos y aplicar únicamente defaults explícitos entregados por backend. MUST marcar atributos obligatorios y mapear errores por campo, incluidos `PRODUCT_REQUIRED_ATTRIBUTES_MISSING`, `PRODUCT_ATTRIBUTE_NOT_APPLICABLE` y `PRODUCT_ATTRIBUTE_VALUE_INVALID`.

#### Scenario: Atributo numérico con unidad
- **WHEN** el resolver devuelve un atributo decimal o entero con unidad
- **THEN** el control muestra la unidad como sufijo y transmite solamente el número tipado

#### Scenario: Obligatorio sin default
- **WHEN** un atributo obligatorio no tiene valor ni default explícito
- **THEN** el formulario lo señala como pendiente y no inventa `N/A`, cero, fecha, booleano ni primera opción

#### Scenario: Campo incompatible
- **WHEN** el usuario introduce un valor que no cumple tipo, opciones o rango declarados
- **THEN** el campo muestra el error y el formulario conserva el valor y el resto del borrador

### Requirement: La edición precargará el estado canónico completo
Al abrir una edición, el formulario MUST recuperar el detalle canónico del producto y precargar categoría principal, valores EAV, impuestos y datos generales. MUST relacionar valores con definiciones mediante `atributo_id`, no mediante nombre visible.

#### Scenario: Abrir un producto existente
- **WHEN** el usuario elige editar un producto
- **THEN** la categoría principal, valores de atributos, unidad y perfil tributario aparecen precargados en el formulario único

#### Scenario: Detalle inválido
- **WHEN** falla la lectura del detalle o el contrato es inconsistente
- **THEN** la interfaz muestra error y no sustituye los valores desconocidos por defaults ni campos vacíos editables

### Requirement: Cambiar categoría requerirá preview legible y vigente
Al cambiar la categoría, el formulario MUST solicitar el preview sin persistir el producto. Debe mostrar conservados, desactivados, defaults, nuevos obligatorios y faltantes con nombres legibles; la confirmación MUST usar el token devuelto y el borrador exacto. Cancelar el preview no debe descartar el borrador general.

#### Scenario: Preview y confirmación
- **WHEN** el usuario propone otra categoría
- **THEN** la interfaz muestra el impacto y permite confirmar solo cuando los obligatorios están satisfechos y el token sigue asociado al borrador actual

#### Scenario: Usuario cancela preview
- **WHEN** el usuario cancela el cambio de categoría
- **THEN** el producto no se guarda con la categoría nueva y los demás datos del borrador permanecen disponibles

#### Scenario: Preview obsoleto
- **WHEN** backend responde `409 CATALOG_PREVIEW_STALE`
- **THEN** la interfaz conserva el borrador, invalida la confirmación anterior y permite solicitar un preview nuevo

### Requirement: La interfaz respetará permisos efectivos de Producto
La ruta de lectura MUST requerir `PRODUCTOS.leer`; alta MUST requerir `PRODUCTOS.crear`; edición, preview y confirmación MUST requerir `PRODUCTOS.actualizar`; baja MUST requerir `PRODUCTOS.eliminar`. La interfaz MUST distinguir carga pendiente, permiso denegado y error de consulta, y nunca usar el nombre de rol ni un actor enviado desde frontend como autorización.

#### Scenario: Usuario con solo lectura
- **WHEN** un usuario tiene `PRODUCTOS.leer` pero no crear/actualizar
- **THEN** puede consultar productos, pero no ve ni ejecuta controles de mutación

#### Scenario: Sin permiso de lectura
- **WHEN** un usuario carece de `PRODUCTOS.leer`
- **THEN** la ruta muestra acceso denegado sin exponer los datos del producto
