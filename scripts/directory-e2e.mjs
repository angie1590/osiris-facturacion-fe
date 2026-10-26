import assert from "node:assert/strict";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomInt, randomBytes } from "node:crypto";
import { chromium } from "playwright";

const fixturePath = process.argv[2];
assert(fixturePath, "Provide the restricted fixture path");
const facts = JSON.parse(readFileSync(fixturePath, "utf8"));
const folder = dirname(fixturePath);
const frontend = "http://127.0.0.1:4175";
const results = [];
const screenshots = [];
const requests = [];
const records = new Map();
const observedCreations = [];
const backgroundFailures = new Set();
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1280, height: 900 },
});
await context.addInitScript(
  (refresh) => localStorage.setItem("refresh_token", refresh),
  facts.refresh_token,
);
const page = await context.newPage();
page.setDefaultTimeout(12000);
page.on("request", (request) => {
  if (
    request.url().includes("/api/v1/") &&
    ["POST", "PUT", "DELETE"].includes(request.method())
  ) {
    requests.push({
      method: request.method(),
      path: new URL(request.url()).pathname,
    });
  }
});
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.pathname.startsWith("/api/v1/") && response.status() >= 400) {
    backgroundFailures.add(
      `${response.status()} ${url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "{id}")}`,
    );
  }
  const resource = url.pathname.slice("/api/v1/".length);
  if (
    response.request().method() === "POST" &&
    response.status() === 201 &&
    ["personas", ...configs.map((config) => config.resource)].includes(resource)
  ) {
    observedCreations.push(
      response.json().then((record) => remember(resource, record)),
    );
  }
});

function persist() {
  writeFileSync(fixturePath, JSON.stringify(facts), { mode: 0o600 });
  chmodSync(fixturePath, 0o600);
}

async function api(method, path, body, token = facts.access_token) {
  const response = await fetch(`${facts.base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const raw = await response.text();
  const data = raw ? JSON.parse(raw) : null;
  if (
    method === "POST" &&
    response.status === 201 &&
    !path.slice(1).includes("/")
  )
    remember(path.slice(1), data);
  return { status: response.status, data };
}

function remember(resource, record) {
  for (const entry of [
    { resource, id: record.id },
    ...(record.persona_id
      ? [{ resource: "personas", id: record.persona_id }]
      : []),
    ...(record.persona_contacto_id
      ? [{ resource: "personas", id: record.persona_contacto_id }]
      : []),
  ]) {
    if (
      !facts.created.some(
        (existing) =>
          existing.resource === entry.resource && existing.id === entry.id,
      )
    )
      facts.created.push(entry);
  }
  persist();
}

async function check(name, action) {
  try {
    await action();
    results.push({ name, status: "passed" });
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    const message = String(error.message).replaceAll(
      facts.password,
      "[redacted]",
    );
    facts.last_failure_stack = String(error.stack).replaceAll(
      facts.password,
      "[redacted]",
    );
    persist();
    results.push({ name, status: "failed", message });
    console.log(`FAIL ${name}: ${message.split("\n")[0]}`);
    await page.keyboard.press("Escape").catch(() => {});
    return false;
  }
}

const configs = [
  { resource: "clientes", route: "/clientes", singular: "Cliente" },
  {
    resource: "proveedores-persona",
    route: "/proveedores",
    tab: "Proveedores Persona",
    singular: "Proveedor Persona",
  },
  {
    resource: "proveedores-sociedad",
    route: "/proveedores",
    tab: "Proveedores Sociedad",
    singular: "Proveedor Sociedad",
  },
  { resource: "empleados", route: "/admin/empleados", singular: "Empleado" },
  { resource: "usuarios", route: "/admin/usuarios", singular: "Usuario" },
];

async function openNew(config) {
  await page.goto(frontend + config.route);
  if (config.tab)
    await page.getByRole("tab", { name: config.tab, exact: true }).click();
  await page
    .getByRole("button", { name: `Nuevo ${config.singular}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: `Nuevo ${config.singular}`,
    exact: true,
  });
  await dialog.waitFor();
  await page.waitForFunction(
    () =>
      !document.body.textContent.includes(
        "Verificando contrato del servidor...",
      ),
  );
  return dialog;
}

