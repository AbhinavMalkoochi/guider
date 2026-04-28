"use client";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// node_modules/html-to-image/es/util.js
function resolveUrl(url, baseUrl) {
  if (url.match(/^[a-z]+:\/\//i)) {
    return url;
  }
  if (url.match(/^\/\//)) {
    return window.location.protocol + url;
  }
  if (url.match(/^[a-z]+:/i)) {
    return url;
  }
  const doc = document.implementation.createHTMLDocument();
  const base = doc.createElement("base");
  const a = doc.createElement("a");
  doc.head.appendChild(base);
  doc.body.appendChild(a);
  if (baseUrl) {
    base.href = baseUrl;
  }
  a.href = url;
  return a.href;
}
function toArray(arrayLike) {
  const arr = [];
  for (let i = 0, l = arrayLike.length; i < l; i++) {
    arr.push(arrayLike[i]);
  }
  return arr;
}
function getStyleProperties(options = {}) {
  if (styleProps) {
    return styleProps;
  }
  if (options.includeStyleProperties) {
    styleProps = options.includeStyleProperties;
    return styleProps;
  }
  styleProps = toArray(window.getComputedStyle(document.documentElement));
  return styleProps;
}
function px(node, styleProperty) {
  const win = node.ownerDocument.defaultView || window;
  const val = win.getComputedStyle(node).getPropertyValue(styleProperty);
  return val ? parseFloat(val.replace("px", "")) : 0;
}
function getNodeWidth(node) {
  const leftBorder = px(node, "border-left-width");
  const rightBorder = px(node, "border-right-width");
  return node.clientWidth + leftBorder + rightBorder;
}
function getNodeHeight(node) {
  const topBorder = px(node, "border-top-width");
  const bottomBorder = px(node, "border-bottom-width");
  return node.clientHeight + topBorder + bottomBorder;
}
function getImageSize(targetNode, options = {}) {
  const width = options.width || getNodeWidth(targetNode);
  const height = options.height || getNodeHeight(targetNode);
  return { width, height };
}
function getPixelRatio() {
  let ratio;
  let FINAL_PROCESS;
  try {
    FINAL_PROCESS = process;
  } catch (e) {
  }
  const val = FINAL_PROCESS && FINAL_PROCESS.env ? FINAL_PROCESS.env.devicePixelRatio : null;
  if (val) {
    ratio = parseInt(val, 10);
    if (Number.isNaN(ratio)) {
      ratio = 1;
    }
  }
  return ratio || window.devicePixelRatio || 1;
}
function checkCanvasDimensions(canvas) {
  if (canvas.width > canvasDimensionLimit || canvas.height > canvasDimensionLimit) {
    if (canvas.width > canvasDimensionLimit && canvas.height > canvasDimensionLimit) {
      if (canvas.width > canvas.height) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    } else if (canvas.width > canvasDimensionLimit) {
      canvas.height *= canvasDimensionLimit / canvas.width;
      canvas.width = canvasDimensionLimit;
    } else {
      canvas.width *= canvasDimensionLimit / canvas.height;
      canvas.height = canvasDimensionLimit;
    }
  }
}
function canvasToBlob(canvas, options = {}) {
  if (canvas.toBlob) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, options.type ? options.type : "image/png", options.quality ? options.quality : 1);
    });
  }
  return new Promise((resolve) => {
    const binaryString = window.atob(canvas.toDataURL(options.type ? options.type : void 0, options.quality ? options.quality : void 0).split(",")[1]);
    const len = binaryString.length;
    const binaryArray = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      binaryArray[i] = binaryString.charCodeAt(i);
    }
    resolve(new Blob([binaryArray], {
      type: options.type ? options.type : "image/png"
    }));
  });
}
function createImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      img.decode().then(() => {
        requestAnimationFrame(() => resolve(img));
      });
    };
    img.onerror = reject;
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    img.src = url;
  });
}
async function svgToDataURL(svg) {
  return Promise.resolve().then(() => new XMLSerializer().serializeToString(svg)).then(encodeURIComponent).then((html) => `data:image/svg+xml;charset=utf-8,${html}`);
}
async function nodeToDataURL(node, width, height) {
  const xmlns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(xmlns, "svg");
  const foreignObject = document.createElementNS(xmlns, "foreignObject");
  svg.setAttribute("width", `${width}`);
  svg.setAttribute("height", `${height}`);
  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  foreignObject.setAttribute("width", "100%");
  foreignObject.setAttribute("height", "100%");
  foreignObject.setAttribute("x", "0");
  foreignObject.setAttribute("y", "0");
  foreignObject.setAttribute("externalResourcesRequired", "true");
  svg.appendChild(foreignObject);
  foreignObject.appendChild(node);
  return svgToDataURL(svg);
}
var uuid, styleProps, canvasDimensionLimit, isInstanceOfElement;
var init_util = __esm({
  "node_modules/html-to-image/es/util.js"() {
    uuid = /* @__PURE__ */ (() => {
      let counter = 0;
      const random = () => (
        // eslint-disable-next-line no-bitwise
        `0000${(Math.random() * 36 ** 4 << 0).toString(36)}`.slice(-4)
      );
      return () => {
        counter += 1;
        return `u${random()}${counter}`;
      };
    })();
    styleProps = null;
    canvasDimensionLimit = 16384;
    isInstanceOfElement = (node, instance) => {
      if (node instanceof instance)
        return true;
      const nodePrototype = Object.getPrototypeOf(node);
      if (nodePrototype === null)
        return false;
      return nodePrototype.constructor.name === instance.name || isInstanceOfElement(nodePrototype, instance);
    };
  }
});

// node_modules/html-to-image/es/clone-pseudos.js
function formatCSSText(style) {
  const content = style.getPropertyValue("content");
  return `${style.cssText} content: '${content.replace(/'|"/g, "")}';`;
}
function formatCSSProperties(style, options) {
  return getStyleProperties(options).map((name) => {
    const value = style.getPropertyValue(name);
    const priority = style.getPropertyPriority(name);
    return `${name}: ${value}${priority ? " !important" : ""};`;
  }).join(" ");
}
function getPseudoElementStyle(className, pseudo, style, options) {
  const selector = `.${className}:${pseudo}`;
  const cssText = style.cssText ? formatCSSText(style) : formatCSSProperties(style, options);
  return document.createTextNode(`${selector}{${cssText}}`);
}
function clonePseudoElement(nativeNode, clonedNode, pseudo, options) {
  const style = window.getComputedStyle(nativeNode, pseudo);
  const content = style.getPropertyValue("content");
  if (content === "" || content === "none") {
    return;
  }
  const className = uuid();
  try {
    clonedNode.className = `${clonedNode.className} ${className}`;
  } catch (err) {
    return;
  }
  const styleElement = document.createElement("style");
  styleElement.appendChild(getPseudoElementStyle(className, pseudo, style, options));
  clonedNode.appendChild(styleElement);
}
function clonePseudoElements(nativeNode, clonedNode, options) {
  clonePseudoElement(nativeNode, clonedNode, ":before", options);
  clonePseudoElement(nativeNode, clonedNode, ":after", options);
}
var init_clone_pseudos = __esm({
  "node_modules/html-to-image/es/clone-pseudos.js"() {
    init_util();
  }
});

// node_modules/html-to-image/es/mimes.js
function getExtension(url) {
  const match = /\.([^./]*?)$/g.exec(url);
  return match ? match[1] : "";
}
function getMimeType(url) {
  const extension = getExtension(url).toLowerCase();
  return mimes[extension] || "";
}
var WOFF, JPEG, mimes;
var init_mimes = __esm({
  "node_modules/html-to-image/es/mimes.js"() {
    WOFF = "application/font-woff";
    JPEG = "image/jpeg";
    mimes = {
      woff: WOFF,
      woff2: WOFF,
      ttf: "application/font-truetype",
      eot: "application/vnd.ms-fontobject",
      png: "image/png",
      jpg: JPEG,
      jpeg: JPEG,
      gif: "image/gif",
      tiff: "image/tiff",
      svg: "image/svg+xml",
      webp: "image/webp"
    };
  }
});

