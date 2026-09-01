import fs from "fs"

class Parser {
  constructor(p1, p2) {
    this.data = readSvgFile(p1, p2)
  }
  getStyling(nodeId) {
    
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

function svgToPathData(svgText, symbolName = 'svg') {
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
  return svgToPathData(svgText, symbolName);
}

export {
  svgToPathData,
  readSvgFile,
};
