import { Project } from "../Project";
import { Collector } from "../Collector/Collector";
import { PublicAPICollectionStore } from "../PublicAPICollectionStore";

type Config = {
  outFilePath: string;
  store: PublicAPICollectionStore;
};

export async function generate(
  project: Project,
  { outFilePath, store }: Config
): Promise<void> {
  const collector = new Collector();
  const publicApis = collector.getPublicApis(project);
  await store.save(outFilePath, publicApis);
}
