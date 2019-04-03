import * as ts from "typescript";

export interface FSImpl {
  writeFile: (path: string, content: string) => Promise<void>;
  readFile: (path: string) => Promise<string>;
}

type TypeSignature = string;

type PublicAPIArgument = {
  optional: boolean;
  signature: TypeSignature;
};

type PublicAPI =
  | {
      name: string;
      symbolFlags: ts.SymbolFlags.Function;
      metadata: {
        typeParameters: PublicAPIArgument[] | null;
        parameters: PublicAPIArgument[];
        returnType: TypeSignature;
      };
    }
  | {
      name: string;
      symbolFlags: ts.SymbolFlags.TypeAlias;
      metadata: TypeSignature;
    };

export type PlainPublicAPICollection = {
  [name: string]: PublicAPI;
};

export type PublicAPICollection = Map<string, PublicAPI>;

export class PublicAPICollectionStore {
  fsImpl: FSImpl;

  constructor(fsImpl: FSImpl) {
    this.fsImpl = fsImpl;
  }

  async save(
    filePath: string,
    publicApiCollection: PublicAPICollection
  ): Promise<void> {
    const plain = PublicAPICollectionStore.toPlain(publicApiCollection);
    await this.fsImpl.writeFile(filePath, JSON.stringify(plain));
  }

  async load(filePath: string): Promise<PublicAPICollection> {
    const content = await this.fsImpl.readFile(filePath);
    return PublicAPICollectionStore.fromPlain(JSON.parse(content));
  }

  static toPlain(collection: PublicAPICollection): PlainPublicAPICollection {
    const plain: PlainPublicAPICollection = {};
    for (let [name, publicApi] of collection.entries()) {
      plain[name] = publicApi;
    }
    return plain;
  }

  static fromPlain(collection: PlainPublicAPICollection): PublicAPICollection {
    return new Map<string, PublicAPI>(Object.entries(collection));
  }
}
