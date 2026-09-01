import fs from "fs"

class Parser {
  constructor(p1, p2) {
    this.data = readSvgFile(p1, p2)
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
      styling += `${key}: ${n.style[key]};`
    }
    return styling
  }
  getNode(id) {
    if (typeof(id) !== "string") throw new Error(`${nodeId} is not a string`)
    const { svg } = this.data
    if (!svg[id]) throw new Error(`Failed to find node with id ${id}`)
    return svg[id]
  }
}

function parseAttributes(tag) {
  const attributes = {};
  const regex = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match;

  while ((match = regex.exec(tag))) {
    const [, key, doubleQuoted, singleQuoted, bare] = match;
    attributes[key] = doubleQuoted ?? singleQuoted ?? bare ?? '';
  }

  return attributes;
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

function getSvgData(svgText, symbolName = 'svg') {
  const pathPattern = /<path\b[^>]*>/gi;
  const paths = {};
  let pathIndex = 0;
  let match;

  while ((match = pathPattern.exec(svgText))) {
    const tag = match[0];
    const attributes = parseAttributes(tag);
    const id = attributes.id || `path${pathIndex + 1}`;
    const d = attributes.d;

    if (!d) {
      pathIndex += 1;
      continue;
    }

    const style = parseStyleString(attributes.style);
    
    const nodeAttributes = {};
    
    Object.keys(attributes).forEach(key => {
      if (['id', 'style'].includes(key)) return;
      nodeAttributes[key] = attributes[key];
    });
    
    nodeAttributes.style = style;
    
    paths[id] = nodeAttributes;

    pathIndex += 1;
  }

  return {
    [symbolName]: paths,
  };
}

function readSvgFile(filePath, symbolName = 'svg') {
  const svgText = fs.readFileSync(filePath, 'utf8');
  return getSvgData(svgText, symbolName);
}

export default Parser