async function geometry(name) {
  const dialog = page.getByRole("dialog");
  const dimensions = await dialog.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const controls = Array.from(
      element.querySelectorAll("input,select,button"),
    );
    return {
      viewport: { width: innerWidth, height: innerHeight },
      bounds: {
        left: bounds.left,
        right: bounds.right,
        top: bounds.top,
        bottom: bounds.bottom,
      },
      overflow: element.scrollWidth > element.clientWidth + 1,
      outside: controls.filter((control) => {
        const rect = control.getBoundingClientRect();
        return (
          rect.width &&
          (rect.left < bounds.left - 1 || rect.right > bounds.right + 1)
        );
      }).length,
    };
  });
  assert(
    dimensions.bounds.left >= 0 &&
      dimensions.bounds.right <= dimensions.viewport.width,
    "Dialog exceeds viewport width",
  );
  assert(
    dimensions.bounds.top >= 0 &&
      dimensions.bounds.bottom <= dimensions.viewport.height,
    "Dialog exceeds viewport height",
  );
  assert.equal(dimensions.overflow, false, "Dialog has horizontal overflow");
  assert.equal(dimensions.outside, 0, "Controls exceed dialog width");
  const controls = dialog.locator(
    "input:enabled, select:enabled, button:enabled",
  );
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    assert(
      await control.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        return hit === element || element.contains(hit);
      }),
      "Form control remains covered after scrolling",
    );
  }
  await dialog.locator("input,select").first().scrollIntoViewIfNeeded();
  const filename = join(folder, `${name}.png`);
  await page.screenshot({
    path: filename,
    mask: [page.locator('input[type="password"]')],
  });
  screenshots.push(filename);
}

function field(dialog, label) {
  return dialog.getByLabel(new RegExp(`^${label}(?:\\s*\\*)?$`)).first();
}

function personaInput(tag, identification, natural = false) {
  return {
    tipo_identificacion: natural ? "RUC" : "PASAPORTE",
    identificacion: (
      identification ?? `UAT${facts.suffix}${tag}`
    ).toUpperCase(),
    nombre: "UAT",
    apellido: `${tag}${facts.suffix}`,
    direccion: "UAT direccion",
    telefono: "0991234567",
    ciudad: "Quito",
    email: `uat.${facts.suffix}.${tag.toLowerCase()}@example.com`,
  };
}

async function fixturePersona(input) {
  const response = await api("POST", "/personas", input);
  assert.equal(response.status, 201, `Fixture Persona HTTP ${response.status}`);
  remember("personas", response.data);
  return response.data;
}

async function selectCatalog(dialog, label, text) {
  const control = dialog
    .locator("label")
    .filter({ hasText: new RegExp(`^${label}`) })
    .locator("..")
    .getByRole("combobox");
  await control.click();
  await page.getByRole("option", { name: text, exact: true }).click();
}

async function resourceFields(dialog, config, tag, index = 0) {
  if (config.resource === "clientes")
    await selectCatalog(
      dialog,
      "Tipo de Cliente",
      facts.customer_types[0].nombre,
    );
  if (config.resource === "proveedores-persona")
    await field(dialog, "Nombre comercial").fill(`UAT ${tag}`);
  if (config.resource === "proveedores-sociedad") {
    await field(dialog, "RUC Sociedad").fill(facts.society_rucs[index]);
    await field(dialog, "Razon social").fill(
      `UAT Sociedad ${tag} ${facts.suffix}`,
    );
    await dialog
      .getByLabel(/^Direccion(?:\s*\*)?$/)
      .last()
      .fill("UAT Sociedad direccion");
    await dialog
      .getByLabel(/^Email(?:\s*\*)?$/)
      .last()
      .fill(`sociedad.${tag.toLowerCase()}.${facts.suffix}@example.com`);
  }
  if (config.resource.startsWith("proveedores-")) {
    const options = await field(dialog, "Tipo de contribuyente")
      .locator("option")
      .evaluateAll((elements) =>
        elements.map((element) => element.value).filter(Boolean),
      );
    assert.deepEqual(
      options.sort(),
      config.resource === "proveedores-persona"
        ? ["01", "03", "04"]
        : ["02", "04", "05"],
    );
    await field(dialog, "Tipo de contribuyente").selectOption(
      config.resource === "proveedores-persona" ? "01" : "02",
    );
  }
  if (config.resource === "empleados") {
    await field(dialog, "Salario").fill("500.00");
    await field(dialog, "Fecha de ingreso").fill("2026-10-03");
    await selectCatalog(
      dialog,
      "Empresa",
      facts.companies[0].razon_social ?? facts.companies[0].nombre,
    );
  }
  if (["empleados", "usuarios"].includes(config.resource)) {
    await selectCatalog(
      dialog,
      "Rol",
      facts.roles.find((role) => role.id === facts.role_id).nombre,
    );
    await field(dialog, "Usuario").fill(
      `uat_${tag.toLowerCase()}_${facts.suffix}`,
    );
    await field(dialog, "Contrasena").fill(facts.password);
  }
}