// node_modules/html-to-image/es/dataurl.js
function getContentFromDataUrl(dataURL) {
  return dataURL.split(/,/)[1];
}
function isDataUrl(url) {
  return url.search(/^(data:)/) !== -1;
}
function makeDataUrl(content, mimeType) {
  return `data:${mimeType};base64,${content}`;
}
async function fetchAsDataURL(url, init, process2) {
  const res = await fetch(url, init);
  if (res.status === 404) {
    throw new Error(`Resource "${res.url}" not found`);
  }
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onloadend = () => {
      try {
        resolve(process2({ res, result: reader.result }));
      } catch (error) {
        reject(error);
      }
    };
    reader.readAsDataURL(blob);
  });
}
function getCacheKey(url, contentType, includeQueryParams) {
  let key = url.replace(/\?.*/, "");
  if (includeQueryParams) {
    key = url;
  }
  if (/ttf|otf|eot|woff2?/i.test(key)) {
    key = key.replace(/.*\//, "");
  }
  return contentType ? `[${contentType}]${key}` : key;
}
async function resourceToDataURL(resourceUrl, contentType, options) {
  const cacheKey = getCacheKey(resourceUrl, contentType, options.includeQueryParams);
  if (cache[cacheKey] != null) {
    return cache[cacheKey];
  }
  if (options.cacheBust) {
    resourceUrl += (/\?/.test(resourceUrl) ? "&" : "?") + (/* @__PURE__ */ new Date()).getTime();
  }
  let dataURL;
  try {
    const content = await fetchAsDataURL(resourceUrl, options.fetchRequestInit, ({ res, result }) => {
      if (!contentType) {
        contentType = res.headers.get("Content-Type") || "";
      }
      return getContentFromDataUrl(result);
    });
    dataURL = makeDataUrl(content, contentType);
  } catch (error) {
    dataURL = options.imagePlaceholder || "";
    let msg = `Failed to fetch resource: ${resourceUrl}`;
    if (error) {
      msg = typeof error === "string" ? error : error.message;
    }
    if (msg) {
      console.warn(msg);
    }
  }
  cache[cacheKey] = dataURL;
  return dataURL;
}
var cache;
var init_dataurl = __esm({
  "node_modules/html-to-image/es/dataurl.js"() {
    cache = {};
  }
});

// node_modules/html-to-image/es/clone-node.js
async function cloneCanvasElement(canvas) {
  const dataURL = canvas.toDataURL();
  if (dataURL === "data:,") {
    return canvas.cloneNode(false);
  }
  return createImage(dataURL);
}
async function cloneVideoElement(video, options) {
  if (video.currentSrc) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = video.clientWidth;
    canvas.height = video.clientHeight;
    ctx === null || ctx === void 0 ? void 0 : ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL2 = canvas.toDataURL();
    return createImage(dataURL2);
  }
  const poster = video.poster;
  const contentType = getMimeType(poster);
  const dataURL = await resourceToDataURL(poster, contentType, options);
  return createImage(dataURL);
}
async function cloneIFrameElement(iframe, options) {
  var _a;
  try {
    if ((_a = iframe === null || iframe === void 0 ? void 0 : iframe.contentDocument) === null || _a === void 0 ? void 0 : _a.body) {
      return await cloneNode(iframe.contentDocument.body, options, true);
    }
  } catch (_b) {
  }
  return iframe.cloneNode(false);
}
async function cloneSingleNode(node, options) {
  if (isInstanceOfElement(node, HTMLCanvasElement)) {
    return cloneCanvasElement(node);
  }
  if (isInstanceOfElement(node, HTMLVideoElement)) {
    return cloneVideoElement(node, options);
  }
  if (isInstanceOfElement(node, HTMLIFrameElement)) {
    return cloneIFrameElement(node, options);
  }
  return node.cloneNode(isSVGElement(node));
}
async function cloneChildren(nativeNode, clonedNode, options) {
  var _a, _b;
  if (isSVGElement(clonedNode)) {
    return clonedNode;
  }
  let children = [];
  if (isSlotElement(nativeNode) && nativeNode.assignedNodes) {
    children = toArray(nativeNode.assignedNodes());
  } else if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && ((_a = nativeNode.contentDocument) === null || _a === void 0 ? void 0 : _a.body)) {
    children = toArray(nativeNode.contentDocument.body.childNodes);
  } else {
    children = toArray(((_b = nativeNode.shadowRoot) !== null && _b !== void 0 ? _b : nativeNode).childNodes);
  }
  if (children.length === 0 || isInstanceOfElement(nativeNode, HTMLVideoElement)) {
    return clonedNode;
  }
  await children.reduce((deferred, child) => deferred.then(() => cloneNode(child, options)).then((clonedChild) => {
    if (clonedChild) {
      clonedNode.appendChild(clonedChild);
    }
  }), Promise.resolve());
  return clonedNode;
}
function cloneCSSStyle(nativeNode, clonedNode, options) {
  const targetStyle = clonedNode.style;
  if (!targetStyle) {
    return;
  }
  const sourceStyle = window.getComputedStyle(nativeNode);
  if (sourceStyle.cssText) {
    targetStyle.cssText = sourceStyle.cssText;
    targetStyle.transformOrigin = sourceStyle.transformOrigin;
  } else {
    getStyleProperties(options).forEach((name) => {
      let value = sourceStyle.getPropertyValue(name);
      if (name === "font-size" && value.endsWith("px")) {
        const reducedFont = Math.floor(parseFloat(value.substring(0, value.length - 2))) - 0.1;
        value = `${reducedFont}px`;
      }
      if (isInstanceOfElement(nativeNode, HTMLIFrameElement) && name === "display" && value === "inline") {
        value = "block";
      }
      if (name === "d" && clonedNode.getAttribute("d")) {
        value = `path(${clonedNode.getAttribute("d")})`;
      }
      targetStyle.setProperty(name, value, sourceStyle.getPropertyPriority(name));
    });
  }
}
function cloneInputValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLTextAreaElement)) {
    clonedNode.innerHTML = nativeNode.value;
  }
  if (isInstanceOfElement(nativeNode, HTMLInputElement)) {
    clonedNode.setAttribute("value", nativeNode.value);
  }
}
function cloneSelectValue(nativeNode, clonedNode) {
  if (isInstanceOfElement(nativeNode, HTMLSelectElement)) {
    const clonedSelect = clonedNode;
    const selectedOption = Array.from(clonedSelect.children).find((child) => nativeNode.value === child.getAttribute("value"));
    if (selectedOption) {
      selectedOption.setAttribute("selected", "");
    }
  }
}
function decorate(nativeNode, clonedNode, options) {
  if (isInstanceOfElement(clonedNode, Element)) {
    cloneCSSStyle(nativeNode, clonedNode, options);
    clonePseudoElements(nativeNode, clonedNode, options);
    cloneInputValue(nativeNode, clonedNode);
    cloneSelectValue(nativeNode, clonedNode);
  }
  return clonedNode;
}
async function ensureSVGSymbols(clone, options) {
  const uses = clone.querySelectorAll ? clone.querySelectorAll("use") : [];
  if (uses.length === 0) {
    return clone;
  }
  const processedDefs = {};
  for (let i = 0; i < uses.length; i++) {
    const use = uses[i];
    const id = use.getAttribute("xlink:href");
    if (id) {
      const exist = clone.querySelector(id);
      const definition = document.querySelector(id);
      if (!exist && definition && !processedDefs[id]) {
        processedDefs[id] = await cloneNode(definition, options, true);
      }
    }
  }
  const nodes = Object.values(processedDefs);
  if (nodes.length) {
    const ns = "http://www.w3.org/1999/xhtml";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("xmlns", ns);
    svg.style.position = "absolute";
    svg.style.width = "0";
    svg.style.height = "0";
    svg.style.overflow = "hidden";
    svg.style.display = "none";
    const defs = document.createElementNS(ns, "defs");
    svg.appendChild(defs);
    for (let i = 0; i < nodes.length; i++) {
      defs.appendChild(nodes[i]);
    }
    clone.appendChild(svg);
  }
  return clone;
}
async function cloneNode(node, options, isRoot) {
  if (!isRoot && options.filter && !options.filter(node)) {
    return null;
  }
  return Promise.resolve(node).then((clonedNode) => cloneSingleNode(clonedNode, options)).then((clonedNode) => cloneChildren(node, clonedNode, options)).then((clonedNode) => decorate(node, clonedNode, options)).then((clonedNode) => ensureSVGSymbols(clonedNode, options));
}
var isSlotElement, isSVGElement;
var init_clone_node = __esm({
  "node_modules/html-to-image/es/clone-node.js"() {
    init_clone_pseudos();
    init_util();
    init_mimes();
    init_dataurl();
    isSlotElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SLOT";
    isSVGElement = (node) => node.tagName != null && node.tagName.toUpperCase() === "SVG";
  }
});

