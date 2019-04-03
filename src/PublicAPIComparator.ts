import { createPatch, Operation } from "rfc6902";
import {
  PublicAPICollection,
  PublicAPICollectionStore
} from "./PublicAPICollectionStore";

export class PublicAPIComparator {
  compare({
    current,
    before
  }: {
    current: PublicAPICollection;
    before: PublicAPICollection;
  }): Operation[] {
    const patch = createPatch(
      PublicAPICollectionStore.toPlain(before),
      PublicAPICollectionStore.toPlain(current)
    );
    return patch;
  }
}
