/**
 * strip XML prefix from string
 * @param {string} str
 */
export function stripPrefix(str) {
  const prefixMatch = new RegExp(/(?!xmlns)^.*:/);
  return str.replace(prefixMatch, '');
}
