## ADDED Requirements

### Requirement: Category administration has one canonical view
/categorias SHALL contain the category tree and attribute panel. Create/edit/move and attribute operations SHALL preserve the selected category and stay in that view. Legacy /atributos and /categorias-atributos SHALL redirect without duplicate routes or alternative visible administration pages.

#### Scenario: Inline edit succeeds
- **WHEN** an actor confirms an attribute definition edit
- **THEN** the same selected category SHALL remain visible with refreshed attributes, tree counts and remap state without navigating to a separate attribute page.

### Requirement: Tree and selectable hierarchy use backend truth
The tree SHALL consume /categorias/arbol with backend effective counts and tiene_hijos. Parent selection SHALL support expansion, search and readable full paths at arbitrary supported depth. Canonical writes SHALL NOT calculate or submit es_padre. Backend sibling ordering SHALL be preserved from first render through refresh.

#### Scenario: New child is created under a former leaf
- **WHEN** the selected parent will receive its first child
- **THEN** the UI SHALL expose the B3 impact confirmation when applicable, then refresh canonical hierarchy without manually setting parent flags.

#### Scenario: Inactive sibling name is recreated
- **WHEN** backend returns CATEGORY_DUPLICATE_NAME referencing historical identity
- **THEN** the draft SHALL remain and the UI SHALL explain reactivation or explicit renaming rather than creating another row.

### Requirement: Temporary categories have protected actions
Sin clasificar SHALL be visibly temporary and SHALL NOT expose manual edit/move/delete/reactivate or normal destination selection. Ordinary inactive category reactivation SHALL remain a distinct authorized action preserving identity.

#### Scenario: Tree displays a B3 bucket
- **WHEN** a temporal category is returned by backend
- **THEN** its system status SHALL be apparent and no enabled manual mutation action SHALL target it.

### Requirement: Attribute panel consumes canonical effective metadata
The panel SHALL consume /categorias/{id}/atributos-efectivos rather than resolving ancestors locally. It SHALL show readable name/type/unit, own/inherited origin, required state, default and actions. It SHALL preserve backend explicit-order-first sorting and alphabetical ordering otherwise.

#### Scenario: Server selects a different effective override
- **WHEN** refreshed effective data identifies the child as origin
- **THEN** the panel SHALL display that origin/configuration and SHALL NOT overwrite it using a local ancestor traversal.

### Requirement: Existing canonical attributes can be assigned or locally overridden
Agregar atributo SHALL offer assigning an existing definition or creating and assigning one atomically. Search SHALL display type/unit and readable usage. Heredados SHALL offer Ver categoria de origen, Sobrescribir configuracion en esta categoria and Editar definicion global according to effective permissions. Override SHALL use the same atributo_id with a child mapping and SHALL NOT PUT the ancestor mapping.

#### Scenario: User overrides inherited Marca
- **WHEN** an actor selects local override in Mouse
- **THEN** the draft SHALL distinguish inherited settings from the local target and submit a contextual assignment for Mouse using Marca's existing ID.

#### Scenario: Existing assignment is inactive
- **WHEN** backend reactivates a historical mapping during assignment
- **THEN** UI SHALL display the returned identity and refreshed effective result without inserting a local duplicate.

### Requirement: Required state does not fabricate a default
Required and default SHALL be independent controls. A default SHALL be optional unless explicitly used for backfill. Omitted fields SHALL mean preserve; null SHALL mean clear. The UI SHALL send backfill false unless explicitly selected and confirmed, and SHALL rely on backend preview for required-value gaps and override-aware scope.

#### Scenario: Required without default has no missing Products
- **WHEN** an actor enables required with no default and preview permits it
- **THEN** the form SHALL allow saving null default rather than demand or invent a fallback value.

#### Scenario: Required transition has incomplete Products
- **WHEN** backend reports PRODUCT_REQUIRED_ATTRIBUTES_MISSING
- **THEN** UI SHALL show counts and permitted actions, retain the draft, and require valid values or explicit default/backfill before proceeding; it SHALL NOT announce a background remediation queue.

#### Scenario: Actor declines backfill
- **WHEN** a default is stored without opting into existing-product updates
- **THEN** the request SHALL send aplicar_default_a_existentes=false and SHALL NOT describe existing values as updated.

### Requirement: Removing a local assignment is not global deactivation
Own mappings SHALL expose Quitar de esta categoria separately from Dar de baja atributo global. Each action SHALL preview its actual categories/Products/values and require appropriate confirmation. Inherited mappings SHALL NOT offer removal of their ancestor from the child as a local action.

#### Scenario: Removing an override preserves ancestral applicability
- **WHEN** removal preview says the ancestor mapping remains effective
- **THEN** confirmation SHALL explain that applicable values are retained, not describe a global attribute deletion.

#### Scenario: Global deactivation is requested
- **WHEN** an authorized actor chooses global deactivation
- **THEN** confirmation SHALL explicitly show global scope and pending-remap conflicts SHALL preserve all data and draft state.

### Requirement: Lifecycle actions use backend restoration safety
The same administrative view SHALL expose active/history filters, authorized reactivation and Revertir ultimo cambio only where backend reports availability. Confirmation SHALL show operation/time/scope. Legacy without snapshot SHALL display recovery guidance. Resolved remaps or post-state conflicts SHALL refresh availability without overwriting data.

#### Scenario: Undo becomes stale while its dialog is open
- **WHEN** server rejects undo with ATTRIBUTE_STATE_CHANGED
- **THEN** the view SHALL keep current data, explain the conflict, refresh lifecycle information and SHALL NOT show a successful restoration.