// node_modules/html-to-image/es/embed-resources.js
function toRegex(url) {
  const escaped = url.replace(/([.*+?^${}()|\[\]\/\\])/g, "\\$1");
  return new RegExp(`(url\\(['"]?)(${escaped})(['"]?\\))`, "g");
}
function parseURLs(cssText) {
  const urls = [];
  cssText.replace(URL_REGEX, (raw, quotation, url) => {
    urls.push(url);
    return raw;
  });
  return urls.filter((url) => !isDataUrl(url));
}
async function embed(cssText, resourceURL, baseURL, options, getContentFromUrl) {
  try {
    const resolvedURL = baseURL ? resolveUrl(resourceURL, baseURL) : resourceURL;
    const contentType = getMimeType(resourceURL);
    let dataURL;
    if (getContentFromUrl) {
      const content = await getContentFromUrl(resolvedURL);
      dataURL = makeDataUrl(content, contentType);
    } else {
      dataURL = await resourceToDataURL(resolvedURL, contentType, options);
    }
    return cssText.replace(toRegex(resourceURL), `$1${dataURL}$3`);
  } catch (error) {
  }
  return cssText;
}
function filterPreferredFontFormat(str, { preferredFontFormat }) {
  return !preferredFontFormat ? str : str.replace(FONT_SRC_REGEX, (match) => {
    while (true) {
      const [src, , format] = URL_WITH_FORMAT_REGEX.exec(match) || [];
      if (!format) {
        return "";
      }
      if (format === preferredFontFormat) {
        return `src: ${src};`;
      }
    }
  });
}
function shouldEmbed(url) {
  return url.search(URL_REGEX) !== -1;
}
async function embedResources(cssText, baseUrl, options) {
  if (!shouldEmbed(cssText)) {
    return cssText;
  }
  const filteredCSSText = filterPreferredFontFormat(cssText, options);
  const urls = parseURLs(filteredCSSText);
  return urls.reduce((deferred, url) => deferred.then((css) => embed(css, url, baseUrl, options)), Promise.resolve(filteredCSSText));
}
var URL_REGEX, URL_WITH_FORMAT_REGEX, FONT_SRC_REGEX;
var init_embed_resources = __esm({
  "node_modules/html-to-image/es/embed-resources.js"() {
    init_util();
    init_mimes();
    init_dataurl();
    URL_REGEX = /url\((['"]?)([^'"]+?)\1\)/g;
    URL_WITH_FORMAT_REGEX = /url\([^)]+\)\s*format\((["']?)([^"']+)\1\)/g;
    FONT_SRC_REGEX = /src:\s*(?:url\([^)]+\)\s*format\([^)]+\)[,;]\s*)+/g;
  }
});

// node_modules/html-to-image/es/embed-images.js
async function embedProp(propName, node, options) {
  var _a;
  const propValue = (_a = node.style) === null || _a === void 0 ? void 0 : _a.getPropertyValue(propName);
  if (propValue) {
    const cssString = await embedResources(propValue, null, options);
    node.style.setProperty(propName, cssString, node.style.getPropertyPriority(propName));
    return true;
  }
  return false;
}
async function embedBackground(clonedNode, options) {
  ;
  await embedProp("background", clonedNode, options) || await embedProp("background-image", clonedNode, options);
  await embedProp("mask", clonedNode, options) || await embedProp("-webkit-mask", clonedNode, options) || await embedProp("mask-image", clonedNode, options) || await embedProp("-webkit-mask-image", clonedNode, options);
}
async function embedImageNode(clonedNode, options) {
  const isImageElement = isInstanceOfElement(clonedNode, HTMLImageElement);
  if (!(isImageElement && !isDataUrl(clonedNode.src)) && !(isInstanceOfElement(clonedNode, SVGImageElement) && !isDataUrl(clonedNode.href.baseVal))) {
    return;
  }
  const url = isImageElement ? clonedNode.src : clonedNode.href.baseVal;
  const dataURL = await resourceToDataURL(url, getMimeType(url), options);
  await new Promise((resolve, reject) => {
    clonedNode.onload = resolve;
    clonedNode.onerror = options.onImageErrorHandler ? (...attributes) => {
      try {
        resolve(options.onImageErrorHandler(...attributes));
      } catch (error) {
        reject(error);
      }
    } : reject;
    const image = clonedNode;
    if (image.decode) {
      image.decode = resolve;
    }
    if (image.loading === "lazy") {
      image.loading = "eager";
    }
    if (isImageElement) {
      clonedNode.srcset = "";
      clonedNode.src = dataURL;
    } else {
      clonedNode.href.baseVal = dataURL;
    }
  });
}
async function embedChildren(clonedNode, options) {
  const children = toArray(clonedNode.childNodes);
  const deferreds = children.map((child) => embedImages(child, options));
  await Promise.all(deferreds).then(() => clonedNode);
}
async function embedImages(clonedNode, options) {
  if (isInstanceOfElement(clonedNode, Element)) {
    await embedBackground(clonedNode, options);
    await embedImageNode(clonedNode, options);
    await embedChildren(clonedNode, options);
  }
}
var init_embed_images = __esm({
  "node_modules/html-to-image/es/embed-images.js"() {
    init_embed_resources();
    init_util();
    init_dataurl();
    init_mimes();
  }
});

// node_modules/html-to-image/es/apply-style.js
function applyStyle(node, options) {
  const { style } = node;
  if (options.backgroundColor) {
    style.backgroundColor = options.backgroundColor;
  }
  if (options.width) {
    style.width = `${options.width}px`;
  }
  if (options.height) {
    style.height = `${options.height}px`;
  }
  const manual = options.style;
  if (manual != null) {
    Object.keys(manual).forEach((key) => {
      style[key] = manual[key];
    });
  }
  return node;
}
var init_apply_style = __esm({
  "node_modules/html-to-image/es/apply-style.js"() {
  }
});

// node_modules/html-to-image/es/embed-webfonts.js
async function fetchCSS(url) {
  let cache2 = cssFetchCache[url];
  if (cache2 != null) {
    return cache2;
  }
  const res = await fetch(url);
  const cssText = await res.text();
  cache2 = { url, cssText };
  cssFetchCache[url] = cache2;
  return cache2;
}
async function embedFonts(data, options) {
  let cssText = data.cssText;
  const regexUrl = /url\(["']?([^"')]+)["']?\)/g;
  const fontLocs = cssText.match(/url\([^)]+\)/g) || [];
  const loadFonts = fontLocs.map(async (loc) => {
    let url = loc.replace(regexUrl, "$1");
    if (!url.startsWith("https://")) {
      url = new URL(url, data.url).href;
    }
    return fetchAsDataURL(url, options.fetchRequestInit, ({ result }) => {
      cssText = cssText.replace(loc, `url(${result})`);
      return [loc, result];
    });
  });
  return Promise.all(loadFonts).then(() => cssText);
}
function parseCSS(source) {
  if (source == null) {
    return [];
  }
  const result = [];
  const commentsRegex = /(\/\*[\s\S]*?\*\/)/gi;
  let cssText = source.replace(commentsRegex, "");
  const keyframesRegex = new RegExp("((@.*?keyframes [\\s\\S]*?){([\\s\\S]*?}\\s*?)})", "gi");
  while (true) {
    const matches = keyframesRegex.exec(cssText);
    if (matches === null) {
      break;
    }
    result.push(matches[0]);
  }
  cssText = cssText.replace(keyframesRegex, "");
  const importRegex = /@import[\s\S]*?url\([^)]*\)[\s\S]*?;/gi;
  const combinedCSSRegex = "((\\s*?(?:\\/\\*[\\s\\S]*?\\*\\/)?\\s*?@media[\\s\\S]*?){([\\s\\S]*?)}\\s*?})|(([\\s\\S]*?){([\\s\\S]*?)})";
  const unifiedRegex = new RegExp(combinedCSSRegex, "gi");
  while (true) {
    let matches = importRegex.exec(cssText);
    if (matches === null) {
      matches = unifiedRegex.exec(cssText);
      if (matches === null) {
        break;
      } else {
        importRegex.lastIndex = unifiedRegex.lastIndex;
      }
    } else {
      unifiedRegex.lastIndex = importRegex.lastIndex;
    }
    result.push(matches[0]);
  }
  return result;
}
async function getCSSRules(styleSheets, options) {
  const ret = [];
  const deferreds = [];
  styleSheets.forEach((sheet) => {
    if ("cssRules" in sheet) {
      try {
        toArray(sheet.cssRules || []).forEach((item, index) => {
          if (item.type === CSSRule.IMPORT_RULE) {
            let importIndex = index + 1;
            const url = item.href;
            const deferred = fetchCSS(url).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
              try {
                sheet.insertRule(rule, rule.startsWith("@import") ? importIndex += 1 : sheet.cssRules.length);
              } catch (error) {
                console.error("Error inserting rule from remote css", {
                  rule,
                  error
                });
              }
            })).catch((e) => {
              console.error("Error loading remote css", e.toString());
            });
            deferreds.push(deferred);
          }
        });
      } catch (e) {
        const inline = styleSheets.find((a) => a.href == null) || document.styleSheets[0];
        if (sheet.href != null) {
          deferreds.push(fetchCSS(sheet.href).then((metadata) => embedFonts(metadata, options)).then((cssText) => parseCSS(cssText).forEach((rule) => {
            inline.insertRule(rule, inline.cssRules.length);
          })).catch((err) => {
            console.error("Error loading remote stylesheet", err);
          }));
        }
        console.error("Error inlining remote css file", e);
      }
    }
  });
  return Promise.all(deferreds).then(() => {
    styleSheets.forEach((sheet) => {
      if ("cssRules" in sheet) {
        try {
          toArray(sheet.cssRules || []).forEach((item) => {
            ret.push(item);
          });
        } catch (e) {
          console.error(`Error while reading CSS rules from ${sheet.href}`, e);
        }
      }
    });
    return ret;
  });
}
function getWebFontRules(cssRules) {
  return cssRules.filter((rule) => rule.type === CSSRule.FONT_FACE_RULE).filter((rule) => shouldEmbed(rule.style.getPropertyValue("src")));
}
async function parseWebFontRules(node, options) {
  if (node.ownerDocument == null) {
    throw new Error("Provided element is not within a Document");
  }
  const styleSheets = toArray(node.ownerDocument.styleSheets);
  const cssRules = await getCSSRules(styleSheets, options);
  return getWebFontRules(cssRules);
}
function normalizeFontFamily(font) {
  return font.trim().replace(/["']/g, "");
}
function getUsedFonts(node) {
  const fonts = /* @__PURE__ */ new Set();
  function traverse(node2) {
    const fontFamily = node2.style.fontFamily || getComputedStyle(node2).fontFamily;
    fontFamily.split(",").forEach((font) => {
      fonts.add(normalizeFontFamily(font));
    });
    Array.from(node2.children).forEach((child) => {
      if (child instanceof HTMLElement) {
        traverse(child);
      }
    });
  }
  traverse(node);
  return fonts;
}
async function getWebFontCSS(node, options) {
  const rules = await parseWebFontRules(node, options);
  const usedFonts = getUsedFonts(node);
  const cssTexts = await Promise.all(rules.filter((rule) => usedFonts.has(normalizeFontFamily(rule.style.fontFamily))).map((rule) => {
    const baseUrl = rule.parentStyleSheet ? rule.parentStyleSheet.href : null;
    return embedResources(rule.cssText, baseUrl, options);
  }));
  return cssTexts.join("\n");
}
async function embedWebFonts(clonedNode, options) {
  const cssText = options.fontEmbedCSS != null ? options.fontEmbedCSS : options.skipFonts ? null : await getWebFontCSS(clonedNode, options);
  if (cssText) {
    const styleNode = document.createElement("style");
    const sytleContent = document.createTextNode(cssText);
    styleNode.appendChild(sytleContent);
    if (clonedNode.firstChild) {
      clonedNode.insertBefore(styleNode, clonedNode.firstChild);
    } else {
      clonedNode.appendChild(styleNode);
    }
  }
}
var cssFetchCache;
var init_embed_webfonts = __esm({
  "node_modules/html-to-image/es/embed-webfonts.js"() {
    init_util();
    init_dataurl();
    init_embed_resources();
    cssFetchCache = {};
  }
});

// node_modules/html-to-image/es/index.js
var es_exports = {};
__export(es_exports, {
  getFontEmbedCSS: () => getFontEmbedCSS,
  toBlob: () => toBlob,
  toCanvas: () => toCanvas,
  toJpeg: () => toJpeg,
  toPixelData: () => toPixelData,
  toPng: () => toPng,
  toSvg: () => toSvg
});
async function toSvg(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const clonedNode = await cloneNode(node, options, true);
  await embedWebFonts(clonedNode, options);
  await embedImages(clonedNode, options);
  applyStyle(clonedNode, options);
  const datauri = await nodeToDataURL(clonedNode, width, height);
  return datauri;
}
async function toCanvas(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const svg = await toSvg(node, options);
  const img = await createImage(svg);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const ratio = options.pixelRatio || getPixelRatio();
  const canvasWidth = options.canvasWidth || width;
  const canvasHeight = options.canvasHeight || height;
  canvas.width = canvasWidth * ratio;
  canvas.height = canvasHeight * ratio;
  if (!options.skipAutoScale) {
    checkCanvasDimensions(canvas);
  }
  canvas.style.width = `${canvasWidth}`;
  canvas.style.height = `${canvasHeight}`;
  if (options.backgroundColor) {
    context.fillStyle = options.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}
async function toPixelData(node, options = {}) {
  const { width, height } = getImageSize(node, options);
  const canvas = await toCanvas(node, options);
  const ctx = canvas.getContext("2d");
  return ctx.getImageData(0, 0, width, height).data;
}
async function toPng(node, options = {}) {
  const canvas = await toCanvas(node, options);
  return canvas.toDataURL();
}
async function toJpeg(node, options = {}) {
  const canvas = await toCanvas(node, options);
  return canvas.toDataURL("image/jpeg", options.quality || 1);
}
async function toBlob(node, options = {}) {
  const canvas = await toCanvas(node, options);
  const blob = await canvasToBlob(canvas);
  return blob;
}
async function getFontEmbedCSS(node, options = {}) {
  return getWebFontCSS(node, options);
}
var init_es = __esm({
  "node_modules/html-to-image/es/index.js"() {
    init_clone_node();
    init_embed_images();
    init_apply_style();
    init_embed_webfonts();
    init_util();
  }
});

// src/widget/GuiderWidget.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";

// src/widget/screenshot.js
async function captureViewport() {
  const { toJpeg: toJpeg2 } = await Promise.resolve().then(() => (init_es(), es_exports));
  const root = document.documentElement;
  try {
    return await toJpeg2(root, {
      quality: 0.72,
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      canvasWidth: Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)),
      canvasHeight: Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)),
      width: window.innerWidth,
      height: window.innerHeight,
      skipFonts: true,
      style: {
        margin: "0",
        transform: "none",
        transformOrigin: "top left"
      },
      filter: (node) => shouldIncludeNode(node)
    });
  } catch {
    return createFallbackCanvas().toDataURL("image/jpeg", 0.72);
  }
}
function shouldIncludeNode(node) {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-guider-panel], [data-guider-launcher], [data-guider-cursor], #guider-highlight-root");
}
function createFallbackCanvas() {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(window.innerWidth));
  canvas.height = Math.max(1, Math.round(window.innerHeight));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#f7f7f5");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111111";
  ctx.font = "500 20px sans-serif";
  ctx.fillText("Guider fallback capture", 28, 42);
  ctx.fillStyle = "rgba(17,17,17,0.55)";
  ctx.font = "14px sans-serif";
  ctx.fillText(window.location.pathname || "/", 28, 66);
  return canvas;
}

