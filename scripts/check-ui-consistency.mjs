// Enforce the shared UI boundary without depending on formatting or grep patterns.
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const failures = [];
let scanned = 0;
const fieldOwners = new Map([
  ["input", new Set(["input.tsx", "range.tsx", "file-upload.tsx"])],
  ["textarea", new Set(["input.tsx"])],
  ["select", new Set(["select.tsx"])],
  ["button", new Set(["action.tsx"])],
]);

function check(file) {
  scanned += 1;
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const designSystem = file.replaceAll("\\", "/").startsWith("app/design-system/");
  const fail = (node, message) => {
    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    failures.push(`${file}:${line}: ${message}`);
  };
  function visit(node) {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(source);
      const cardFamily = node.attributes.properties.some((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "data-card-family");
      if (cardFamily) {
        const classes = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "className");
        if (!classes?.getText(source).includes("collectionCardClasses(")) fail(node, "Repeated card geometry belongs to collection-card.variant.ts.");
      }
      if (fieldOwners.has(tag) && (!designSystem || !fieldOwners.get(tag).has(path.basename(file)))) {
        fail(node, `Native ${tag} belongs to its shared design-system primitive.`);
      }
      if (/^h[1-6]$/.test(tag) || tag === "p" || tag === "img") {
        fail(node, "Use AppHeading, div/span, or AppImage.");
      }
      if (!designSystem && tag === "CustomButton") {
        const variant = node.attributes.properties.find((attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText() === "variant");
        const expression = variant?.initializer && ts.isJsxExpression(variant.initializer) ? variant.initializer.expression : null;
        if (expression && ts.isConditionalExpression(expression)
          && ts.isStringLiteral(expression.whenTrue) && expression.whenTrue.text === "primary"
          && ts.isStringLiteral(expression.whenFalse) && expression.whenFalse.text === "neutral") {
          fail(node, "Selection state belongs to CustomTabs or CustomSelectionButton, not local button variants.");
        }
      }
      if (tag === "AppHeading") {
        for (let parent = node.parent; parent; parent = parent.parent) {
          if (!ts.isJsxElement(parent)) continue;
          const parentTag = parent.openingElement.tagName.getText(source);
          if (["button", "a", "Link", "CustomButton", "CustomActionButton", "CustomSelectionButton"].includes(parentTag)) {
            fail(node, "Headings must be siblings of interactive controls.");
            break;
          }
        }
      }
    }
    if (ts.isImportDeclaration(node) && designSystem && /["']@\/app\/(panel|products|cart)\//.test(node.moduleSpecifier.getText())) {
      fail(node, "The design system must not import feature UI.");
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}

function scan(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = `${directory}/${entry.name}`;
    if (entry.isDirectory()) scan(file);
    else if (file.endsWith(".tsx")) check(file);
  }
}
scan("app");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${scanned} UI files use shared controls, selection state, and semantic text primitives.`);
}
