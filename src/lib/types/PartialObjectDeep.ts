/* eslint-disable @typescript-eslint/ban-types */

import type { PartialDeep } from 'type-fest';

export type PartialObjectDeep<ObjectType extends object> = {
  [KeyType in keyof ObjectType]?: PartialDeep<ObjectType[KeyType]>
};
