export const UPLOAD_VISIBILITIES = ["PUBLIC", "PRIVATE"] as const;
export type UploadVisibility = (typeof UPLOAD_VISIBILITIES)[number];

export function isUploadVisibility(value: string): value is UploadVisibility {
  return (UPLOAD_VISIBILITIES as readonly string[]).includes(value);
}

