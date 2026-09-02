import fs from "fs"

class Parser {
  constructor(filePath, config, symbolName) {
    this.data = readSvgFile(filePath, config, symbolName, )
  }
  style(nodeId, obj) {
    const n = this.getNode(nodeId)
    if (!n.style) throw new Error(`Failed to get styling for node with id ${id}. No style attribute present`)
    if (obj && typeof(obj) === "object") {
      for (let key in obj) {
        this.data.svg[nodeId].style[key] = obj[key]
      }
    }
    let styling = ""
    for (let key in n.style) {
      styling += `${key}:${n.style[key]};`
    }
    return styling
  }
  attributes(nodeId, obj) {
    const attrs = this.getNode(nodeId)
    if (obj && typeof(obj) === "object") {
      for (let key in obj) {
        const v = obj[key]
        if (v === null) delete this.data.svg[nodeId][key]
        else this.data.svg[nodeId][key] = v
      }
    }
    return attrs
  }
  getNode(id) {
    if (typeof(id) !== "string") throw new Error(`${nodeId} is not a string`)
    const { svg } = this.data
    if (!svg[id]) throw new Error(`Failed to find node with id ${id}`)
    return svg[id]
  }
  forEachNode(f) {
    this.#loopNodes(d => {
      const { tagName } = d
      const clone = structuredClone(d)
      delete clone.tagName
      delete clone.children
      clone.style = this.style(d.id)
      f({tagName, attrs: clone})
    })
  }
  loopChildren(nodeId, f) {
    const n = this.getNode(nodeId)
    if (typeof(f) !== "function") return console.warn("child loop falied: " + f + " is not a function")
    const { children } = n
    for (let key in children) {
      f(children[key])
    }
    return this
  }
  #loopNodes(f) {
    if (typeof(f) !== "function") throw new Error(`Internal error looping through nodes: ${f} isn't a function`)
    const { svg } = this.data
    for (let key in svg) {
      const value = svg[key]
      f(value)
    }
  }
}

function parseAttributes({tag, tagName}, {onNodeParse, onAttrParse}) {
  const attrs = {};
  const regex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  onAttrParse = typeof(onAttrParse) === "function" ? onAttrParse : undefined

  while ((match = regex.exec(tag))) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    const cusSet = onAttrParse ? onAttrParse({ tagName, attrs: key }) : undefined
    attrs[key] = cusSet ?? doubleQuoted ?? singleQuoted ?? bare ?? '';
  }

  if (typeof(onNodeParse) === "function") onNodeParse({attrs, tagName})

  return attrs;
}

function parseStyleString(styleText = '') {
  const style = {};

  if (!styleText) {
    return style;
  }

  const regex = /([^:;]+)\s*:\s*([^;]+)/g;
  let match;

  while ((match = regex.exec(styleText))) {
    const [, key, value] = match;
    style[key.trim()] = value.trim();
  }

  return style;
}

function getSvgData(svgText, config, symbolName = 'svg') {
  const elementPattern = /<\/?[\w-]+\b[^>]*>/gi;
  const nodes = {};
  let elementIndex = 0;
  let match;
  const svgElementTypes = ['path', 'g', 'rect', 'circle', 'ellipse', 'text', 'line', 'polygon', 'polyline', 'tspan', 'image', 'foreignobject', 'use', 'symbol', 'marker', 'lineargradient', 'radialgradient', 'stop', 'defs', 'style', 'title', 'desc', 'svg'];
  
  const { onAttrParse, onNodeParse } = config
  
  const stack = []; // Stack to track currently open elements

  while ((match = elementPattern.exec(svgText))) {
    const tag = match[0];
    
    // Check if it's a closing tag
    if (tag.startsWith('</')) {
      const tagName = tag.slice(2, -1).toLowerCase();
      // Pop from stack if it matches
      if (stack.length > 0 && stack[stack.length - 1].tagName === tagName) {
        stack.pop();
      }
      continue;
    }
    
    // Parse opening tag
    const tagNameMatch = tag.match(/<([\w-]+)\b/i);
    if (!tagNameMatch) continue;
    
    const tagName = tagNameMatch[1].toLowerCase();
    
    // Only process SVG-related elements
    if (!svgElementTypes.includes(tagName)) {
      continue;
    }

    const attributes = parseAttributes({tag, tagName}, {onAttrParse, onNodeParse});
    const id = attributes.id || `${tagName}${elementIndex + 1}`;

    const style = parseStyleString(attributes.style);
    
    const nodeAttributes = {
      tagName: tagName,
      id: id,
    };
    
    Object.keys(attributes).forEach(key => {
      if (['id', 'style'].includes(key)) return;
      nodeAttributes[key] = attributes[key];
    });
    
    nodeAttributes.style = style;
    
    // Add to flat structure
    nodes[id] = nodeAttributes;
    
    // Add this node as a child to the current parent (if one exists)
    if (stack.length > 0) {
      const currentParent = stack[stack.length - 1].nodeRef;
      if (!currentParent.children) {
        currentParent.children = {};
      }
      currentParent.children[id] = nodeAttributes;
    }
    
    // Check if tag is self-closing
    const isSelfClosing = tag.endsWith('/>') || ['circle', 'ellipse', 'rect', 'line', 'image', 'use', 'stop'].includes(tagName);
    
    if (!isSelfClosing) {
      stack.push({ tagName: tagName, id: id, nodeRef: nodeAttributes });
    }

    elementIndex += 1;
  }

  return {
    [symbolName]: nodes,
  };
}

function readSvgFile(filePath, symbolName = 'svg') {
  const svgText = fs.readFileSync(filePath, 'utf8');
  return getSvgData(svgText, symbolName);
}

export default Parser
