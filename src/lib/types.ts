export type Dict<Value = any> = Record<string, Value>;

export type MaybePromise<T> = T | Promise<T>;

type Merge<A, B> = {
  [K in keyof A]: K extends keyof B ? B[K] : A[K]
} & B

// For describing additive data
export type Final<Initial, Added> = Merge<Initial, Added>;

export type Fragment<Initial, Added> = Partial<Interim<Initial, Added>>

export type Interim<Initial, Added> = Initial | Partial<Added>;