async function searchPersona(dialog, input) {
  const region = dialog.locator('section[aria-label="Buscar o crear Persona"]');
  const type = region.getByLabel(/^Tipo de identificacion/).first();
  if (await type.isEnabled())
    await type.selectOption(input.tipo_identificacion);
  await region
    .getByLabel(/^Identificacion/)
    .first()
    .fill(input.identificacion);
  const completed = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === "/api/v1/personas" &&
      new URL(response.url()).searchParams.get("identificacion") ===
        input.identificacion,
  );
  await region
    .getByRole("button", { name: "Buscar Persona", exact: true })
    .click();
  const response = await completed;
  assert.equal(response.status(), 200);
  return region;
}

async function chooseNew(dialog, input) {
  const region = await searchPersona(dialog, input);
  await region
    .getByRole("button", { name: "Completar Persona", exact: true })
    .waitFor();
  for (const [label, value] of [
    ["Nombre", input.nombre],
    ["Apellido", input.apellido],
    ["Direccion", input.direccion],
    ["Email", input.email],
  ])
    await field(region, label).fill(value);
  await region
    .getByRole("button", { name: "Completar Persona", exact: true })
    .click();
  await region
    .getByText("Borrador Persona seleccionado", { exact: true })
    .waitFor();
}

async function submit(dialog, config, editing = false) {
  const start = requests.length;
  const responsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === (editing ? "PUT" : "POST") &&
      new URL(response.url()).pathname ===
        `/api/v1/${config.resource}${editing ? `/${editing}` : ""}`,
  );
  await dialog
    .getByRole("button", {
      name: editing ? "Actualizar" : "Guardar",
      exact: true,
    })
    .click();
  const response = await responsePromise;
  const record = await response.json();
  assert.equal(
    response.status(),
    editing ? 200 : 201,
    `${config.resource} HTTP ${response.status()} (${JSON.stringify(record.detail ?? record.code ?? "unexpected")})`,
  );
  if (!editing) remember(config.resource, record);
  const mutations = requests
    .slice(start)
    .filter((request) => request.method === (editing ? "PUT" : "POST"));
  assert.equal(
    mutations.filter((request) => request.path === "/api/v1/personas").length,
    0,
    "Composite flow issued independent POST Personas",
  );
  assert.equal(
    mutations.filter(
      (request) =>
        request.path ===
        `/api/v1/${config.resource}${editing ? `/${editing}` : ""}`,
    ).length,
    1,
    "Expected exactly one composite write",
  );
  await page
    .getByRole("dialog", { name: `Detalle ${config.singular}`, exact: true })
    .waitFor();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .last()
    .click();
  return record;
}

async function findRow(config, query) {
  await page.goto(frontend + config.route);
  if (config.tab)
    await page.getByRole("tab", { name: config.tab, exact: true }).click();
  const response = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      new URL(response.url()).pathname === `/api/v1/${config.resource}` &&
      new URL(response.url()).searchParams.get("q") === query,
  );
  await page.getByRole("textbox", { name: "Buscar directorio" }).fill(query);
  assert.equal((await response).status(), 200);
  const row = page
    .getByRole("row")
    .filter({ has: page.getByRole("button", { name: /^Ver / }) });
  await row.first().waitFor();
  assert.equal(await row.count(), 1, "Expected exactly one fixture row");
  return row;
}

