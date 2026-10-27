## ADDED Requirements

### Requirement: Administrative delivery does not implement Product cutover
Deliveries 1-6 SHALL limit runtime UI work to catalog administration and shared contract verification. They SHALL NOT change ProductosPage, atomic Product persistence, primary-category FK activation or legacy bridge ownership. Future Product work SHALL require the subsequent delivery gate.

#### Scenario: Catalog features are enabled before Product integration
- **WHEN** administration uses units and canonical effective attributes
- **THEN** the release SHALL document the Product limitation and SHALL NOT mark Product atomicity or the full Product E2E complete.

### Requirement: Frontend types and errors match the backend contract
Administrative DTOs SHALL be generated or verified against OpenAPI before enabling an action. Shared paths/fields SHALL match the coordinated backend design, including mapping_id, expanded unit, origin and precondicion_preview. Error details SHALL retain code, message, counts and permitted actions with readable names instead of raw IDs when available.

#### Scenario: Backend endpoint is unavailable or incompatible
- **WHEN** an action's canonical contract has not been deployed
- **THEN** the action SHALL be gated or report a compatible error and SHALL NOT silently fall back to locally resolved inheritance or invented payloads.

### Requirement: Preview confirmation uses the exact draft and state precondition
The UI SHALL capture an immutable previewed payload and send it with precondicion_preview and explicit consent flags. Changing any semantic draft field SHALL invalidate preview. Expired or stale previews SHALL require re-preview, not automatic retries of a potentially different mutation.

#### Scenario: Default changes after preview
- **WHEN** an operator modifies a default or unit before confirming
- **THEN** the old confirmation SHALL be invalidated and a new preview SHALL be required.

#### Scenario: Server returns CATALOG_PREVIEW_STALE
- **WHEN** the related data changed while a confirmation was open
- **THEN** UI SHALL retain the draft, explain the conflict, refresh availability and request fresh preview without reporting success.

### Requirement: Effective permissions control each administrative action
Reads and writes SHALL honor effective CATEGORIAS, ATRIBUTOS and UNIDADES permissions independently of role names. Configuring mappings SHALL require category-update plus attribute-read; global edit/deactivation SHALL require the corresponding attribute action. JWT SHALL remain audit authority; new calls SHALL NOT claim a frontend actor as identity.

#### Scenario: Actor can configure mappings but cannot edit global attributes
- **WHEN** inherited or own attributes are displayed
- **THEN** permitted configuration actions SHALL remain available while Editar definicion global and global deactivation SHALL be hidden or disabled.

#### Scenario: Permission changes after opening a draft
- **WHEN** backend denies submission with 403
- **THEN** no success SHALL be displayed and the draft SHALL be retained with readable authorization detail.

### Requirement: Accessible states preserve work on all viewports
The UI SHALL use shared/ui components, accessible tree/menu/dialog controls, keyboard/focus support, loading/empty/error/retry states and stable responsive layouts. 409, 422 and network errors SHALL preserve user input; pending mutations SHALL prevent duplicate submission. Switching categories SHALL NOT show old effective data as if belonging to the new category.

#### Scenario: Effective attribute request fails on mobile
- **WHEN** the selected category cannot load its effective schema
- **THEN** the panel SHALL show a readable error and retry action, avoid overlapping controls and SHALL NOT display another category's attributes as valid.

#### Scenario: Mutation fails after confirmation
- **WHEN** an update returns 409, 422 or a network failure
- **THEN** both the original draft and error detail SHALL remain recoverable and the dialog SHALL NOT close as successful.

### Requirement: Completion requires evidence per delivery
Each vertical delivery SHALL verify its complete administrative journey, permission states, concurrent conflicts, responsive screenshots and executable tests. npm test, npm run lint and npm run build SHALL be green. Full Product E2E and obsolete-bridge removal SHALL remain explicitly deferred, not marked complete because artifacts exist.

#### Scenario: All planning artifacts validate
- **WHEN** OpenSpec reports the change ready for apply
- **THEN** implementation checkboxes SHALL remain unchecked until their tests and acceptance criteria have actually passed.