// idea lifted from https://stackoverflow.com/a/53373813/179962

export interface FlatPromise<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (err: Error) => void;
}

export const createFlatPromise = <RETURN_TYPE>(): FlatPromise<RETURN_TYPE> => {
  let resolve!: (value: RETURN_TYPE) => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<RETURN_TYPE>((res, rej) => {
    // reassign scoped functions to the promise functions
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};
