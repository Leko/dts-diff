import * as fs from "fs";
import * as path from "path";
import {
  getDefaultLibFilePath,
  LanguageServiceHost as TSLanguageServiceHost,
  Program,
  CompilerOptions
} from "typescript";

export class LanguageServiceHost implements TSLanguageServiceHost {
  compilerOptions: CompilerOptions;
  program: Program;

  constructor({
    compilerOptions,
    program
  }: {
    compilerOptions: CompilerOptions;
    program: Program;
  }) {
    this.compilerOptions = compilerOptions;
    this.program = program;
  }

  getCompilationSettings() {
    return this.compilerOptions;
  }

  getScriptFileNames() {
    return this.program.getRootFileNames() as string[];
  }

  getScriptVersion(filename: string) {
    return filename;
  }

  getScriptSnapshot(filename: string) {
    return {
      getText: () => {
        return fs.readFileSync(filename, "utf8");
      },
      getLength: () => {
        return fs.readFileSync(filename, "utf8").length;
      },
      getChangeRange: () => {
        return undefined;
      }
    };
  }

  getCurrentDirectory() {
    return path.resolve(path.dirname(process.argv[2]));
  }

  getDefaultLibFileName() {
    return getDefaultLibFilePath(this.compilerOptions);
  }

  readFile(path: string) {
    return fs.readFileSync(path, "utf8");
  }
}