// src/widget/voice.js
var VoiceRecorder = class {
  constructor() {
    this.recorder = null;
    this.chunks = [];
    this.stream = null;
  }
  async start() {
    var _a;
    if (!((_a = navigator.mediaDevices) == null ? void 0 : _a.getUserMedia))
      throw new Error("Microphone not supported in this browser.");
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = pickMime();
    this.recorder = new MediaRecorder(this.stream, mime ? { mimeType: mime } : void 0);
    this.chunks = [];
    this.recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start();
  }
  async stop() {
    if (!this.recorder) return null;
    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        var _a;
        const blob = new Blob(this.chunks, { type: this.recorder.mimeType || "audio/webm" });
        (_a = this.stream) == null ? void 0 : _a.getTracks().forEach((t) => t.stop());
        this.recorder = null;
        this.stream = null;
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
};
function pickMime() {
  var _a;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && ((_a = MediaRecorder.isTypeSupported) == null ? void 0 : _a.call(MediaRecorder, c))) return c;
  }
  return null;
}
async function transcribeWithWhisper(blob, apiKey, endpoint = "https://api.openai.com/v1/audio/transcriptions") {
  const fd = new FormData();
  const ext = (blob.type.split("/")[1] || "webm").split(";")[0];
  fd.append("file", blob, `voice.${ext}`);
  fd.append("model", "whisper-1");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: fd
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Whisper failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.text || "";
}

