import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const violations = [];
let collections = 0;
function inspect(file) {
  const text = fs.readFileSync(file, "utf8");
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith("tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const report = (node, message) => violations.push(`${file}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}: ${message}`);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(source) === "DynamicLoadingCollection") {
      collections += 1;
      const attributes = node.attributes.properties;
      const names = attributes.filter(ts.isJsxAttribute).map((item) => item.name.getText(source));
      const lazy = attributes.find((item) => ts.isJsxAttribute(item) && item.name.getText(source) === "lazy");
      if (!lazy || lazy.initializer?.getText(source) === "{false}") report(node, "Enable central lazy rendering for record collections.");
      if (!names.includes("isLoading")) report(node, "Use the real content loading state.");
      if (!names.includes("totalCount") && !names.includes("structure") && !attributes.some(ts.isJsxSpreadAttribute)) report(node, "Supply a structure count or shared collectionProps.");
    }
    if (ts.isCallExpression(node) && ["useStructurePagedCollection", "useAdminPagedCollection"].includes(node.expression.getText(source))) {
      const options = node.arguments[0];
      if (options && ts.isObjectLiteralExpression(options)) {
        const names = options.properties.map((property) => property.name?.getText(source));
        if (!names.includes("totalCount") && !names.includes("structureEndpoint")) report(node, "A paged query requires a structure source before it can fetch records.");
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
}
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) { if (entry.name !== "api") walk(file); }
    else if (/\.tsx?$/.test(file) && !file.endsWith(".stories.tsx")) inspect(file);
  }
}
walk("app");
walk("hooks");
if (violations.length) { console.error(violations.join("\n")); process.exitCode = 1; }
else console.log(`PASS: ${collections} collections use central lazy loading with count sources; paged hooks declare structure inputs.`);
