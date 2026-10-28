/** Visit actual HTML tags for URL rewriting; preserve comments, CDATA and raw text. */
function transform(source, tag) {
  const tokens = /<!--[\s\S]*?(?:-->|$)|<!\[CDATA\[[\s\S]*?(?:\]\]>|$)|<\/?[a-z][a-z0-9:-]*(?:"[^"]*"|'[^']*'|[^'">])*>|<![^>]*>|<\?[^>]*\?>/gi;
  let result = '';
  let end = 0;
  let match;
  while ((match = tokens.exec(source))) {
    result += source.slice(end, match.index);
    const token = match[0];
    result += /^<\/?[a-z]/i.test(token) ? tag(token) : token;
    end = match.index + token.length;
    const name = token.match(/^<([a-z][a-z0-9:-]*)\b/i)?.[1].toLowerCase();
    // These bodies are text, including strings that happen to look like markup.
    if (name === 'plaintext') {
      result += source.slice(end);
      return result;
    }
    // noscript contains real fallback markup when scripting is disabled.
    if (name && /^(script|style|textarea|title|xmp|iframe|noembed|noframes)$/.test(name)) {
      const close = new RegExp(`</${name}(?=[\\s/>])`, 'gi');
      close.lastIndex = end;
      const closing = close.exec(source);
      const next = closing ? closing.index : source.length;
      result += source.slice(end, next);
      end = next;
      tokens.lastIndex = end;
    }
  }
  return result + source.slice(end);
}

/** Resolve href/src/srcset on elements; preserve spelling, quotes and descriptors. */
export function rewriteUrlAttributes(source, resolve) {
  const candidates = (value) => {
    const found = [];
    let rest = value;
    while ((rest = rest.replace(/^[\s,]+/, ''))) {
      const url = rest.match(/^\S+/)[0];
      rest = rest.slice(url.length);
      if (url.endsWith(',')) {
        found.push(resolve(url.replace(/,+$/, '')));
      } else {
        const descriptor = rest.match(/^[^,]*/)[0];
        rest = rest.slice(descriptor.length);
        found.push(resolve(url) + descriptor.trimEnd());
      }
    }
    return found.join(', ');
  };
  return transform(source, (tag) => tag.replace(
    /(\s)([^\s"'<>/=]+)(\s*=\s*)(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+))/g,
    (attribute, space, name, equals, double, single, unquoted) => {
      if (!/^(href|src|srcset)$/i.test(name)) return attribute;
      const value = double ?? single ?? unquoted;
      const quote = single !== undefined ? "'" : '"';
      return `${space}${name}${equals}${quote}${name.toLowerCase() === 'srcset' ? candidates(value) : resolve(value)}${quote}`;
    },
  ));
}
