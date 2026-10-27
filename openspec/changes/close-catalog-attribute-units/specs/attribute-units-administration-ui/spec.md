## ADDED Requirements

### Requirement: Unit administration uses exact symbols and protected state
/unidades SHALL list/search/filter units by readable name, code, exact symbol, magnitude and active/history status with effective UNIDADES permissions. Protected system units SHALL NOT expose enabled mutation controls. In-use conflicts SHALL use backend history-aware detail, not a local count of active attributes.

#### Scenario: MB and Mb both exist
- **WHEN** unit results contain those symbols
- **THEN** the view SHALL preserve exact case and show them as different records without case normalization.

#### Scenario: Unit is referenced only in history
- **WHEN** a mutation returns UNIT_IN_USE
- **THEN** the UI SHALL explain the history reference and retain current state rather than force deactivation.

### Requirement: Numeric attribute units are optional and canonical
Creating numeric attributes SHALL initially leave uses-unit unchecked. Editing SHALL reflect the actual unidad_id. Checking SHALL require an active catalog selection showing nombre and simbolo, with magnitude filtering when provided. Unchecking SHALL send unidad_id=null explicitly. Unit controls SHALL NOT appear for non-numeric types or imply Product commercial units.

#### Scenario: RAM is created with GB
- **WHEN** an actor selects Gigabyte (GB) for integer RAM
- **THEN** the definition SHALL submit unidad_id and numeric values SHALL remain separate from that symbol.

#### Scenario: SKU uses a string type
- **WHEN** SKU is created or edited
- **THEN** the unit control SHALL not offer numeric units and the canonical payload SHALL have null unit, subject to server history constraints on type changes.

### Requirement: Defaults show unit suffix without changing stored value
Category configuration SHALL show the effective fixed unit next to default controls and default display. The payload SHALL never concatenate unit to value. The panel SHALL show type and unit without requiring Product-form implementation in this delivery.

#### Scenario: Operator enters default sixteen GB
- **WHEN** the field displays numeric 16 and GB suffix
- **THEN** the request SHALL contain only canonical 16 as default value and the attribute's unit reference separately.

### Requirement: First annotation is an explicit semantic confirmation
When backend reports existing values on null-to-unit, the UI SHALL preview counts and state that existing numbers will now be interpreted in the selected unit without numerical changes. It SHALL submit confirmar_anotacion_unidad=true only after explicit confirmation with the exact previewed payload/precondition.

#### Scenario: Existing forty-two values receive GB
- **WHEN** first-unit preview reports 42 existing values
- **THEN** the confirmation SHALL name GB, display that count and explain no number is converted before enabling annotation submission.

#### Scenario: Annotation is cancelled
- **WHEN** an actor cancels the semantic confirmation
- **THEN** no mutation SHALL be sent and the editable draft SHALL remain available.

### Requirement: Unit switching and removal do not pretend to convert history
ATTRIBUTE_UNIT_CHANGE_REQUIRES_CONVERSION and ATTRIBUTE_UNIT_REMOVAL_REQUIRES_MIGRATION SHALL block ordinary edits without losing the draft. The UI SHALL NOT alter numbers, propose implicit factors or silently remove a historical unit when changing type.

#### Scenario: Populated RAM is changed from GB to MB
- **WHEN** backend rejects the attempted semantic change
- **THEN** the current unit and values SHALL remain displayed and the draft SHALL retain the attempted change for correction.

### Requirement: Annotation undo is distinct from ordinary unit removal
Undo of first annotation SHALL be offered only through backend snapshot availability and a dedicated operation confirmation. It SHALL NOT use ordinary PUT unidad_id=null. Post-state conflicts SHALL explain why restoration was not applied.

#### Scenario: Untouched annotation is reversible
- **WHEN** user confirms safe annotation undo
- **THEN** the UI SHALL call snapshot revert, refresh the category panel and show the prior no-unit state only after server success.

#### Scenario: A value changed after annotation
- **WHEN** the server returns ATTRIBUTE_STATE_CHANGED
- **THEN** the UI SHALL preserve current unit/values and refresh availability without reporting success.