async function createFlow(config, reuse, index) {
  await page.setViewportSize(
    reuse ? { width: 1280, height: 900 } : { width: 390, height: 844 },
  );
  const tag = `${config.resource.replaceAll("-", "")}${reuse ? "Reuse" : "New"}`;
  const input = personaInput(
    tag,
    config.resource === "proveedores-persona"
      ? facts.natural_rucs[index]
      : undefined,
    config.resource === "proveedores-persona",
  );
  const existing = reuse ? await fixturePersona(input) : null;
  const dialog = await openNew(config);
  await resourceFields(dialog, config, tag, index);
  if (reuse) {
    await searchPersona(dialog, input);
    await dialog
      .getByText(`${input.nombre} ${input.apellido}`, { exact: true })
      .waitFor();
  } else {
    await chooseNew(dialog, input);
    const parentSnapshot = () =>
      dialog.evaluate((element) =>
        Array.from(
          element.querySelectorAll("input,select,button[role=combobox]"),
        )
          .filter(
            (control) =>
              !control.closest('section[aria-label="Buscar o crear Persona"]'),
          )
          .map((control) => ({ value: control.value ?? control.textContent })),
      );
    const beforeCancel = await parentSnapshot();
    const start = requests.length;
    await dialog
      .getByRole("button", { name: "Cancelar Persona", exact: true })
      .click();
    assert(await dialog.isVisible(), "Cancelling draft closed parent");
    assert(
      JSON.stringify(await parentSnapshot()) === JSON.stringify(beforeCancel),
      "Cancelling draft changed parent fields",
    );
    assert.equal(
      requests
        .slice(start)
        .filter(
          (request) =>
            request.path === "/api/v1/personas" && request.method === "POST",
        ).length,
      0,
    );
    await chooseNew(dialog, input);
  }
  if (reuse) {
    const start = requests.length;
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal(requests.length, start, "Cancelling parent mutated data");
    const reopened = await openNew(config);
    await searchPersona(reopened, input);
    await resourceFields(reopened, config, tag, index);
  }
  const activeDialog = page.getByRole("dialog", {
    name: `Nuevo ${config.singular}`,
    exact: true,
  });
  await geometry(
    `${config.resource}-${reuse ? "reuse-desktop" : "draft-mobile"}`,
  );
  const record = await submit(activeDialog, config);
  const personaId = record.persona_id ?? record.persona_contacto_id;
  assert(personaId, "Role not linked to Persona");
  if (existing)
    assert.equal(personaId, existing.id, "Existing Persona was not reused");
  const links = await api("GET", `/personas/${personaId}/vinculos`);
  assert.equal(links.status, 200);
  if (config.resource === "proveedores-sociedad")
    assert(
      links.data.proveedores_sociedad.some(
        (society) => society.id === record.id,
      ),
    );
  else
    assert.equal(
      links.data[
        {
          clientes: "cliente",
          "proveedores-persona": "proveedor_persona",
          empleados: "empleado",
          usuarios: "usuario",
        }[config.resource]
      ].id,
      record.id,
    );
  if (config.resource === "empleados") {
    assert(
      links.data.usuario?.activo,
      "Employee did not create active Usuario",
    );
    remember("usuarios", { id: links.data.usuario.id });
    record.worker = {
      id: links.data.usuario.id,
      username: `uat_${tag.toLowerCase()}_${facts.suffix}`,
    };
  }
  records.set(`${config.resource}-${reuse ? "reuse" : "new"}`, {
    record,
    input,
    config,
  });
  const person = await api("GET", `/personas/${personaId}`);
  assert.equal(person.data.identificacion, input.identificacion);
}

