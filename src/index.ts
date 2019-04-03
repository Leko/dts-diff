const privateConst = 1;

function hoge() {
  return privateConst;
}

export const hogehoge = (name: string) => {
  return name + hoge();
};

export function foobar(fff: number, ababa: Partial<typeof hogehoge>) {
  if (Math.random()) {
    return null;
  } else if (fff % 2 === 0) {
    return fff;
  } else {
    return ababa;
  }
}

export const SOME_CONST = 123;

export type Hoge = 1 | 2 | 3;