// src/widget/selectors.js
function findElement(candidates) {
  if (!Array.isArray(candidates)) return null;
  for (const c of candidates) {
    const el = resolveOne(c);
    if (el && isVisible(el)) return { el, matched: c };
  }
  return null;
}
function resolveOne(c) {
  var _a;
  if (!c) return null;
  if (typeof c === "string") {
    try {
      return document.querySelector(c);
    } catch {
      return null;
    }
  }
  if (c.kind === "css") {
    try {
      return document.querySelector(c.value);
    } catch {
      return null;
    }
  }
  if (c.kind === "data-guider") {
    return document.querySelector(`[data-guider="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "testid") {
    return document.querySelector(`[data-testid="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "aria") {
    return document.querySelector(`[aria-label="${cssEscape(c.value)}"]`);
  }
  if (c.kind === "role-name") {
    const els = document.querySelectorAll(`[role="${cssEscape(c.role)}"]`);
    for (const el of els) {
      const name = el.getAttribute("aria-label") || ((_a = el.textContent) == null ? void 0 : _a.trim()) || "";
      if (name.toLowerCase().includes(String(c.name).toLowerCase())) return el;
    }
    return null;
  }
  if (c.kind === "text") {
    return findByText(c.value, c.tag);
  }
  return null;
}
function findByText(text, tag) {
  const t = String(text || "").trim().toLowerCase();
  if (!t) return null;
  const sel = tag || "a, button, [role=button], [role=link], [role=tab], summary, label";
  const els = document.querySelectorAll(sel);
  let best = null;
  let bestLen = Infinity;
  for (const el of els) {
    const txt = (el.textContent || "").trim().toLowerCase();
    if (!txt) continue;
    if (txt === t) return el;
    if (txt.includes(t) && txt.length < bestLen) {
      best = el;
      bestLen = txt.length;
    }
  }
  return best;
}
function isVisible(el) {
  if (!el || !el.getBoundingClientRect) return false;
  const r = el.getBoundingClientRect();
  if (r.width <= 0 || r.height <= 0) return false;
  const cs = getComputedStyle(el);
  if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) === 0) return false;
  return true;
}
function cssEscape(s) {
  return String(s).replace(/["\\]/g, "\\$&");
}

// src/widget/highlight.js
var highlight_exports = {};
__export(highlight_exports, {
  cleanup: () => cleanup,
  show: () => show
});
var ROOT_ID = "guider-highlight-root";
var STYLE_ID = "guider-highlight-style";
var activeReposition = null;
var listenersAttached = false;
var lastPointer = getInitialPointer();
function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .18);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 16px;
      ${reduce ? "" : "transition: all .34s cubic-bezier(.2,.8,.2,1);"}
    }
    #${ROOT_ID} .gd-pointer {
      position: fixed;
      width: 24px;
      height: 24px;
      transform-origin: 7px 7px;
      ${reduce ? "" : "transition: left .42s cubic-bezier(.2,.8,.2,1), top .42s cubic-bezier(.2,.8,.2,1);"}
    }
    #${ROOT_ID} .gd-pointer::before {
      content: '';
      position: absolute;
      inset: 0;
      clip-path: polygon(0 0, 68% 58%, 43% 63%, 57% 100%, 43% 100%, 31% 66%, 0 0);
      background: var(--gd-accent, #3b82f6);
      filter: drop-shadow(0 10px 18px rgba(59, 130, 246, .28));
    }
    #${ROOT_ID} .gd-pointer::after {
      content: '';
      position: absolute;
      left: -6px;
      top: -6px;
      width: 18px;
      height: 18px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, .22);
      background: rgba(59, 130, 246, .08);
    }
    #${ROOT_ID} .gd-tip {
      position: fixed;
      max-width: 280px;
      padding: 12px 14px;
      background: rgba(255, 255, 255, .96);
      color: #111827;
      border: 1px solid rgba(15, 23, 42, .08);
      border-radius: 18px;
      font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
      box-shadow: 0 22px 44px rgba(15, 23, 42, .14);
      backdrop-filter: blur(18px);
      pointer-events: auto;
    }
    #${ROOT_ID} .gd-tip:focus-within { outline: 2px solid rgba(59, 130, 246, .34); outline-offset: 2px; }
    #${ROOT_ID} .gd-tip .gd-step {
      color: rgba(17, 24, 39, .5);
      font-size: 10px;
      letter-spacing: .16em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    #${ROOT_ID} .gd-tip .gd-title { font-weight: 700; margin-bottom: 4px; }
    #${ROOT_ID} .gd-tip .gd-body { color: rgba(17, 24, 39, .72); }
    #${ROOT_ID} .gd-tip .gd-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: flex-start; }
    #${ROOT_ID} .gd-tip button {
      background: #111827;
      color: #fff;
      border: 0;
      padding: 8px 12px;
      border-radius: 999px;
      font: 600 12px ui-sans-serif, system-ui;
      cursor: pointer;
    }
    #${ROOT_ID} .gd-tip button.gd-secondary {
      background: transparent;
      color: rgba(17, 24, 39, .65);
      border: 1px solid rgba(15, 23, 42, .08);
    }
    #${ROOT_ID} .gd-tip button:focus-visible { outline: 2px solid rgba(59, 130, 246, .34); outline-offset: 2px; }
    #${ROOT_ID} .gd-line {
      position: fixed;
      height: 1px;
      transform-origin: 0 50%;
      background: linear-gradient(90deg, rgba(59,130,246,.72), rgba(59,130,246,0));
      ${reduce ? "" : "transition: left .34s cubic-bezier(.2,.8,.2,1), top .34s cubic-bezier(.2,.8,.2,1), width .34s cubic-bezier(.2,.8,.2,1), transform .34s cubic-bezier(.2,.8,.2,1);"}
    }
    @media (prefers-contrast: more) {
      #${ROOT_ID} .gd-focus { box-shadow: 0 0 0 4px rgba(255,255,255,.4); }
      #${ROOT_ID} .gd-tip { background: #fff; color: #000; border-color: #000; }
    }
  `;
  document.head.appendChild(style);
}
function ensureRoot(accent) {
  let root = document.getElementById(ROOT_ID);
  if (!root) {
    root = document.createElement("div");
    root.id = ROOT_ID;
    root.setAttribute("aria-live", "polite");
    document.body.appendChild(root);
  }
  if (accent) root.style.setProperty("--gd-accent", accent);
  return root;
}
function cleanup() {
  var _a, _b;
  (_a = document.getElementById(ROOT_ID)) == null ? void 0 : _a.remove();
  (_b = document.getElementById(STYLE_ID)) == null ? void 0 : _b.remove();
  if (listenersAttached) {
    window.removeEventListener("resize", onReposition, true);
    window.removeEventListener("scroll", onReposition, true);
    document.removeEventListener("mousemove", onMouseMove, true);
    document.removeEventListener("keydown", onKeydown, true);
    listenersAttached = false;
  }
  activeReposition = null;
  activeKeyHandlers = null;
}
var activeKeyHandlers = null;
function onReposition() {
  activeReposition == null ? void 0 : activeReposition();
}
function onMouseMove(e) {
  lastPointer = { x: e.clientX, y: e.clientY };
}
function onKeydown(e) {
  var _a, _b, _c, _d;
  if (!activeKeyHandlers) return;
  if (e.key === "Escape") {
    e.preventDefault();
    (_a = activeKeyHandlers.skip) == null ? void 0 : _a.call(activeKeyHandlers);
  }
  if (e.key === "Enter" && (((_c = (_b = e.target) == null ? void 0 : _b.closest) == null ? void 0 : _c.call(_b, `#${ROOT_ID}`)) || document.activeElement === document.body)) {
    e.preventDefault();
    (_d = activeKeyHandlers.next) == null ? void 0 : _d.call(activeKeyHandlers);
  }
}
function getInitialPointer() {
  if (typeof window === "undefined") {
    return { x: 640, y: 640 };
  }
  return {
    x: Math.round(window.innerWidth * 0.5),
    y: Math.round(window.innerHeight - 80)
  };
}
async function show({ element, title, body, stepIndex, totalSteps, accent, onNext, onSkip }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = "";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center", inline: "center" });
  await new Promise((r) => setTimeout(r, reduce ? 0 : 250));
  const focus = document.createElement("div");
  focus.className = "gd-focus";
  root.appendChild(focus);
  const pointer = document.createElement("div");
  pointer.className = "gd-pointer";
  root.appendChild(pointer);
  const line = document.createElement("div");
  line.className = "gd-line";
  root.appendChild(line);
  const tip = document.createElement("div");
  tip.className = "gd-tip";
  tip.setAttribute("role", "dialog");
  tip.setAttribute("aria-live", "assertive");
  tip.setAttribute("aria-label", `Guider step ${stepIndex + 1} of ${totalSteps}: ${title || ""}`);
  tip.innerHTML = `
    <div class="gd-step">Step ${stepIndex + 1} of ${totalSteps}</div>
    <div class="gd-title"></div>
    <div class="gd-body"></div>
    <div class="gd-actions">
      <button class="gd-secondary" type="button" data-act="skip" data-guider="guider-skip">Skip</button>
      <button type="button" data-act="next" data-guider="guider-next">${stepIndex + 1 === totalSteps ? "Done" : "Next"}</button>
    </div>
  `;
  tip.querySelector(".gd-title").textContent = title || "";
  tip.querySelector(".gd-body").textContent = body || "";
  root.appendChild(tip);
  tip.querySelector("[data-act=next]").onclick = () => onNext == null ? void 0 : onNext();
  tip.querySelector("[data-act=skip]").onclick = () => onSkip == null ? void 0 : onSkip();
  setTimeout(() => {
    var _a;
    return (_a = tip.querySelector("[data-act=next]")) == null ? void 0 : _a.focus({ preventScroll: true });
  }, 60);
  const reposition = () => {
    const r = element.getBoundingClientRect();
    const pad = 10;
    const W = innerWidth, H = innerHeight;
    focus.style.cssText = `top:${r.top - pad}px;left:${r.left - pad}px;width:${r.width + 2 * pad}px;height:${r.height + 2 * pad}px;`;
    const tipW = Math.min(280, W - 24);
    const tipH = tip.offsetHeight || 110;
    let tx, ty, side;
    if (r.right + tipW + 24 < W) {
      tx = r.right + 18;
      ty = Math.max(8, Math.min(H - tipH - 8, r.top));
      side = "left";
    } else if (r.bottom + tipH + 24 < H) {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = r.bottom + 18;
      side = "top";
    } else {
      tx = Math.max(8, Math.min(W - tipW - 8, r.left));
      ty = Math.max(8, r.top - tipH - 18);
      side = "bottom";
    }
    tip.style.left = `${tx}px`;
    tip.style.top = `${ty}px`;
    const targetX = r.left + Math.min(r.width * 0.45, 22);
    const targetY = r.top + Math.min(r.height * 0.5, 22);
    pointer.style.left = `${targetX}px`;
    pointer.style.top = `${targetY}px`;
    const startX = lastPointer.x;
    const startY = lastPointer.y;
    const endX = tx + (side === "left" ? 0 : tipW * 0.5);
    const endY = ty + (side === "top" ? 0 : tipH * 0.5);
    const dx = endX - startX;
    const dy = endY - startY;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
    lastPointer = { x: targetX, y: targetY };
  };
  reposition();
  activeReposition = reposition;
  activeKeyHandlers = { next: onNext, skip: onSkip };
  if (!listenersAttached) {
    window.addEventListener("resize", onReposition, true);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousemove", onMouseMove, true);
    document.addEventListener("keydown", onKeydown, true);
    listenersAttached = true;
  }
}

