import * as path from "path";
import debug from "debug";
import {
  ExtractorValidationRulePolicy,
  Extractor,
  IExtractorConfig,
  ILogger
} from "@microsoft/api-extractor";

const logVerbose = debug("dts-diff:api-extractor:verbose");
const logInfo = debug("dts-diff:api-extractor:info");
const logWarning = debug("dts-diff:api-extractor:warning");
const logError = debug("dts-diff:api-extractor:error");

export const customLogger: ILogger = {
  logVerbose,
  logInfo,
  logWarning,
  logError
};

export function getExtractor({
  cwd,
  entryPointPath
}: {
  cwd: string;
  entryPointPath: string;
}): Extractor {
  const config: IExtractorConfig = {
    compiler: {
      configType: "tsconfig",
      rootFolder: cwd
    },
    project: {
      entryPointSourceFile: path.relative(cwd, entryPointPath)
    },
    validationRules: {
      missingReleaseTags: ExtractorValidationRulePolicy.allow
    },
    apiReviewFile: {
      enabled: false
    },
    apiJsonFile: {
      enabled: false
    },
    dtsRollup: {
      enabled: false
    }
  };

  return new Extractor(config, { customLogger });
}
