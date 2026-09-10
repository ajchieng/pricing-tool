export const FEEDBACK_ATTACHMENT_MAX_FILES = 3;
export const FEEDBACK_ATTACHMENT_MAX_BYTES = 2 * 1024 * 1024;
export const FEEDBACK_ATTACHMENT_TOTAL_MAX_BYTES = 6 * 1024 * 1024;
export const FEEDBACK_ATTACHMENT_ACCEPT =
  "image/png,image/jpeg,image/webp,text/plain,text/csv";
export const FEEDBACK_ATTACHMENT_TYPES = new Set(
  FEEDBACK_ATTACHMENT_ACCEPT.split(","),
);

export type FeedbackAttachmentDownloadPolicy =
  | { downloadAllowed: true; blockedReason: null }
  | { downloadAllowed: false; blockedReason: string };

export function feedbackAttachmentDownloadPolicy(
  contentType: string,
): FeedbackAttachmentDownloadPolicy {
  return FEEDBACK_ATTACHMENT_TYPES.has(contentType)
    ? { downloadAllowed: true, blockedReason: null }
    : {
        downloadAllowed: false,
        blockedReason:
          "This legacy file type is retained for the record but blocked by the attachment security policy.",
      };
}

function startsWithBytes(
  data: Uint8Array,
  signature: readonly number[],
): boolean {
  return (
    data.byteLength >= signature.length &&
    signature.every((byte, index) => data[index] === byte)
  );
}

function isUtf8Text(data: Uint8Array): boolean {
  if (data.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(data);
    return true;
  } catch {
    return false;
  }
}

function asciiEquals(data: Uint8Array, offset: number, value: string): boolean {
  if (offset + value.length > data.byteLength) return false;
  for (let index = 0; index < value.length; index++) {
    if (data[offset + index] !== value.charCodeAt(index)) return false;
  }
  return true;
}

export function feedbackAttachmentMatchesContentType(
  contentType: string,
  data: Uint8Array,
): boolean {
  switch (contentType) {
    case "image/png":
      return startsWithBytes(
        data,
        [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
      );
    case "image/jpeg":
      return startsWithBytes(data, [0xff, 0xd8, 0xff]);
    case "image/webp":
      return (
        data.byteLength >= 12 &&
        asciiEquals(data, 0, "RIFF") &&
        asciiEquals(data, 8, "WEBP")
      );
    case "text/plain":
    case "text/csv":
      return isUtf8Text(data);
    default:
      return false;
  }
}
