import sanitizeHtml from "sanitize-html";

export function sanitizePostHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "u",
      "s",
      "h2",
      "h3",
      "ul",
      "ol",
      "li",
      "blockquote",
      "cite",
      "a",
      "img",
      "code",
      "pre",
    ],
    allowedAttributes: {
      a: ["href", "title", "target", "rel"],
      img: ["src", "alt", "title", "width", "height"],
      "*": [],
    },
    allowedSchemes: ["http", "https", "data"],
    allowedSchemesAppliedToAttributes: ["href", "src"],
    allowProtocolRelative: true,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }),
    },
  });
}