// src/widget/llm.js
var SYSTEM = `You are Guider, a navigation assistant embedded in a Next.js app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: produce a step-by-step plan that points the user to the exact element(s) they need.

Strict rules:
- Use the screenshot to verify what is currently visible AND the map to know what exists.
- For each step, return:
    - "title": short imperative (e.g., "Open the Settings menu")
    - "body": one-sentence user-facing explanation
    - "selectors": ranked candidates (most stable first). Each is one of:
        { "kind": "data-guider", "value": "..." }
        { "kind": "testid",      "value": "..." }
        { "kind": "aria",        "value": "..." }
        { "kind": "role-name",   "role": "button"|"link"|"tab"|..., "name": "..." }
        { "kind": "text",        "value": "...", "tag": "button|a|..." }
        { "kind": "css",         "value": "..." }
    - "visualHint": describe the element visually (color, position, surrounding text).
    - "expectedRoute": if clicking navigates the user, the route they land on (else null).
    - "action": optional. { "kind": "click" } (default) | { "kind": "type", "value": "..." } |
                { "kind": "select", "value": "..." } | { "kind": "press", "key": "Enter" }.
- If you are NOT confident the element exists, return confidence "low" and a "fallbackMessage".
- Do not invent UI not in the map. Steps must be sequential.

Output JSON shape:
{ "steps": [...], "confidence": "high"|"medium"|"low", "fallbackMessage": "string|null" }`;
function compactMap(map, currentRoute) {
  if (!(map == null ? void 0 : map.pages)) return { pages: [] };
  return {
    pages: map.pages.map((p) => {
      const isCurrent = p.route === currentRoute;
      return {
        route: p.route,
        purpose: p.purpose || null,
        categories: p.categories || [],
        ...isCurrent ? {
          summary: p.summary,
          interactive: p.interactive,
          visuals: p.visuals,
          modals: p.modals,
          dropdowns: p.dropdowns,
          conditions: p.conditions
        } : {
          interactiveCount: (p.interactive || []).length,
          keyActions: (p.interactive || []).slice(0, 6).map((x) => x.label || x.purpose || x.tag)
        }
      };
    })
  };
}
function buildMessages({ question, currentRoute, map, screenshotDataUrl }) {
  return [
    { role: "system", content: SYSTEM },
    {
      role: "user",
      content: [
        {
          type: "text",
          text: `Current route: ${currentRoute}

User question: ${question}

Site map (compacted):
${JSON.stringify(compactMap(map, currentRoute))}

Use the attached screenshot of the user's current viewport.`
        },
        { type: "image_url", image_url: { url: screenshotDataUrl } }
      ]
    }
  ];
}
async function planGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  apiKey,
  model = "gpt-5-nano-2025-08-07",
  endpoint = "https://api.openai.com/v1/chat/completions",
  proxy = null,
  signal
}) {
  var _a, _b, _c;
  const url = (proxy == null ? void 0 : proxy.plan) || endpoint;
  const headers = { "Content-Type": "application/json" };
  if (!proxy && apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const body = proxy ? { question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl } : {
    model,
    response_format: { type: "json_object" },
    messages: buildMessages({ question, currentRoute, map, screenshotDataUrl })
  };
  const res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Guider plan failed (${res.status}): ${txt.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = proxy ? JSON.stringify(data) : ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "{}";
  try {
    return JSON.parse(content);
  } catch {
    return {
      steps: [],
      confidence: "low",
      fallbackMessage: "I'm not sure where to point you. Try rephrasing."
    };
  }
}
async function streamPlanGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  proxyUrl,
  signal,
  onStep
}) {
  if (!proxyUrl) throw new Error("streamPlanGuidance requires proxyUrl.");
  const res = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl }),
    signal
  });
  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Guider stream failed (${res.status}): ${txt.slice(0, 200)}`);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  const steps = [];
  let confidence = "medium";
  let fallbackMessage = null;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let idx;
    while ((idx = buf.indexOf("\n\n")) !== -1) {
      const raw = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      const ev = parseSse(raw);
      if (!ev) continue;
      if (ev.event === "step") {
        try {
          const s = JSON.parse(ev.data);
          steps.push(s);
          onStep == null ? void 0 : onStep(s, steps.length - 1);
        } catch {
        }
      } else if (ev.event === "done") {
        try {
          const d = JSON.parse(ev.data);
          confidence = d.confidence || confidence;
          fallbackMessage = d.fallbackMessage || null;
        } catch {
        }
      } else if (ev.event === "error") {
        throw new Error(ev.data || "stream error");
      }
    }
  }
  return { steps, confidence, fallbackMessage };
}
function parseSse(raw) {
  let event = "message", data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
  }
  return data ? { event, data } : null;
}

// src/widget/GuiderWidget.jsx
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
function GuiderWidget({
  apiKey,
  mapUrl,
  map: mapProp,
  model,
  endpoint,
  whisperUrl,
  proxyUrl,
  currentRoute,
  accent = "#3080ff",
  speak = true
}) {
  const [map, setMap] = useState(mapProp || null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeValue, setComposeValue] = useState("");
  const recorderRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);
  const speechRef = useRef(null);
  const statusTimerRef = useRef(null);
  const composeInputRef = useRef(null);
  useEffect(() => {
    if (mapProp) {
      setMap(mapProp);
      return;
    }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl).then((response) => response.ok ? response.json() : null).then((json) => {
      if (!cancelled) setMap(json);
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [mapProp, mapUrl]);
  useEffect(() => () => {
    var _a;
    cleanup();
    (_a = abortRef.current) == null ? void 0 : _a.abort();
    stopSpeaking();
    clearStatus(statusTimerRef);
  }, []);
  const route = currentRoute || (typeof window !== "undefined" ? window.location.pathname : "/");
  const resolvedWhisperUrl = whisperUrl || inferWhisperUrl(proxyUrl);
  const announce = useCallback((text, duration = 2400) => {
    if (liveRef.current) {
      liveRef.current.textContent = "";
      setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = text;
      }, 30);
    }
    if (speak) speakText(text, speechRef);
    flashStatus(text, duration, setStatusText, statusTimerRef);
  }, [speak]);
  const highlightStep = useCallback(async (plan, index) => {
    var _a;
    cleanup();
    const step = (_a = plan == null ? void 0 : plan.steps) == null ? void 0 : _a[index];
    if (!step) return;
    const found = findElement(step.selectors);
    if (!found) {
      announce(`I couldn't find it. Look for ${step.visualHint || step.title}.`, 3200);
      return;
    }
    announce([step.title, step.body, step.visualHint ? `Look for ${step.visualHint}.` : ""].filter(Boolean).join(" "), 3200);
    await show({
      element: found.el,
      title: step.title,
      body: step.body,
      stepIndex: index,
      totalSteps: plan.steps.length,
      accent,
      onNext: () => {
        const nextIndex = index + 1;
        if (nextIndex >= plan.steps.length) {
          cleanup();
          announce("Done.", 1800);
          return;
        }
        highlightStep(plan, nextIndex);
      },
      onSkip: () => {
        cleanup();
        announce("Skipped.", 1600);
      }
    });
  }, [accent, announce]);
  const ask = useCallback(async (question) => {
    var _a, _b;
    if (!(question == null ? void 0 : question.trim())) return;
    setBusy(true);
    setComposeOpen(false);
    setComposeValue("");
    cleanup();
    (_a = abortRef.current) == null ? void 0 : _a.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const screenshotDataUrl = await captureViewport();
      let plan;
      if (proxyUrl) {
        const streamedSteps = [];
        plan = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: controller.signal,
          onStep: (step) => {
            streamedSteps.push(step);
            if (streamedSteps.length === 1) {
              highlightStep({ steps: streamedSteps }, 0);
            }
          }
        });
      } else {
        plan = await planGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          apiKey,
          model,
          endpoint,
          signal: controller.signal
        });
      }
      if (plan.confidence === "low" || !((_b = plan.steps) == null ? void 0 : _b.length)) {
        announce(plan.fallbackMessage || "I'm not confident about where to point you.", 3200);
        return;
      }
      announce(`${plan.steps.length} step${plan.steps.length > 1 ? "s" : ""} ready.`, 1800);
      await highlightStep(plan, 0);
    } catch (error) {
      if ((error == null ? void 0 : error.name) !== "AbortError") {
        announce(`Sorry \u2014 ${String((error == null ? void 0 : error.message) || error)}`, 3600);
      }
    } finally {
      setBusy(false);
    }
  }, [apiKey, endpoint, highlightStep, map, model, proxyUrl, route, announce]);
  const openComposer = useCallback((initialValue = "") => {
    setComposeValue(initialValue);
    setComposeOpen(true);
  }, []);
  const closeComposer = useCallback(() => {
    setComposeOpen(false);
    setComposeValue("");
  }, []);
  const onMicClick = useCallback(async () => {
    try {
      if (!recording) {
        const recorder2 = new VoiceRecorder();
        await recorder2.start();
        recorderRef.current = recorder2;
        setRecording(true);
        return;
      }
      const recorder = recorderRef.current;
      recorderRef.current = null;
      setRecording(false);
      setBusy(true);
      const blob = await recorder.stop();
      const text = resolvedWhisperUrl ? await transcribeViaProxy(blob, resolvedWhisperUrl) : await transcribeWithWhisper(blob, apiKey);
      if (text == null ? void 0 : text.trim()) {
        await ask(text.trim());
      } else {
        announce("I didn't catch that.", 2200);
      }
    } catch (error) {
      setRecording(false);
      announce(`Voice error: ${error.message}.`, 3200);
    } finally {
      setBusy(false);
    }
  }, [apiKey, ask, recording, resolvedWhisperUrl, announce]);
  useEffect(() => {
    if (!composeOpen) return void 0;
    const timer = setTimeout(() => {
      var _a;
      return (_a = composeInputRef.current) == null ? void 0 : _a.focus();
    }, 30);
    return () => clearTimeout(timer);
  }, [composeOpen]);
  useEffect(() => {
    const onGlobalKey = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(target.tagName))) {
        return;
      }
      const modifier = event.metaKey || event.ctrlKey;
      if (!modifier || event.altKey || event.repeat) return;
      if (event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (event.shiftKey) {
        onMicClick();
        return;
      }
      openComposer();
    };
    const onEscape = (event) => {
      if (event.key === "Escape") closeComposer();
    };
    document.addEventListener("keydown", onGlobalKey);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onGlobalKey);
      document.removeEventListener("keydown", onEscape);
    };
  }, [closeComposer, onMicClick, openComposer]);
  const onComposeSubmit = (event) => {
    event.preventDefault();
    const question = composeValue.trim();
    if (!question) return;
    ask(question);
  };
  const activeStatus = recording ? "Listening\u2026" : busy ? "Thinking\u2026" : statusText;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { ref: liveRef, "aria-live": "polite", "aria-atomic": "true", style: { position: "absolute", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", width: 1, height: 1, overflow: "hidden", whiteSpace: "nowrap" } }),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "data-guider": "guider-launcher",
        onClick: onMicClick,
        "aria-label": recording ? "Stop Guider voice capture" : "Start Guider voice capture",
        "aria-pressed": recording,
        title: "Click to talk. Press Cmd/Ctrl+K to type. Press Cmd/Ctrl+Shift+K for voice.",
        style: {
          position: "fixed",
          right: 20,
          bottom: 20,
          zIndex: 2147483646,
          width: 18,
          height: 18,
          padding: 0,
          border: "none",
          borderRadius: 999,
          background: recording ? accent : "rgba(17,17,17,0.92)",
          boxShadow: recording ? `0 0 0 8px ${hexAlpha(accent, 0.18)}, 0 14px 36px ${hexAlpha(accent, 0.24)}` : "0 14px 36px rgba(15,23,42,0.18)",
          cursor: "pointer",
          transition: "transform 160ms ease, box-shadow 160ms ease, background 160ms ease"
        },
        children: /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            style: {
              position: "absolute",
              inset: 4,
              borderRadius: 999,
              background: "rgba(255,255,255,0.96)",
              opacity: recording ? 0.98 : 0.82
            }
          }
        )
      }
    ),
    activeStatus && /* @__PURE__ */ jsx(
      "div",
      {
        "data-guider": "guider-status",
        role: "status",
        "aria-live": "polite",
        style: {
          position: "fixed",
          right: 20,
          bottom: 50,
          zIndex: 2147483646,
          maxWidth: 220,
          padding: "8px 11px",
          borderRadius: 999,
          border: "1px solid rgba(17,17,17,0.08)",
          background: "rgba(255,255,255,0.92)",
          color: "#111111",
          fontSize: 12,
          lineHeight: 1.3,
          boxShadow: "0 20px 44px rgba(15,23,42,.12)",
          backdropFilter: "blur(18px)",
          pointerEvents: "none"
        },
        children: activeStatus
      }
    ),
    composeOpen && /* @__PURE__ */ jsx(
      "div",
      {
        "data-guider": "guider-compose-backdrop",
        onClick: (event) => {
          if (event.target === event.currentTarget) closeComposer();
        },
        style: {
          position: "fixed",
          inset: 0,
          zIndex: 2147483645,
          background: "rgba(15,23,42,0.12)",
          backdropFilter: "blur(8px)",
          display: "grid",
          placeItems: "center",
          padding: 20
        },
        children: /* @__PURE__ */ jsxs(
          "form",
          {
            "data-guider": "guider-compose-modal",
            onSubmit: onComposeSubmit,
            style: {
              width: "min(460px, calc(100vw - 28px))",
              background: "rgba(255,255,255,0.97)",
              border: "1px solid rgba(15,23,42,0.08)",
              borderRadius: 20,
              boxShadow: "0 24px 70px rgba(15,23,42,0.14)",
              padding: 14
            },
            children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontSize: 12, letterSpacing: ".12em", textTransform: "uppercase", color: "#64748b" }, children: "Guider" }),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    onClick: closeComposer,
                    "aria-label": "Close prompt",
                    style: {
                      width: 34,
                      height: 34,
                      borderRadius: 999,
                      border: "1px solid rgba(15,23,42,0.08)",
                      background: "rgba(248,250,252,0.9)",
                      color: "#64748b",
                      cursor: "pointer",
                      fontSize: 16
                    },
                    children: "\xD7"
                  }
                )
              ] }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  ref: composeInputRef,
                  value: composeValue,
                  onChange: (event) => setComposeValue(event.target.value),
                  placeholder: "Ask a question about this page",
                  style: {
                    width: "100%",
                    borderRadius: 14,
                    border: `1px solid ${hexAlpha(accent, 0.14)}`,
                    background: "rgba(248,250,252,0.94)",
                    color: "#0f172a",
                    padding: "14px 15px",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box"
                  }
                }
              ),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 10 }, children: [
                /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "#64748b" }, children: "Cmd/Ctrl+K to open. Shift+Cmd/Ctrl+K for voice." }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10 }, children: [
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      onClick: closeComposer,
                      style: {
                        height: 34,
                        padding: "0 12px",
                        borderRadius: 999,
                        border: "1px solid rgba(15,23,42,0.08)",
                        background: "rgba(255,255,255,0.88)",
                        color: "#64748b",
                        cursor: "pointer",
                        fontWeight: 600
                      },
                      children: "Cancel"
                    }
                  ),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "submit",
                      disabled: !composeValue.trim() || busy,
                      style: {
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 999,
                        border: "none",
                        background: "#111111",
                        color: "#ffffff",
                        cursor: composeValue.trim() && !busy ? "pointer" : "default",
                        fontWeight: 700,
                        opacity: composeValue.trim() && !busy ? 1 : 0.5,
                        boxShadow: "0 10px 24px rgba(15,23,42,0.12)"
                      },
                      children: "Ask"
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      }
    )
  ] });
}
async function transcribeViaProxy(blob, url) {
  const fd = new FormData();
  fd.append("file", blob, "voice.webm");
  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) throw new Error(`Whisper proxy failed (${res.status})`);
  const data = await res.json();
  return data.text || "";
}
function hexAlpha(hex, alpha) {
  const m = /^#?([0-9a-f]{3,8})$/i.exec(hex || "");
  if (!m) return `rgba(48,128,255,${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function speakText(text, speechRef) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const cleaned = String(text).replace(/\s+/g, " ").trim();
  if (!cleaned) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(cleaned);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.volume = 1;
  speechRef.current = utterance;
  window.speechSynthesis.speak(utterance);
}
function stopSpeaking() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}
function flashStatus(text, duration, setStatusText, timerRef) {
  setStatusText(text || "");
  clearStatus(timerRef);
  if (!text || !duration) return;
  timerRef.current = setTimeout(() => {
    setStatusText("");
    timerRef.current = null;
  }, duration);
}
function clearStatus(timerRef) {
  if (!timerRef.current) return;
  clearTimeout(timerRef.current);
  timerRef.current = null;
}
function inferWhisperUrl(proxyUrl) {
  if (!proxyUrl) return void 0;
  return proxyUrl.replace(/\/api\/guider\/plan(?:\?.*)?$/, "/api/guider/transcribe");
}

// src/widget/context.js
import React2, { createContext, useContext, useState as useState2, useCallback as useCallback2 } from "react";
var Ctx = createContext(null);
function GuiderProvider({ children, value }) {
  return React2.createElement(Ctx.Provider, { value }, children);
}
function useGuider() {
  return useContext(Ctx);
}

// src/agent/interact.js
async function click(el) {
  if (!el) throw new Error("click: element is null");
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  await sleep(120);
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const opts = {
    bubbles: true,
    cancelable: true,
    composed: true,
    view: window,
    button: 0,
    buttons: 1,
    clientX: x,
    clientY: y
  };
  el.dispatchEvent(new PointerEvent("pointerover", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new PointerEvent("pointerenter", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mouseover", opts));
  el.dispatchEvent(new MouseEvent("mousemove", opts));
  el.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mousedown", opts));
  if (typeof el.focus === "function") try {
    el.focus({ preventScroll: true });
  } catch {
  }
  el.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerType: "mouse" }));
  el.dispatchEvent(new MouseEvent("mouseup", opts));
  if (typeof el.click === "function") {
    el.click();
  } else {
    el.dispatchEvent(new MouseEvent("click", opts));
  }
}
async function type(el, text, { clear = true, perCharDelay = 12 } = {}) {
  if (!el) throw new Error("type: element is null");
  el.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  if (typeof el.focus === "function") try {
    el.focus({ preventScroll: true });
  } catch {
  }
  await sleep(60);
  if (clear) {
    setNativeValue(el, "");
    el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  }
  const target = String(text);
  let buf = clear ? "" : el.value ?? "";
  for (const ch of target) {
    buf += ch;
    setNativeValue(el, buf);
    el.dispatchEvent(new InputEvent("input", { data: ch, bubbles: true, composed: true, inputType: "insertText" }));
    if (perCharDelay) await sleep(perCharDelay);
  }
  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
async function selectOption(el, value) {
  setNativeValue(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true, composed: true }));
  el.dispatchEvent(new Event("change", { bubbles: true, composed: true }));
}
async function press(target, key, { ctrlKey, shiftKey, altKey, metaKey } = {}) {
  const el = target || document.activeElement || document.body;
  const opts = { key, code: keyToCode(key), bubbles: true, cancelable: true, composed: true, ctrlKey, shiftKey, altKey, metaKey };
  el.dispatchEvent(new KeyboardEvent("keydown", opts));
  el.dispatchEvent(new KeyboardEvent("keypress", opts));
  el.dispatchEvent(new KeyboardEvent("keyup", opts));
}
function setNativeValue(el, value) {
  var _a;
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : el instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "value");
  (_a = desc == null ? void 0 : desc.set) == null ? void 0 : _a.call(el, value);
}
function keyToCode(key) {
  if (key.length === 1) return /[a-zA-Z]/.test(key) ? `Key${key.toUpperCase()}` : `Digit${key}`;
  return key;
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function waitForSettle({ quietMs = 350, timeoutMs = 4e3, root = document } = {}) {
  return new Promise((resolve) => {
    let timer = null;
    const tStart = Date.now();
    const obs = new MutationObserver(() => {
      clearTimeout(timer);
      if (Date.now() - tStart > timeoutMs) {
        obs.disconnect();
        resolve("timeout");
        return;
      }
      timer = setTimeout(() => {
        obs.disconnect();
        resolve("settled");
      }, quietMs);
    });
    obs.observe(root, { childList: true, subtree: true, attributes: true, characterData: true });
    timer = setTimeout(() => {
      obs.disconnect();
      resolve("settled");
    }, quietMs);
    setTimeout(() => {
      obs.disconnect();
      resolve("timeout");
    }, timeoutMs);
  });
}
function waitForRoute({ from = window.location.pathname, timeoutMs = 5e3 } = {}) {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (window.location.pathname !== from) return resolve(window.location.pathname);
      if (Date.now() - start > timeoutMs) return resolve(null);
      requestAnimationFrame(tick);
    };
    tick();
  });
}

// src/agent/runner.js
async function runPlan(plan, {
  onProgress = () => {
  },
  signal,
  perStepTimeoutMs = 8e3,
  showHighlight = true,
  highlight
  // optional reference to widget/highlight.js
} = {}) {
  var _a;
  if (!((_a = plan == null ? void 0 : plan.steps) == null ? void 0 : _a.length)) return { status: "completed", steps: [] };
  const trace = [];
  for (let i = 0; i < plan.steps.length; i++) {
    if (signal == null ? void 0 : signal.aborted) {
      cleanupHighlight(highlight);
      return { status: "aborted", steps: trace };
    }
    const step = plan.steps[i];
    onProgress({ phase: "starting", index: i, step });
    const found = findElement(step.selectors);
    if (!found) {
      const err = `Step ${i + 1}: couldn't find "${step.title}". Hint: ${step.visualHint || "(none)"}.`;
      onProgress({ phase: "failed", index: i, step, error: err });
      trace.push({ index: i, status: "not-found", step });
      cleanupHighlight(highlight);
      return { status: "failed", steps: trace, reason: "element-not-found", failedStep: i };
    }
    const el = found.el;
    if (showHighlight && (highlight == null ? void 0 : highlight.show)) {
      try {
        await highlight.show({
          element: el,
          title: step.title,
          body: step.body || step.visualHint,
          stepIndex: i,
          totalSteps: plan.steps.length,
          onNext: () => {
          },
          onSkip: () => {
          }
        });
      } catch {
      }
    }
    const action = inferAction(step, el);
    try {
      const fromRoute = window.location.pathname;
      await Promise.race([
        executeAction(action, el),
        timeout(perStepTimeoutMs, `Step ${i + 1}: timed out`)
      ]);
      await waitForSettle({ quietMs: 300, timeoutMs: Math.min(perStepTimeoutMs, 4e3) });
      if (step.expectedRoute && step.expectedRoute !== fromRoute) {
        await waitForRoute({ from: fromRoute, timeoutMs: 4e3 });
      }
      trace.push({ index: i, status: "ok", step, action: action.kind });
      onProgress({ phase: "completed", index: i, step, action: action.kind });
      await sleep(150);
    } catch (e) {
      const reason = String((e == null ? void 0 : e.message) || e);
      trace.push({ index: i, status: "error", step, error: reason });
      onProgress({ phase: "failed", index: i, step, error: reason });
      cleanupHighlight(highlight);
      return { status: "failed", steps: trace, reason, failedStep: i };
    }
  }
  cleanupHighlight(highlight);
  return { status: "completed", steps: trace };
}
function cleanupHighlight(highlight) {
  if (highlight == null ? void 0 : highlight.cleanup) try {
    highlight.cleanup();
  } catch {
  }
}
function inferAction(step, el) {
  var _a;
  const a = step.action;
  if ((a == null ? void 0 : a.kind) === "type" && a.value != null) return { kind: "type", value: String(a.value), clear: a.clear !== false };
  if ((a == null ? void 0 : a.kind) === "select" && a.value != null) return { kind: "select", value: String(a.value) };
  if ((a == null ? void 0 : a.kind) === "press" && a.key) return { kind: "press", key: a.key };
  if ((a == null ? void 0 : a.kind) === "click") return { kind: "click" };
  const tag = (_a = el.tagName) == null ? void 0 : _a.toLowerCase();
  if (tag === "input" && /^(text|email|password|search|url|tel|number)?$/.test(el.type || "")) {
    if (step.value != null) return { kind: "type", value: step.value };
  }
  if (tag === "textarea" && step.value != null) return { kind: "type", value: step.value };
  if (tag === "select" && step.value != null) return { kind: "select", value: step.value };
  return { kind: "click" };
}
async function executeAction(action, el) {
  switch (action.kind) {
    case "click":
      return click(el);
    case "type":
      return type(el, action.value, { clear: action.clear });
    case "select":
      return selectOption(el, action.value);
    case "press":
      return press(el, action.key);
    default:
      throw new Error(`unknown action ${action.kind}`);
  }
}
function timeout(ms, msg) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms));
}

// src/agent/index.js
var agentMode = {
  available: true,
  /**
   * Execute a plan returned by the widget LLM.
   *
   * @param {{
   *   plan: { steps: Array<{ title:string, body?:string, selectors:any[], visualHint?:string,
   *                          expectedRoute?:string|null, action?:{kind:string, value?:any, key?:string} }>,
   *           confidence: 'high'|'medium'|'low' },
   *   onProgress?: (event: { phase: 'starting'|'completed'|'failed', index: number, step: object, action?: string, error?: string }) => void,
   *   signal?: AbortSignal,
   *   showHighlight?: boolean,
   * }} args
   */
  async run({ plan, onProgress, signal, showHighlight = true }) {
    return runPlan(plan, { onProgress, signal, showHighlight, highlight: highlight_exports });
  }
};
export {
  GuiderProvider,
  GuiderWidget,
  agentMode,
  useGuider
};
