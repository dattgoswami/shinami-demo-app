/**
 * Copyright 2024 Shinami Corp.
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SuiClient,
  ObjectOwner as SuiObjectOwner,
  SuiObjectResponse,
} from "@mysten/sui.js/client";
import {
  Describe,
  Infer,
  Struct,
  create,
  literal,
  object,
  string,
  type,
  union,
} from "superstruct";

export const ObjectId = object({
  id: string(),
});
export type ObjectId = Infer<typeof ObjectId>;

export const WithTxDigest = type({
  txDigest: string(),
});
export type WithTxDigest = Infer<typeof WithTxDigest>;

export const ObjectOwner: Describe<SuiObjectOwner> = union([
  object({
    AddressOwner: string(),
  }),
  object({
    ObjectOwner: string(),
  }),
  object({
    Shared: object({
      initial_shared_version: string(),
    }),
  }),
  literal("Immutable"),
]);
export type ObjectOwner = SuiObjectOwner;

export const WithOwner = type({
  owner: ObjectOwner,
});
export type WithOwner = Infer<typeof WithOwner>;

export const SendTarget = object({
  recipient: string(),
});
export type SendTarget = Infer<typeof SendTarget>;

export async function* getOwnedObjects(
  sui: SuiClient,
  owner: string,
  type?: string
): AsyncGenerator<SuiObjectResponse> {
  let more = true;
  let cursor: string | null | undefined = undefined;

  while (more) {
    const page = await sui.getOwnedObjects({
      owner,
      cursor,
      filter: type
        ? {
            MatchAll: [{ StructType: type }],
          }
        : undefined,
      options: { showContent: true },
    });

    for (const resp of page.data) {
      yield resp;
    }

    more = page.hasNextPage;
    cursor = page.nextCursor;
  }
}

export function parseObject<T>(obj: SuiObjectResponse, schema: Struct<T>): T {
  const content = obj.data?.content;
  if (content?.dataType !== "moveObject") {
    throw new Error("Response content doesn't contain a move object");
  }
  return create(content.fields, schema);
}

export function parseObjectWithOwner<T>(
  obj: SuiObjectResponse,
  schema: Struct<T>
): T & WithOwner {
  if (!obj.data?.owner) {
    console.error("Response doesn't contain an owner", obj);
    throw new Error("Response doesn't contain an owner");
  }
  return {
    ...parseObject(obj, schema),
    owner: obj.data?.owner,
  };
}

export function ownerAddress(owner: ObjectOwner): string | null {
  if (owner !== "Immutable") {
    if ("AddressOwner" in owner) return owner.AddressOwner;
    if ("ObjectOwner" in owner) return owner.ObjectOwner;
  }
  return null;
}
