## ADDED Requirements

### Requirement: Common components only

All UI created or consumed for Directory workflows SHALL use common components from src/components/shared and src/components/ui. Additional components SHALL be common and configurable for all modules that need them. Pages SHALL only orchestrate data/configuration/actions and compose common UI, not define private reusable visual components. Feature hooks/types/API SHALL NOT transitively import private UI.

#### Scenario: Existing common component fits

- **WHEN** a workflow needs a table, input, modal, selector, confirmation or status
- **THEN** it SHALL consume the common component rather than a local copy or another module's private component.

#### Scenario: New UI capability is needed

- **WHEN** an existing component cannot express required behavior
- **THEN** the extension or new component SHALL live in the common component layer with documented configuration and tests, and SHALL NOT be implemented as module-local UI.

### Requirement: One canonical workflow per business task

The interface SHALL evolve existing canonical Directory and administration routes without duplicate visible screens for the same task and SHALL preserve required legacy redirects.

#### Scenario: Open an existing commercial view

- **WHEN** an operator opens Personas, Clientes or supplier views
- **THEN** the existing canonical workflow SHALL present the updated common UI rather than a parallel replacement screen.

### Requirement: Embedded Search-or-Create Persona in every dependent form

A shared controlled SearchOrCreatePersona component SHALL resolve normalized identification before creation in Cliente, Proveedor Persona, Empleado, direct Usuario and Sociedad contact create/change. Existing active Persona SHALL be reused; missing Persona SHALL expose common fields in the current flow; no navigation to Persona master SHALL be required.

#### Scenario: Existing Persona is found

- **WHEN** identification matches active Persona while creating Cliente
- **THEN** the form SHALL show its readonly identity summary and request only role-specific fields, without copying identity into Cliente storage.

#### Scenario: Persona is absent

- **WHEN** identification search succeeds with no result in any dependent form
- **THEN** common Persona fields SHALL open inline and completion SHALL select the new draft automatically without navigation or second search.

#### Scenario: Supplier natural-person restriction

- **WHEN** SearchOrCreatePersona is used by Proveedor Persona
- **THEN** it SHALL require natural-person RUC and SHALL reject incompatible found Persona using backend policy feedback.

#### Scenario: Inactive Persona or role is found

- **WHEN** lookup finds inactive Persona or an existing inactive target role
- **THEN** the UI SHALL show the historical record and an authorized explicit reactivation action instead of submitting a duplicate.

#### Scenario: Identity input changes during async lookup

- **WHEN** identification changes before a previous lookup completes
- **THEN** the old result SHALL NOT select a Persona for the new identification and any previous selection SHALL be invalidated.

### Requirement: Parent state is preserved and contextual submit is atomic

Opening, cancelling or completing Persona fields SHALL preserve parent fields. New Persona SHALL stay as a draft until the parent sends one composite request. Successful submission SHALL link the backend-resolved Persona automatically; failures SHALL preserve editable state. Contextual flows SHALL NOT issue independent Persona create followed by role create.

#### Scenario: Cancel Persona while employee data exists

- **WHEN** an operator cancels the Persona subform after entering labor/access data
- **THEN** salary, company, dates, username and role selections SHALL remain without unintended reset or persistence.

#### Scenario: New Persona and customer are saved

- **WHEN** a valid Cliente form containing a new Persona is submitted
- **THEN** the UI SHALL send one POST clientes with persona_nueva, link the returned Persona/Cliente automatically and refresh relevant lists.

#### Scenario: Parent creation fails

- **WHEN** composite creation returns a role or credential error
- **THEN** the UI SHALL retain draft and parent fields, display field/detail errors and SHALL NOT issue separate compensating creates or report success.

#### Scenario: Backend reused a competing Persona

- **WHEN** submit resolves a Persona created concurrently by another actor
- **THEN** the UI SHALL refresh the persisted identity summary and SHALL NOT overwrite it with the original draft.

### Requirement: Customer and TipoCliente workflows

Cliente UI SHALL show Persona data and active TipoCliente/discount separately, prevent role duplication, allow audited classification change and expose detail/deactivation/reactivation. TipoCliente UI SHALL support normalized unique name, inclusive discount 0..100 and active-client dependency handling. Consumidor Final SHALL NOT require a fictitious master record.

#### Scenario: Existing active customer

- **WHEN** selected Persona already has active Cliente
- **THEN** the UI SHALL provide access to that Cliente and SHALL prevent duplicate submission.

#### Scenario: Classification in use cannot be deactivated

- **WHEN** TipoCliente is used by active Clientes and deactivation is requested
- **THEN** the UI SHALL display blocking references and require reassignment rather than hiding the conflict.

### Requirement: Supplier workflows and replaceable society contact

Proveedor Persona SHALL combine common Persona RUC selection with role-specific commercial/tax fields. Sociedad SHALL separate juridical data from common natural-person contact selection, allow contact change/create in place, use semantic taxpayer applicability and treat phone as optional when allowed by backend.

#### Scenario: New supplier and natural Persona

- **WHEN** a supplier RUC has no Persona and the operator completes the form
- **THEN** one composite request SHALL create/link Persona and Proveedor Persona with the selected applicable taxpayer type.

#### Scenario: Society contact is changed to a new Persona

- **WHEN** a new contact draft is completed while changing Sociedad contact
- **THEN** one Sociedad update SHALL submit the contact draft and preserve juridical fields without modifying the previous Persona.

### Requirement: Employee labor and access workflow

