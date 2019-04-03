import fs from "fs";
import path from "path";
import debug from "debug";
import yargs, { Argv, Arguments } from "yargs";
import { sync as findUp } from "find-up";
import normalize, { Package } from "normalize-package-data";
import * as pkg from "../../package.json";
import { generate } from "../commands/generate";
import { semver } from "../commands/semver";
import { summary } from "../commands/summary";
import { Project } from "../Project";
import { PublicAPICollectionStore } from "../PublicAPICollectionStore";
import { fsImpl } from "./fsImpl";

type CLIOption<SubCommandSpecifyOption extends object = {}> = {
  tsconfig: string;
  dts?: string;
  from?: string;
} & SubCommandSpecifyOption;

const logDebug = debug("dts-diff:cli:debug");

function getUserPackageJSONPath(cwd: string): string | null {
  const packageJsonPath = findUp("package.json", { cwd });
  if (!packageJsonPath) {
    return null;
  }

  return packageJsonPath;
}

function getUserPackageJSON(cwd: string): Package | null {
  const packageJsonPath = getUserPackageJSONPath(cwd);
  if (!packageJsonPath) {
    return null;
  }
  const userPackageJson = require(packageJsonPath);
  normalize(userPackageJson);
  return userPackageJson;
}

function tryResolveDTSEntry(cwd: string): string | null {
  const userPackageJsonPath = getUserPackageJSONPath(cwd);
  if (!userPackageJsonPath) {
    return null;
  }
  const userPackageJson = getUserPackageJSON(userPackageJsonPath);
  if (!userPackageJson) {
    return null;
  }

  const { typings, main } = userPackageJson;
  if (typings) {
    const typingsPath = path.join(userPackageJsonPath, typings);
    if (fs.existsSync(typingsPath)) {
      return typingsPath;
    } else {
      console.warn(
        "Warning: The typings field specified but the file does not exist.",
        "\n" +
          JSON.stringify(
            {
              userPackageJsonPath,
              typingsPath
            },
            null,
            2
          )
      );
    }
  }

  if (main) {
    const mainPath = path
      .join(userPackageJsonPath, main)
      .replace(".ts", ".d.ts");
    if (fs.existsSync(mainPath)) {
      return mainPath;
    }
  }

  return null;
}

const wrapArguments = (cwd: string, subYargs: typeof yargs) => {
  const dtsEntry = tryResolveDTSEntry(cwd);
  return subYargs
    .positional("dts", {
      type: "string",
      description: "Path to entry point of .d.ts",
      default: dtsEntry ? path.relative(cwd, dtsEntry) : null
    })
    .positional("from", {
      type: "string",
      description: "Path to api.json that previously published"
    });
};

function getOutFilePath(cwd: string, ns: string): string {
  const userPackageJson = getUserPackageJSON(cwd);
  if (!userPackageJson) {
    throw new Error("package.json does not exist");
  }
  const { name: packageName, version } = userPackageJson;
  const escapedName = packageName.replace("@", "").replace("/", "__");
  return path.join(cwd, `.${ns}`, `${escapedName}-${version}.json`);
}

function getProjectFromCLI(args: Arguments<CLIOption>): Project {
  if (!args.dts) {
    throw new Error("Entry point of .d.ts must be required");
  }
  return new Project({
    directory: path.dirname(args.tsconfig),
    tsConfigPath: args.tsconfig,
    dtsEntryPath: args.dts
  });
}

export const getOptions = (cwd: string) => {
  normalize(pkg);
  const { name, homepage } = (pkg as unknown) as Package;
  const tsConfigPath = findUp("tsconfig.json", { cwd });
  const outFilePath = getOutFilePath(cwd, name);
  const options = yargs
    .scriptName(name)
    .options({
      tsconfig: {
        type: "string",
        alias: "c",
        description: "Path to tsconfig.json",
        default: tsConfigPath ? path.relative(cwd, tsConfigPath) : null
      },
      out: {
        required: false,
        alias: "o",
        type: "string",
        description: "Path to current api stat file",
        default: path.relative(cwd, outFilePath)
      }
    })
    .command(
      "generate [dts]",
      "Generate your first api.json",
      // @ts-ignore
      (subYargs: Argv<CLIOption<{ "out-file": string }>>) =>
        wrapArguments(cwd, subYargs).options({
          "out-file": {
            required: false,
            alias: "o",
            type: "string",
            description: "Path to current api stat file",
            default: path.relative(cwd, outFilePath)
          }
        }),
      (options: Arguments<CLIOption<{ "out-file": string }>>) => {
        logDebug("Subcommand: generate", options);
        const project = getProjectFromCLI(options);
        return generate(project, {
          outFilePath: options["out-file"],
          store: new PublicAPICollectionStore(fsImpl)
        });
      }
    )
    .command(
      "semver <from> [dts]",
      "Output semver type according to dts changes",
      (subYargs: Argv<CLIOption<{}>>) =>
        wrapArguments(cwd, subYargs).example(
          "npm version $($0 semver)",
          "Bump version according to dts changes"
        ),
      (options: Arguments<CLIOption<{}>>) => {
        logDebug("Subcommand: semver", options);
        const project = getProjectFromCLI(options);
        return semver(project);
      }
    )
    .command(
      "summary <from> [dts]",
      "Output summary of dts changes",
      (subYargs: Argv<CLIOption<{}>>) =>
        wrapArguments(cwd, subYargs).option("json", {
          type: "boolean",
          default: false
        }),
      (options: Arguments<CLIOption<{}>>) => {
        logDebug("Subcommand: summary", options);
        const project = getProjectFromCLI(options);
        if (!options.from) {
          throw new Error("The argument `from` must be required");
        }

        return summary(project, {
          store: new PublicAPICollectionStore(fsImpl),
          fromPath: options.from
        });
      }
    )
    .command(
      "$0",
      false,
      (subYargs: Argv<CLIOption>) => subYargs,
      () => {
        options.showHelp();
        console.error("\nNo subcommand specified");
        process.exit(1);
      }
    )
    .wrap(yargs.terminalWidth())
    .epilogue(`For more information, find our manual at ${homepage}`)
    .help();

  return options;
};
