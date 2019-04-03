// @ts-ignore
import sortBy from "lodash/sortBy";
// @ts-ignore
import pointer from "json-pointer";
import { Project } from "../Project";
import { Collector } from "../Collector/Collector";
import { PublicAPICollectionStore } from "../PublicAPICollectionStore";
import { PublicAPIComparator } from "../PublicAPIComparator";
import { Operation } from "rfc6902";

type Config = {
  store: PublicAPICollectionStore;
  fromPath: string;
};

export async function summary(
  project: Project,
  { store, fromPath }: Config
): Promise<void> {
  const comparator = new PublicAPIComparator();
  const collector = new Collector();
  const publicApis = collector.getPublicApis(project);
  const beforePublicApis = await store.load(fromPath);
  const diff: { op: string; path: string }[] = comparator.compare({
    current: publicApis,
    before: beforePublicApis
  });

  const displayOrder = ["remove", "replace", "move", "add", "copy", "test"];
  const plainBeforePublicApis = PublicAPICollectionStore.toPlain(
    beforePublicApis
  );
  const sorted = sortBy(
    diff,
    ({ op, path }: Operation) =>
      `${displayOrder.indexOf(op)}_${pointer.get(plainBeforePublicApis, path)}`
  );
  sorted.map(({ op, path }: Operation) => {
    switch (op) {
      case "remove":
        console.log(`* removed: ${path}`);
        break;
      case "replace":
        console.log(`* replaced: ${path}`);
        break;
      case "add":
        console.log(`* added: ${path}`);
        break;
      case "move":
        console.log(`* moved: ${path}`);
        break;
      case "copy":
        console.log(`* copied: ${path}`);
        break;
      case "test":
        console.log(`* tested: ${path}`);
        break;
      default:
        throw new Error(`Unknown operation: ${op}`);
    }
  });
}
