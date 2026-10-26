## ADDED Requirements

### Requirement: Category attributes support inline editing and lifecycle actions

The `/categorias` attribute panel SHALL expose authorized edit and logical deactivation actions from each attribute row. Editing SHALL remain in the selected category view, preserve the attribute ID and existing product/category relationships, and refresh displayed data after success. `/atributos` SHALL redirect to `/categorias` rather than mounting a separate page.

#### Scenario: Edit an attribute

- **WHEN** an actor with permission opens Editar from an attribute row
- **THEN** an inline common form SHALL load name, type-specific options/catalog/numeric bounds and save to the existing attribute ID without navigating away from `/categorias`.

#### Scenario: Reactivate or deactivate

- **WHEN** an authorized actor requests a lifecycle action
- **THEN** the UI SHALL call the explicit backend endpoint, update the selected category's attribute panel and explain any dependency/remap conflict without deleting rows.

### Requirement: Type changes show impact before confirmation

The UI SHALL request backend preview for proposed type/options/catalog/bounds and SHALL display affected values, convertible values and remaps required. Changes with existing data SHALL require explicit confirmation before the actual update.

#### Scenario: Conversion preview has remaps

- **WHEN** preview reports incompatible product values
- **THEN** the UI SHALL identify their count and warn that their original values remain pending remap before the operator confirms.

#### Scenario: Preview is unavailable or invalid

- **WHEN** preview fails or returns validation errors
- **THEN** the UI SHALL keep the draft, display backend detail and SHALL NOT submit the update.

### Requirement: Undo uses backend snapshot safety result

The UI SHALL offer Revertir último cambio only when backend reports it as currently reversible. Confirmation SHALL show operation/time and affected counts. A 409 caused by intervening edits SHALL refresh state and explain that undo was not applied.

#### Scenario: Revert unchanged operation

- **WHEN** backend confirms the snapshot post-state is intact and undo succeeds
- **THEN** the UI SHALL refresh attribute/assignments and announce restoration of the previous definition and values.

#### Scenario: Value/remap changed after conversion

- **WHEN** backend rejects undo because a remap was resolved or EAV/assignment changed
- **THEN** the UI SHALL retain the current data, refresh lifecycle information and display the conflict reason.

### Requirement: Common accessible states and permissions

The attribute form/actions SHALL use existing shared UI or new components in `src/components/shared`; private components SHALL NOT be added/consumed. Loading, validation, empty, API-error and pending-mutation states SHALL be accessible, responsive, and permission-aware.

#### Scenario: Actor lacks write access

- **WHEN** the actor lacks attribute administration permission
- **THEN** create/edit/delete/reactivate/revert controls SHALL be hidden or disabled, and backend remains authoritative.

#### Scenario: Mutation error preserves draft

- **WHEN** update/delete/revert returns 409/422 or a network error
- **THEN** the form and user input SHALL remain available for correction/retry and shall not report success.

### Requirement: Category assignment required state and default are editable

The `/categorias` attribute-row menu SHALL allow authorized actors to change whether the assignment is required and set its default value. When backfill is selected, the UI SHALL require a separate confirmation that states existing values are preserved and only missing values will be filled.

#### Scenario: Make an optional assignment required

- **WHEN** an actor enables required and enters a default
- **THEN** the form SHALL save the assignment setting and display the default in the category panel.

#### Scenario: Apply a default to existing products

- **WHEN** an actor explicitly selects backfill and confirms it
- **THEN** the client SHALL send `aplicar_default_a_existentes: true`; the backend SHALL fill missing EAV values without overwriting existing values.
