import { InvalidSlugError } from "./errors";

export type Slug = string & { readonly __brand: "Posts.Slug" };

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function parseSlug(input: string): Slug {
  const normalized = normalizeSlug(input);
  if (!normalized || !SLUG_RE.test(normalized)) throw new InvalidSlugError("Invalid slug");
  return normalized as Slug;
}
