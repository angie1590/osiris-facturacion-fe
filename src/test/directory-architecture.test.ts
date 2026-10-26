/// <reference types="node" />
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const shared = (path: string) =>
  path.startsWith("src/components/shared/") ||
  path.startsWith("src/components/ui/");

function audit(entries: string[], virtual?: Record<string, string>) {
  const errors: string[] = [];
  const visited = new Set<string>();
  const read = (path: string) =>
    virtual
      ? virtual[path]
      : existsSync(resolve(root, path))
        ? readFileSync(resolve(root, path), "utf8")
        : undefined;
  const resolveImport = (specifier: string, parent: string) => {
    const base = specifier.startsWith("@/")
      ? `src/${specifier.slice(2)}`
      : specifier.startsWith(".")
        ? relative(root, resolve(root, dirname(parent), specifier))
        : null;
    return base
      ? [
          base,
          `${base}.ts`,
          `${base}.tsx`,
          `${base}/index.ts`,
          `${base}/index.tsx`,
        ].find((candidate) => read(candidate) !== undefined)
      : undefined;
  };
  const visit = (path: string) => {
    if (visited.has(path)) return;
    visited.add(path);
    const content = read(path);
    if (content === undefined) {
      errors.push(`No se resuelve ${path}`);
      return;
    }
    const source = ts.createSourceFile(
      path,
      content,
      ts.ScriptTarget.Latest,
      true,
      path.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const imports = new Map<string, string>();
    const importedPaths: string[] = [];
    const scan = (node: ts.Node) => {
      if (
        ts.isImportDeclaration(node) &&
        ts.isStringLiteral(node.moduleSpecifier) &&
        !node.importClause?.isTypeOnly
      ) {
        const target = resolveImport(node.moduleSpecifier.text, path);
        if (target) {
          importedPaths.push(target);
          if (node.importClause?.name)
            imports.set(node.importClause.name.text, target);
          const bindings = node.importClause?.namedBindings;
          if (bindings && ts.isNamedImports(bindings))
            for (const binding of bindings.elements)
              if (!binding.isTypeOnly) imports.set(binding.name.text, target);
          if (bindings && ts.isNamespaceImport(bindings))
            imports.set(bindings.name.text, target);
        }
      }
      if (
        ts.isExportDeclaration(node) &&
        !node.isTypeOnly &&
        node.moduleSpecifier &&
        ts.isStringLiteral(node.moduleSpecifier)
      ) {
        const target = resolveImport(node.moduleSpecifier.text, path);
        if (target) importedPaths.push(target);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const target = resolveImport(node.arguments[0].text, path);
        if (target) importedPaths.push(target);
      }
      ts.forEachChild(node, scan);
    };
    scan(source);
    const visual = (node: ts.Node) => {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText(source);
        const provider = tag.endsWith(".Provider") || tag.endsWith(".Consumer");
        if (!provider && !shared(path)) {
          const target = imports.get(tag.split(".")[0]);
          if (!path.startsWith("src/pages/") || !target || !shared(target))
            errors.push(`UI privada: ${path} -> ${tag}`);
        }
      }
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source).split(".").pop();
        if (
          ["createElement", "jsx", "jsxs", "memo", "forwardRef"].includes(
            name ?? "",
          ) &&
          !shared(path)
        )
          errors.push(`Wrapper visual privado: ${path}`);
      }
      ts.forEachChild(node, visual);
    };
    visual(source);
    for (const target of importedPaths) {
      if (shared(path) && target.startsWith("src/pages/"))
        errors.push(`Componente comun acoplado a pagina: ${path}`);
      visit(target);
    }
  };
  entries.forEach(visit);
  return errors;
}

describe("arquitectura de UI comun del directorio (AST e imports)", () => {
  it("todos los recorridos tocados y sus imports transitivos consumen UI comun", () => {
    expect(
      audit([
        "src/pages/PersonasPage.tsx",
        "src/pages/catalog/CustomersPage.tsx",
        "src/pages/catalog/SuppliersPage.tsx",
        "src/pages/admin/AdminUsersPage.tsx",
        "src/pages/admin/EmpleadosPage.tsx",
        "src/components/shared/SearchOrCreatePersona.tsx",
        "src/components/shared/PersonaFields.tsx",
        "src/components/shared/ConfigurableFields.tsx",
      ]),
    ).toEqual([]);
  });
  it("detecta UI privada directa aunque su nombre y ruta no digan components", () => {
    expect(
      audit(["src/pages/Page.tsx"], {
        "src/pages/Page.tsx":
          'import { View } from "@/features/hidden"; export default function Page(){ return <View/>; }',
        "src/features/hidden.tsx": "export function View(){ return <div/>; }",
      }).length,
    ).toBeGreaterThan(0);
  });
  it("detecta UI transitiva consumida por un hook a traves de un barrel", () => {
    expect(
      audit(["src/pages/Page.tsx"], {
        "src/pages/Page.tsx":
          'import "@/features/hook"; export default function Page(){ return null; }',
        "src/features/hook.ts": 'import "./barrel";',
        "src/features/barrel.ts": 'export { Hidden } from "./hidden";',
        "src/features/hidden.tsx": "export function Hidden(){ return <div/>; }",
      }).length,
    ).toBeGreaterThan(0);
  });
  it("detecta wrappers visuales locales y createElement sin JSX", () => {
    expect(
      audit(["src/pages/Page.tsx"], {
        "src/pages/Page.tsx":
          "function Private(){ return <div/>; } export default function Page(){ return <Private/>; }",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      audit(["src/features/view.ts"], {
        "src/features/view.ts":
          'export const view = React.createElement("div");',
      }).length,
    ).toBeGreaterThan(0);
  });
  it("permite hooks sin UI, imports de tipos y comentarios que mencionan JSX", () => {
    expect(
      audit(["src/pages/Page.tsx"], {
        "src/pages/Page.tsx":
          'import type { Private } from "@/features/private"; import "@/features/hook"; export default function Page(){ return null; }',
        "src/features/hook.ts":
          "// <Private/> no es UI\nexport const useValue = () => 1;",
      }),
    ).toEqual([]);
  });
});