async function businessChecks() {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const config of configs) {
    await check(
      `${config.resource}: API rejects duplicate without changing existing role`,
      async () => {
        const target = records.get(`${config.resource}-new`);
        assert(target, "Creation flow did not complete");
        const before = await api(
          "GET",
          `/${config.resource}/${target.record.id}`,
        );
        const record = target.record;
        const payload =
          config.resource === "proveedores-sociedad"
            ? {
                ruc: record.ruc,
                razon_social: record.razon_social,
                direccion: record.direccion,
                email: record.email,
                tipo_contribuyente_id: record.tipo_contribuyente_id,
                persona_contacto_id: record.persona_contacto_id,
              }
            : { persona_id: record.persona_id };
        if (config.resource === "clientes")
          payload.tipo_cliente_id = record.tipo_cliente_id;
        if (config.resource === "proveedores-persona")
          payload.tipo_contribuyente_id = record.tipo_contribuyente_id;
        if (config.resource === "empleados")
          Object.assign(payload, {
            empresa_id: record.empresa_id,
            salario: record.salario,
            fecha_ingreso: record.fecha_ingreso,
            usuario: {
              username: record.worker.username,
              password: facts.password,
              rol_id: facts.role_id,
            },
          });
        if (config.resource === "usuarios")
          Object.assign(payload, {
            username: record.username,
            password: facts.password,
            rol_id: facts.role_id,
          });
        assert.equal(
          (await api("POST", `/${config.resource}`, payload)).status,
          409,
        );
        assert.deepEqual(
          (await api("GET", `/${config.resource}/${record.id}`)).data,
          before.data,
        );
      },
    );
  }
  for (const config of configs.filter(
    (item) => item.resource !== "proveedores-sociedad",
  )) {
    await check(
      `${config.resource}: duplicate, inactive role and reactivation`,
      async () => {
        const target = records.get(`${config.resource}-reuse`);
        assert(target, "Creation flow did not complete");
        let dialog = await openNew(config);
        await searchPersona(dialog, target.input);
        await dialog
          .getByText(`Esta Persona ya tiene ${config.singular} activo.`, {
            exact: true,
          })
          .waitFor();
        assert(
          await dialog
            .getByRole("button", { name: "Guardar", exact: true })
            .isDisabled(),
        );
        await dialog
          .getByRole("button", { name: "Ver existente", exact: true })
          .click();
        await page
          .getByRole("dialog", {
            name: `Detalle ${config.singular}`,
            exact: true,
          })
          .waitFor();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Cerrar", exact: true })
          .last()
          .click();
        const removed = await api(
          "DELETE",
          `/${config.resource}/${target.record.id}`,
        );
        assert.equal(removed.status, 204);
        dialog = await openNew(config);
        await searchPersona(dialog, target.input);
        await dialog
          .getByText(`Esta Persona ya tiene ${config.singular} inactivo.`, {
            exact: true,
          })
          .waitFor();
        assert(
          await dialog
            .getByRole("button", { name: "Guardar", exact: true })
            .isDisabled(),
        );
        if (config.resource === "empleados") {
          await dialog
            .getByRole("button", { name: "Cancelar", exact: true })
            .click();
          assert.equal(
            (await api("POST", `/empleados/${target.record.id}/reactivar`))
              .status,
            200,
          );
          assert.equal(
            (await api("GET", `/usuarios/${target.record.worker.id}`)).data
              .activo,
            false,
          );
        } else {
          await dialog
            .getByRole("button", {
              name: `Reactivar ${config.singular}`,
              exact: true,
            })
            .click();
          await page
            .getByRole("dialog", {
              name: `Detalle ${config.singular}`,
              exact: true,
            })
            .waitFor();
          await page
            .getByRole("dialog")
            .getByRole("button", { name: "Cerrar", exact: true })
            .last()
            .click();
        }
      },
    );
  }
  await check(
    "Persona dependencies block logical delete in UI and API",
    async () => {
      const target = records.get("clientes-new");
      assert(target, "Client creation did not complete");
      const row = await findRow(
        { route: "/personas", resource: "personas" },
        target.input.identificacion,
      );
      await row.getByRole("button", { name: /^Desactivar / }).click();
      const dialog = page.getByRole("dialog", {
        name: "Desactivar Persona",
        exact: true,
      });
      await dialog.getByText(/Dependencias activas:/).waitFor();
      assert(
        await dialog
          .getByRole("button", { name: "Desactivar", exact: true })
          .isDisabled(),
      );
      const response = await api(
        "DELETE",
        `/personas/${target.record.persona_id}`,
      );
      assert.equal(response.status, 409);
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
    },
  );
  await check(
    "Inactive Persona cannot create role until explicit reactivation",
    async () => {
      const input = personaInput("Inactive");
      const person = await fixturePersona(input);
      assert.equal((await api("DELETE", `/personas/${person.id}`)).status, 204);
      const config = configs[0];
      const dialog = await openNew(config);
      await searchPersona(dialog, input);
      await dialog.getByText("Persona inactiva", { exact: true }).waitFor();
      assert(
        await dialog
          .getByRole("button", { name: "Guardar", exact: true })
          .isDisabled(),
      );
      assert.equal(
        (
          await api("POST", "/clientes", {
            persona_id: person.id,
            tipo_cliente_id: facts.customer_types[0].id,
          })
        ).status,
        409,
      );
      await dialog
        .getByRole("button", { name: "Reactivar Persona", exact: true })
        .click();
      await dialog.getByText("Activa", { exact: true }).waitFor();
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
    },
  );
  await check(
    "Employee UI baja revokes worker access and refresh only",
    async () => {
      const target = records.get("empleados-new");
      assert(target, "Employee creation did not complete");
      const form = new URLSearchParams({
        username: target.record.worker.username,
        password: facts.password,
      });
      const loginResponse = await fetch(`${facts.base}/auth/login`, {
        method: "POST",
        body: form,
      });
      assert.equal(loginResponse.status, 200);
      const login = await loginResponse.json();
      const row = await findRow(target.config, target.input.identificacion);
      await row.getByRole("button", { name: /^Desactivar / }).click();
      const dialog = page.getByRole("dialog", {
        name: "Desactivar Empleado",
        exact: true,
      });
      await dialog
        .getByText("Se desactivara su Usuario y se revocaran sus sesiones.", {
          exact: true,
        })
        .waitFor();
      const response = page.waitForResponse(
        (response) =>
          response.request().method() === "DELETE" &&
          new URL(response.url()).pathname ===
            `/api/v1/empleados/${target.record.id}`,
      );
      await dialog
        .getByRole("button", { name: "Desactivar", exact: true })
        .click();
      assert.equal((await response).status(), 204);
      assert.equal(
        (await api("GET", `/usuarios/${target.record.worker.id}`)).data.activo,
        false,
      );
      assert.equal(
        (await api("GET", "/auth/me", undefined, login.access_token)).status,
        401,
      );
      assert.equal(
        (
          await api("POST", "/auth/refresh", {
            refresh_token: login.refresh_token,
          })
        ).status,
        401,
      );
      assert.equal((await api("GET", "/auth/me")).status, 200);
    },
  );
  await check(
    "Society contact replacement preserves old Persona and parent fields",
    async () => {
      const target = records.get("proveedores-sociedad-new");
      assert(target, "Society creation did not complete");
      const oldContact = await api(
        "GET",
        `/personas/${target.record.persona_contacto_id}`,
      );
      const row = await findRow(target.config, target.record.razon_social);
      await row.getByRole("button", { name: /^Editar / }).click();
      const dialog = page.getByRole("dialog", {
        name: "Editar Proveedor Sociedad",
        exact: true,
      });
      await dialog
        .getByRole("button", { name: "Cambiar contacto", exact: true })
        .click();
      await chooseNew(dialog, personaInput("ContactReplacement"));
      await dialog
        .getByRole("button", { name: "Cancelar Persona", exact: true })
        .click();
      assert.equal(
        await field(dialog, "Razon social").inputValue(),
        target.record.razon_social,
      );
      await dialog
        .getByRole("button", {
          name: "Cancelar cambio de contacto",
          exact: true,
        })
        .click();
      await dialog
        .getByRole("button", { name: "Cambiar contacto", exact: true })
        .click();
      const replacement = await fixturePersona(
        personaInput("ExistingReplacement"),
      );
      await searchPersona(dialog, replacement);
      const updated = await submit(dialog, target.config, target.record.id);
      assert.equal(updated.persona_contacto_id, replacement.id);
      const after = await api("GET", `/personas/${oldContact.data.id}`);
      assert.deepEqual(after.data, oldContact.data);
    },
  );
  await check(
    "User reset shows temporary password once without cache or storage",
    async () => {
      const target = records.get("usuarios-new");
      assert(target, "User creation did not complete");
      const row = await findRow(target.config, target.record.username);
      await row
        .getByRole("button", {
          name: `Restaurar clave ${target.record.username}`,
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog", {
        name: "Restaurar clave",
        exact: true,
      });
      const response = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname ===
          `/api/v1/usuarios/${target.record.id}/reset-password`,
      );
      await dialog
        .getByRole("button", { name: "Confirmar", exact: true })
        .click();
      const secret = (await (await response).json()).password_temporal;
      assert(secret && secret.length >= 8, "Missing generated password");
      const passwordDialog = page.getByRole("dialog", {
        name: "Contrasena temporal",
        exact: true,
      });
      await passwordDialog.waitFor();
      assert((await passwordDialog.textContent()).includes(secret));
      await passwordDialog
        .getByRole("button", { name: "Cerrar", exact: true })
        .last()
        .click();
      assert.equal(
        await page
          .getByRole("dialog", { name: "Contrasena temporal", exact: true })
          .count(),
        0,
      );
      assert.equal(
        await page.evaluate(
          (password) =>
            Object.values(localStorage).some((value) =>
              value.includes(password),
            ) ||
            Object.values(sessionStorage).some((value) =>
              value.includes(password),
            ),
          secret,
        ),
        false,
      );
      await row.getByRole("button", { name: /^Ver / }).click();
      assert(
        !(await page.getByRole("dialog").textContent()).includes(secret),
        "Password resurfaced in details",
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Cerrar", exact: true })
        .last()
        .click();
      await page.reload();
      await page
        .getByRole("button", { name: "Nuevo Usuario", exact: true })
        .waitFor();
      assert.equal(
        await page
          .getByRole("dialog", { name: "Contrasena temporal", exact: true })
          .count(),
        0,
      );
    },
  );
  await check(
    "Explicit read-only role: UI hides writes and direct writes return 403",
    async () => {
      const role = await api("POST", "/roles", {
        nombre: `UAT read ${facts.suffix}`,
        descripcion: "Temporary directory UAT",
      });
      assert.equal(role.status, 201);
      remember("roles", role.data);
      const modules = await api("GET", "/modulos?only_active=true&limit=1000");
      assert.equal(modules.status, 200);
      for (const module of modules.data.items.filter((item) =>
        [
          "PERSONAS",
          "CLIENTES",
          "PROVEEDORES_PERSONA",
          "PROVEEDORES_SOCIEDAD",
          "EMPLEADOS",
          "USUARIOS",
        ].includes(item.codigo),
      )) {
        const permission = await api("POST", "/roles-modulos-permisos", {
          rol_id: role.data.id,
          modulo_id: module.id,
          puede_leer: true,
          puede_crear: false,
          puede_actualizar: false,
          puede_eliminar: false,
        });
        assert.equal(permission.status, 201);
        remember("roles-modulos-permisos", permission.data);
      }
      const username = `uat_read_${facts.suffix}`;
      const password = randomBytes(24).toString("base64url");
      const user = await api("POST", "/usuarios", {
        username,
        password,
        rol_id: role.data.id,
        persona_nueva: personaInput("ReadOnly"),
      });
      assert.equal(user.status, 201);
      remember("usuarios", user.data);
      const loginResponse = await fetch(`${facts.base}/auth/login`, {
        method: "POST",
        body: new URLSearchParams({ username, password }),
      });
      assert.equal(loginResponse.status, 200);
      const login = await loginResponse.json();
      assert.equal(
        (
          await api(
            "POST",
            "/auth/change-password",
            {
              current_password: password,
              new_password: randomBytes(24).toString("base64url"),
            },
            login.access_token,
          )
        ).status,
        200,
      );
      assert.equal(
        (
          await api(
            "POST",
            "/auth/approval-code",
            { approval_code: String(randomInt(1000, 10000)) },
            login.access_token,
          )
        ).status,
        200,
      );
      for (const config of configs) {
        const target = records.get(`${config.resource}-new`);
        assert.equal(
          (await api("POST", `/${config.resource}`, {}, login.access_token))
            .status,
          403,
          `${config.resource} read-only POST did not return 403`,
        );
        assert.equal(
          (
            await api(
              "PUT",
              `/${config.resource}/${target.record.id}`,
              {},
              login.access_token,
            )
          ).status,
          403,
          `${config.resource} read-only PUT did not return 403`,
        );
        assert.equal(
          (
            await api(
              "DELETE",
              `/${config.resource}/${target.record.id}`,
              undefined,
              login.access_token,
            )
          ).status,
          403,
          `${config.resource} read-only DELETE did not return 403`,
        );
      }
      const readContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
      });
      try {
        await readContext.addInitScript(
          (refresh) => localStorage.setItem("refresh_token", refresh),
          login.refresh_token,
        );
        const readPage = await readContext.newPage();
        for (const config of configs) {
          await readPage.goto(frontend + config.route);
          if (config.tab)
            await readPage
              .getByRole("tab", { name: config.tab, exact: true })
              .click();
          await readPage
            .getByRole("textbox", { name: "Buscar directorio" })
            .waitFor();
          assert.equal(
            await readPage
              .getByRole("button", {
                name: `Nuevo ${config.singular}`,
                exact: true,
              })
              .count(),
            0,
          );
          assert.equal(
            await readPage.getByRole("button", { name: /^Editar / }).count(),
            0,
          );
          assert.equal(
            await readPage
              .getByRole("button", { name: /^Desactivar / })
              .count(),
            0,
          );
        }
      } finally {
        await readContext.close();
      }
    },
  );
}

