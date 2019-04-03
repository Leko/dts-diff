import * as ts from "typescript";

export function stringify(
  service: ts.LanguageService,
  sourceFile: ts.SourceFile,
  node: ts.Node
): string {
  const typeParameterRenames: string[] = [];
  const quickInfo = service.getQuickInfoAtPosition(
    // @ts-ignore Property 'resolvedPath' does not exist on type 'SourceFile'
    sourceFile.resolvedPath,
    node.pos + 1
  );
  if (!quickInfo) {
    if (ts.isToken(node)) {
      return (node as ts.Token<any>).getText();
    }
    console.error(node);
    throw new Error("Unsupported Node");
  }

  const { displayParts } = quickInfo;
  const parts = [];
  let cursor = 0;
  while (cursor < (displayParts || []).length) {
    const part = displayParts![cursor];

    if (part.kind === "typeParameterName") {
      if (!typeParameterRenames.includes(part.text)) {
        typeParameterRenames.push(part.text);
      }
      const offset = typeParameterRenames.indexOf(part.text);
      part.text = String.fromCharCode("A".charCodeAt(0) + offset);
    }

    if (part.kind === "keyword" && part.text === "type") {
      cursor += 2; // ["type", space]

      if (
        displayParts![cursor] &&
        displayParts![cursor].kind === "aliasName" &&
        displayParts![cursor + 2] &&
        displayParts![cursor + 2].text === "="
      ) {
        cursor += 4; // [aliasName, space, '=', space]
      }
      continue;
    }
    if (part.kind === "parameterName") {
      cursor++;
      if (displayParts![cursor].text === "?") {
        cursor++;
      }
      if (displayParts![cursor].text === ":") {
        cursor++;
      }
      if (displayParts![cursor].kind === "space") {
        cursor++;
      }
      continue;
    }
    if (
      part.kind === "punctuation" &&
      displayParts![cursor + 1] &&
      displayParts![cursor + 1].kind === "text"
    ) {
      cursor += 4; // ["(", text, ")", space]
      continue;
    }

    parts.push(part);
    cursor++;
  }
  return parts.map(({ text }) => text).join("");
}
