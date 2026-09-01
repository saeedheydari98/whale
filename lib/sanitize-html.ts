import sanitizeHtmlLib from "sanitize-html";

const ENCODE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#x27;",
};

export function encodeText(value: string) {
  return value.replace(/[&<>"']/g, (char) => ENCODE[char] ?? char);
}

export function sanitizeHtml(value: string) {
  return sanitizeHtmlLib(value, {
    allowedTags: ["b", "i", "em", "strong", "br", "ul", "ol", "li", "span", "div"],
    allowedAttributes: {},
  });
}