async function cleanup() {
  await Promise.allSettled(observedCreations);
  const pending = [];
  const actorIds = new Set([facts.actor.id, facts.actor.persona_id]);
  for (const resource of [
    "proveedores-sociedad",
    "empleados",
    "clientes",
    "proveedores-persona",
    "usuarios",
    "roles-modulos-permisos",
    "tipos-cliente",
    "roles",
    "personas",
  ]) {
    for (const entry of facts.created
      .filter((item) => item.resource === resource && !actorIds.has(item.id))
      .reverse()) {
      try {
        const current = await api("GET", `/${resource}/${entry.id}`);
        if (current.status === 404) {
          const inactive = await api(
            "GET",
            `/${resource}?only_active=false&estado=inactivo&limit=1000`,
          );
          if (
            inactive.status === 200 &&
            inactive.data.items.some(
              (item) => item.id === entry.id && !item.activo,
            )
          )
            continue;
        }
        if (current.status !== 200)
          throw new Error(`GET HTTP ${current.status}`);
        if (current.data.activo) {
          const response = await api("DELETE", `/${resource}/${entry.id}`);
          if (response.status !== 204)
            throw new Error(`DELETE HTTP ${response.status}`);
        }
      } catch (error) {
        pending.push({ ...entry, error: error.message });
      }
    }
  }
  for (const [resource, id] of [
    ["usuarios", facts.actor.id],
    ["personas", facts.actor.persona_id],
  ]) {
    const current = await api(
      "GET",
      `/${resource}/${id}`,
      undefined,
      facts.originToken,
    );
    if (current.status === 200 && !current.data.activo) continue;
    const response = await api(
      "DELETE",
      `/${resource}/${id}`,
      undefined,
      facts.originToken,
    );
    if (response.status !== 204)
      pending.push({ resource, id, error: `DELETE HTTP ${response.status}` });
  }
  facts.cleanup_pending = pending;
  persist();
  console.log(`Cleanup pending: ${pending.length}`);
}

