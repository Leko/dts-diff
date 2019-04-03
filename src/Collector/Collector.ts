import * as path from "path";
import * as ts from "typescript";
import { Collector as MSCollector } from "@microsoft/api-extractor/lib/collector/Collector";
import { Extractor } from "@microsoft/api-extractor";
import { getExtractor, customLogger } from "./Extractor";
import { LanguageServiceHost } from "./LanguageServiceHost";
import { Project } from "../Project";
import { PublicAPICollection } from "../PublicAPICollectionStore";
import { stringify } from "./stringify";

function getMSCollector(
  extractor: Extractor,
  { entryPointPath }: { entryPointPath: string }
): MSCollector {
  // @ts-ignore private access
  const actualConfig = extractor._actualConfig;
  // @ts-ignore private access
  const absoluteRootFolder = extractor._absoluteRootFolder;
  // @ts-ignore private access
  const program = extractor._program;
  const entryPointFile = path.resolve(absoluteRootFolder, entryPointPath);

  const collector = new MSCollector({
    program,
    entryPointFile,
    logger: customLogger,
    policies: actualConfig.policies,
    validationRules: actualConfig.validationRules
  });
  return collector;
}

export class Collector {
  getPublicApis(project: Project): PublicAPICollection {
    const extractor = getExtractor({
      cwd: project.directory,
      entryPointPath: project.dtsEntryPath
    });
    // @ts-ignore
    const program: ts.Program = extractor._program;
    const collector = getMSCollector(extractor, {
      entryPointPath: project.dtsEntryPath
    });
    const compilerOptions = project.getTsConfig().compilerOptions;

    collector.analyze();

    const service = ts.createLanguageService(
      new LanguageServiceHost({
        compilerOptions,
        program
      })
    );

    const publicApis: PublicAPICollection = new Map();
    const exportedEntities = Array.from(collector.entities).filter(
      entity => entity.exported
    );
    for (const entity of exportedEntities) {
      const { nameForEmit, astEntity } = entity;
      // @ts-ignore Property 'astDeclarations' does not exist on type 'AstImport'.
      const { astDeclarations } = astEntity;
      if (!nameForEmit || !astDeclarations) {
        continue;
      }

      for (const astDeclaration of astDeclarations) {
        const { declaration } = astDeclaration;
        const sourceFile: ts.SourceFile = declaration.parent;
        const symbol: ts.Symbol = astDeclaration.astSymbol.followedSymbol;

        switch (symbol.flags) {
          case ts.SymbolFlags.Function:
            const {
              typeParameters,
              parameters,
              type
            } = declaration as ts.FunctionDeclaration;

            publicApis.set(nameForEmit, {
              name: nameForEmit,
              symbolFlags: ts.SymbolFlags.Function,
              metadata: {
                returnType: type ? stringify(service, sourceFile, type) : "any",
                parameters: parameters.map(({ type, questionToken }) => ({
                  optional: !!questionToken,
                  signature: type ? stringify(service, sourceFile, type) : "any"
                })),
                typeParameters: typeParameters
                  ? typeParameters.map(typeParameter => ({
                      optional: !!typeParameter.default,
                      signature: type
                        ? typeParameter.getText() // TODO: Hash naming
                        : "any"
                    }))
                  : null
              }
            });
            break;
          case ts.SymbolFlags.TypeAlias:
            // @ts-ignore Property 'locals' does not exist on type 'SourceFile'
            // Omit referenced only type aliases
            // if (sourceFile.locals.get(nameForEmit).exportSymbol.isReferenced)
            //   continue;

            publicApis.set(nameForEmit, {
              name: nameForEmit,
              symbolFlags: ts.SymbolFlags.TypeAlias,
              metadata: stringify(service, sourceFile, declaration.name)
            });
            break;
          case ts.SymbolFlags.BlockScopedVariable:
            console.log("TODO:", nameForEmit, "(BlockScopedVariable) =>");
            break;
          case ts.SymbolFlags.Interface:
            console.log("TODO:", nameForEmit, "(Interface) =>");
            break;
          case ts.SymbolFlags.RegularEnum:
            console.log("TODO:", nameForEmit, "(RegularEnum) =>");
            break;
          default:
            throw new Error(
              `Not supported: ${symbol.flags} (${ts.SymbolFlags[symbol.flags]})`
            );
        }
      }
    }

    return publicApis;
  }
}
