import * as fs from "fs";
import * as ts from "typescript";

type ProjectConfig = {
  directory: string;
  tsConfigPath: string;
  dtsEntryPath: string;
};

export class Project {
  readonly directory: string;
  readonly tsConfigPath: string;
  readonly dtsEntryPath: string;

  constructor(config: ProjectConfig) {
    this.directory = config.directory;
    this.tsConfigPath = config.tsConfigPath;
    this.dtsEntryPath = config.dtsEntryPath;
  }

  getTsConfig() {
    const tsConfig = ts.readJsonConfigFile(this.tsConfigPath, p =>
      fs.readFileSync(p, "utf8")
    );
    return ts.convertToObject(tsConfig, []);
  }
}