Empleado creation SHALL combine common Persona, labor and credential sections in one form and one request. The UI SHALL support configured age/date rules and decimal salary without overriding backend authority. Deactivation SHALL communicate user/session revocation; reactivation SHALL present the existing Usuario for a separate administrative decision.

#### Scenario: New employee with new Persona

- **WHEN** all Persona/labor/access sections are submitted
- **THEN** a single composite Empleado request SHALL contain the draft Persona and Usuario credentials, with inline errors for any failing section.

#### Scenario: Employee reactivated

- **WHEN** an operator reactivates Empleado
- **THEN** the UI SHALL NOT silently reactivate Usuario and SHALL expose authorized role/reset/reactivation actions for the existing account.

### Requirement: Direct user administration and secure credential feedback

Usuario creation SHALL support contextual Persona without requiring Empleado. Lists SHALL show permitted full name, identification, username, role, active state, forced-password-change state and approval-code presence indicator. UI SHALL expose authorized role change, reset, activate/deactivate, session invalidation and effective permissions; credentials SHALL NOT implicitly edit Persona or expose hashes.

#### Scenario: Direct user needs new Persona

- **WHEN** an administrator completes Persona and credentials in Nuevo Usuario
- **THEN** one composite Usuario create SHALL link both records without employee creation or navigation.

#### Scenario: Password reset result

- **WHEN** an authorized reset returns a temporary password
- **THEN** it SHALL be shown only in that transient result and SHALL NOT be stored in query cache, storage, URL, logs or telemetry; closing SHALL discard it.

#### Scenario: Change personal information from user detail

- **WHEN** an actor needs to correct Usuario's name/contact information
- **THEN** the UI SHALL invoke an explicit permitted Persona edit/detail workflow rather than add identity fields to credential update.

### Requirement: Server-side search pagination and active filters

All Directory lists SHALL use server pagination/search/ordering over complete datasets, default to active records and allow explicit include-inactive/inactive-only views. Persona search SHALL include identification, name, surname, email and phone; role search SHALL include related Persona data. Filter/order changes SHALL reset pagination.

#### Scenario: Search result lies outside loaded page

- **WHEN** an operator searches for a matching record not in the current page
- **THEN** a server query SHALL return it with correct total and the UI SHALL NOT rely on filtering a truncated local list.

#### Scenario: Show inactive records

- **WHEN** the actor explicitly selects an inactive view
- **THEN** the request SHALL use the documented inactive filter and SHALL show reactivation actions according to permissions without treating only_active=false as inactive-only.

### Requirement: Combined detail links and safe deactivation

Common detail UI SHALL combine readonly Persona, role-specific data, state, permitted audit metadata and role badges without storing duplicate identity. Persona deactivation SHALL first load active dependencies including society contact usage and SHALL handle a later backend conflict.

#### Scenario: Persona has active dependencies

- **WHEN** an operator requests Persona deactivation
- **THEN** the common dependency dialog SHALL name blocking roles/usages and SHALL prevent a misleading destructive confirmation.

#### Scenario: Dependencies change after initial check

- **WHEN** backend rejects confirmed deactivation with new dependencies
- **THEN** the UI SHALL refresh the displayed dependencies and preserve the record rather than report success.

### Requirement: Effective permissions and authoritative audit

UI actions SHALL respect effective read/create/update/delete and security-action permissions, including embedded Persona creation. Production requests SHALL NOT send editable or fabricated audit actors. Hidden buttons SHALL NOT be regarded as authorization.

#### Scenario: Role create allowed but Persona create denied

- **WHEN** an actor may create Cliente but lacks Persona create permission
- **THEN** the UI SHALL allow permitted reuse of an existing Persona but SHALL NOT offer unauthorized new Persona creation and SHALL handle server 403.

#### Scenario: Audit metadata displayed

- **WHEN** an actor views creation or update metadata
- **THEN** it SHALL be readonly and requests SHALL NOT send usuario_auditoria as an authoritative actor.

### Requirement: Loading empty errors and accessible responsive states

Common UI SHALL provide loading, empty, no-match, retryable network-error, permission-error and mutation-error states with accessible labels, required markers, field errors, keyboard navigation and mobile/desktop layouts without overlaps. API detail SHALL remain understandable and errors SHALL NOT erase form state.

#### Scenario: Lookup fails rather than returning no result

- **WHEN** Persona search returns a network/server error
- **THEN** the UI SHALL display retryable error and SHALL NOT claim Persona absent or silently open duplicate creation.

#### Scenario: Forbidden or invalid payload

- **WHEN** backend returns 403, 409 or 422
- **THEN** shared error handling SHALL preserve readable detail and state, map field errors where applicable and expose only permitted conflict actions.

#### Scenario: Mobile or keyboard operation

- **WHEN** an operator completes the flow on a mobile viewport or via keyboard
- **THEN** common fields, selector, dialogs and actions SHALL remain reachable, correctly focused, readable and non-overlapping.

### Requirement: Coordinated release and declared boundaries

New workflows SHALL only be enabled against the compatible backend composite/query/lifecycle contracts. Shared-component tests, five-context workflow tests, full frontend suite, lint and build SHALL be release gates. The application SHALL NOT emulate missing atomicity, register juridical customers as natural Persona or claim complete commercial tenant isolation.

#### Scenario: Backend does not support composite endpoint

- **WHEN** frontend cannot use the agreed composite contract
- **THEN** the dependent new workflow SHALL remain disabled or present a compatible shared error and SHALL NOT fall back to independent Persona and role creates.

#### Scenario: Private UI appears during implementation

- **WHEN** a touched Directory workflow imports or defines a private visual component
- **THEN** the common-component architecture gate SHALL fail before release.