try {
  await check("Real session restored for temporary actor", async () => {
    const me = await api("GET", "/auth/me");
    assert.equal(me.status, 200);
    if (!me.data.has_approval_code) {
      const configured = await api("POST", "/auth/approval-code", {
        approval_code: String(randomInt(1000, 10000)),
      });
      assert.equal(configured.status, 200);
    }
    await page.goto(frontend + "/personas");
    await page
      .getByRole("button", { name: "Nuevo Persona", exact: true })
      .waitFor();
    assert.equal((await api("GET", "/auth/me")).status, 200);
  });
  for (const config of configs) {
    await check(
      `${config.resource}: desktop form and authenticated contract`,
      async () => {
        await openNew(config);
        assert.equal(
          await page
            .getByText("El servidor no confirma soporte", { exact: false })
            .count(),
          0,
        );
        await geometry(`${config.resource}-desktop`);
        await page
          .getByRole("button", { name: "Cancelar", exact: true })
          .click();
      },
    );
    await check(`${config.resource}: mobile form bounds`, async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openNew(config);
      await geometry(`${config.resource}-mobile`);
      await page.getByRole("button", { name: "Cancelar", exact: true }).click();
      await page.setViewportSize({ width: 1280, height: 900 });
    });
  }
  if (!process.argv.includes("--probe")) {
    for (const config of configs) {
      await check(
        `${config.resource}: new Persona, cancellation and single composite POST`,
        () => createFlow(config, false, 0),
      );
      await check(
        `${config.resource}: existing Persona reuse and single composite POST`,
        () => createFlow(config, true, 1),
      );
    }
    await businessChecks();
  }
} finally {
  if (!process.argv.includes("--probe")) await cleanup();
  const report = join(folder, "report.json");
  writeFileSync(
    report,
    JSON.stringify(
      {
        results,
        screenshots,
        requests,
        backgroundFailures: [...backgroundFailures],
      },
      null,
      2,
    ),
    { mode: 0o600 },
  );
  await browser.close();
  console.log(`Report: ${report}`);
}
process.exitCode = results.some((result) => result.status === "failed") ? 1 : 0;
