import fs from "fs";
import path from "path";
import mkdirp from "mkdirp";
import { FSImpl } from "../PublicAPICollectionStore";

export const fsImpl: FSImpl = {
  async writeFile(filePath: string, content: string) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      mkdirp.sync(dir);
    }
    fs.writeFileSync(filePath, content, "utf8");
  },
  async readFile(filePath: string) {
    return fs.readFileSync(filePath, "utf8");
  }
};
