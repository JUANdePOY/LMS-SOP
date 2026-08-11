const { DomHandler, Parser } = require('htmlparser2');
const { isTag } = require('domelementtype');

function parseHtml(html) {
  const handler = new DomHandler();
  const parser = new Parser(handler, { decodeEntities: false });
  parser.write(html);
  parser.end();
  return handler.dom;
}

function getText(node) {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text' || node.type === 'comment') {
    return node.data || '';
  }
  if (Array.isArray(node.children)) {
    return node.children.map(getText).join('');
  }
  return '';
}

function getAttribute(node, name) {
  return node?.attribs?.[name] || '';
}

function findDescendants(node, tagName) {
  if (!node || !node.children) return [];
  const results = [];
  const stack = [...node.children];
  while (stack.length) {
    const child = stack.pop();
    if (!child) continue;
    if (isTag(child) && child.tagName?.toLowerCase() === tagName.toLowerCase()) {
      results.push(child);
    }
    if (child.children) {
      stack.push(...child.children);
    }
  }
  return results;
}

function findInContext(context, tagName) {
  if (!context) return [];
  const candidates = Array.isArray(context) ? context : [context];
  let results = [];
  for (const node of candidates) {
    if (isTag(node) && node.tagName?.toLowerCase() === tagName.toLowerCase()) {
      results.push(node);
    }
    results = results.concat(findDescendants(node, tagName));
  }
  return results;
}

function splitSelector(selector) {
  return selector.split(',').map(s => s.trim()).filter(Boolean);
}

class Wrapper {
  constructor(elements) {
    this.elements = Array.isArray(elements) ? elements : [elements];
  }

  text() {
    return this.elements.map(getText).join('').trim();
  }

  attr(name) {
    const node = this.elements[0];
    return node ? getAttribute(node, name) : '';
  }

  children() {
    const results = [];
    for (const node of this.elements) {
      if (node?.children) {
        for (const child of node.children) {
          if (isTag(child)) {
            results.push(child);
          }
        }
      }
    }
    return new Wrapper(results);
  }

  contents() {
    const results = [];
    for (const node of this.elements) {
      if (node?.children) {
        results.push(...node.children);
      }
    }
    return new Wrapper(results);
  }

  find(selector) {
    const tags = splitSelector(selector);
    let results = [];
    for (const tag of tags) {
      for (const node of this.elements) {
        results = results.concat(findDescendants(node, tag));
      }
    }
    return new Wrapper(results);
  }

  first() {
    return new Wrapper(this.elements[0] ? [this.elements[0]] : []);
  }

  each(fn) {
    this.elements.forEach((el, i) => fn(i, el));
  }

  toArray() {
    return this.elements;
  }

  get length() {
    return this.elements.length;
  }
}

function createRoot(html) {
  const dom = parseHtml(html);
  const root = dom.length > 0 ? dom[0] : { type: 'tag', tagName: 'div', children: [] };
  const wrapper = new Wrapper([root]);

  const bound$ = (selectorOrElement, context) => {
    if (selectorOrElement == null) {
      return new Wrapper([]);
    }

    if (typeof selectorOrElement === 'string') {
      const roots = context ? (context.elements || [context]) : [root];
      const tags = splitSelector(selectorOrElement);
      let results = [];
      for (const tag of tags) {
        for (const r of roots) {
          results = results.concat(findDescendants(r, tag));
        }
      }
      return new Wrapper(results);
    }

    if (typeof selectorOrElement === 'object' && selectorOrElement.tagName) {
      return new Wrapper([selectorOrElement]);
    }

    return new Wrapper([]);
  };

  bound$.root = () => wrapper;

  return bound$;
}

module.exports = {
  createRoot,
  Wrapper,
  getText,
  getAttribute,
  findDescendants,
  isTag,
};
