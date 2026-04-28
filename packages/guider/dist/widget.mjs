"use client";
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

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

// src/widget/GuiderWidget.tsx
import { useCallback, useEffect, useRef, useState } from "react";

// src/widget/screenshot.ts
async function captureViewport() {
  const { toJpeg: toJpeg2 } = await Promise.resolve().then(() => (init_es(), es_exports));
  const root = document.documentElement;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.round(window.innerWidth));
  const height = Math.max(1, Math.round(window.innerHeight));
  try {
    return await toJpeg2(root, {
      quality: 0.8,
      cacheBust: true,
      backgroundColor: "#ffffff",
      pixelRatio,
      canvasWidth: Math.round(width * pixelRatio),
      canvasHeight: Math.round(height * pixelRatio),
      width,
      height,
      skipFonts: true,
      style: {
        margin: "0",
        transform: "none",
        transformOrigin: "top left"
      },
      filter: (node) => shouldIncludeNode(node)
    });
  } catch {
    return createFallbackCanvas(width, height).toDataURL("image/jpeg", 0.8);
  }
}
function shouldIncludeNode(node) {
  if (!(node instanceof Element)) return true;
  return !node.closest("[data-guider-panel], [data-guider-launcher], [data-guider-cursor], #guider-highlight-root");
}
function createFallbackCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return canvas;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, "#f7f7f5");
  gradient.addColorStop(1, "#ffffff");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#111111";
  context.font = "500 20px sans-serif";
  context.fillText("Guider fallback capture", 28, 42);
  context.fillStyle = "rgba(17,17,17,0.55)";
  context.font = "14px sans-serif";
  context.fillText(window.location.pathname || "/", 28, 66);
  return canvas;
}

// src/widget/voice.ts
var DEFAULT_OPTIONS = {
  silenceDurationMs: 1400,
  noSpeechTimeoutMs: 2800,
  maxDurationMs: 12e3,
  minSpeechLevel: 0.018,
  sampleIntervalMs: 120,
  timesliceMs: 250
};
var VoiceRecorder = class {
  constructor(options = {}) {
    __publicField(this, "recorder", null);
    __publicField(this, "chunks", []);
    __publicField(this, "stream", null);
    __publicField(this, "audioContext", null);
    __publicField(this, "analyser", null);
    __publicField(this, "source", null);
    __publicField(this, "monitorTimer", null);
    __publicField(this, "startedAt", 0);
    __publicField(this, "lastSpeechAt", 0);
    __publicField(this, "peakLevel", 0);
    __publicField(this, "hadSpeech", false);
    __publicField(this, "stopReason", "manual");
    __publicField(this, "stopPromise", null);
    __publicField(this, "resolveStop", null);
    __publicField(this, "options");
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }
  async start() {
    var _a;
    if (!((_a = navigator.mediaDevices) == null ? void 0 : _a.getUserMedia)) {
      throw new Error("Microphone not supported in this browser.");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });
    this.setupLevelMonitor();
    const mimeType = pickMime();
    this.recorder = new MediaRecorder(
      this.stream,
      mimeType ? { mimeType, audioBitsPerSecond: 128e3 } : { audioBitsPerSecond: 128e3 }
    );
    this.chunks = [];
    this.startedAt = Date.now();
    this.lastSpeechAt = this.startedAt;
    this.peakLevel = 0;
    this.hadSpeech = false;
    this.stopReason = "manual";
    this.stopPromise = new Promise((resolve) => {
      this.resolveStop = resolve;
    });
    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };
    this.recorder.onstop = () => {
      var _a2;
      const recorder = this.recorder;
      const blob = new Blob(this.chunks, { type: (recorder == null ? void 0 : recorder.mimeType) || "audio/webm" });
      const result = {
        blob,
        durationMs: Math.max(0, Date.now() - this.startedAt),
        hadSpeech: this.hadSpeech,
        peakLevel: this.peakLevel,
        stopReason: this.stopReason
      };
      this.cleanup();
      (_a2 = this.resolveStop) == null ? void 0 : _a2.call(this, result);
      this.resolveStop = null;
      this.stopPromise = null;
    };
    this.recorder.start(this.options.timesliceMs);
    this.startMonitor();
  }
  async stop(reason = "manual") {
    if (!this.recorder) return null;
    if (this.recorder.state === "inactive") {
      return this.stopPromise;
    }
    this.stopReason = reason;
    this.recorder.stop();
    return this.stopPromise;
  }
  setupLevelMonitor() {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor || !this.stream) return;
    this.audioContext = new AudioContextCtor();
    this.source = this.audioContext.createMediaStreamSource(this.stream);
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
  }
  startMonitor() {
    this.monitorTimer = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - this.startedAt;
      const level = this.sampleLevel();
      if (level >= this.options.minSpeechLevel) {
        this.hadSpeech = true;
        this.lastSpeechAt = now;
      }
      if (elapsed >= this.options.maxDurationMs) {
        this.triggerAutoStop("max-duration");
        return;
      }
      if (!this.analyser) return;
      if (!this.hadSpeech && elapsed >= this.options.noSpeechTimeoutMs) {
        this.triggerAutoStop("no-speech");
        return;
      }
      if (this.hadSpeech && now - this.lastSpeechAt >= this.options.silenceDurationMs) {
        this.triggerAutoStop("silence");
      }
    }, this.options.sampleIntervalMs);
  }
  sampleLevel() {
    if (!this.analyser) return 0;
    const buffer = new Float32Array(this.analyser.fftSize);
    this.analyser.getFloatTimeDomainData(buffer);
    let total = 0;
    for (const value of buffer) {
      total += value * value;
    }
    const rms = Math.sqrt(total / buffer.length);
    this.peakLevel = Math.max(this.peakLevel, rms);
    return rms;
  }
  triggerAutoStop(reason) {
    var _a, _b;
    if (!this.recorder || this.recorder.state === "inactive") return;
    (_b = (_a = this.options).onAutoStop) == null ? void 0 : _b.call(_a, reason);
    void this.stop(reason);
  }
  cleanup() {
    var _a, _b, _c, _d;
    if (this.monitorTimer !== null) {
      window.clearInterval(this.monitorTimer);
      this.monitorTimer = null;
    }
    (_a = this.source) == null ? void 0 : _a.disconnect();
    (_b = this.analyser) == null ? void 0 : _b.disconnect();
    (_c = this.audioContext) == null ? void 0 : _c.close().catch(() => {
    });
    (_d = this.stream) == null ? void 0 : _d.getTracks().forEach((track) => track.stop());
    this.source = null;
    this.analyser = null;
    this.audioContext = null;
    this.stream = null;
    this.recorder = null;
  }
};
function pickMime() {
  var _a;
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const candidate of candidates) {
    if (typeof MediaRecorder !== "undefined" && ((_a = MediaRecorder.isTypeSupported) == null ? void 0 : _a.call(MediaRecorder, candidate))) {
      return candidate;
    }
  }
  return null;
}
async function transcribeWithWhisper(blob, apiKey, endpoint = "https://api.openai.com/v1/audio/transcriptions") {
  if (!apiKey) {
    throw new Error("Missing OpenAI API key for direct transcription.");
  }
  const formData = new FormData();
  const extension = (blob.type.split("/")[1] || "webm").split(";")[0];
  formData.append("file", blob, `voice.${extension}`);
  formData.append("model", "gpt-4o-mini-transcribe");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Transcription failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const data = await response.json();
  return data.text || "";
}

// src/widget/selectors.ts
var KIND_WEIGHT = {
  "data-guider": 100,
  testid: 90,
  aria: 82,
  "role-name": 74,
  text: 60,
  css: 42
};
function findElement(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const matches = [];
  for (const candidate of candidates) {
    const resolved = resolveCandidate(candidate);
    for (const element of resolved) {
      if (!isVisible(element)) continue;
      matches.push({
        el: element,
        matched: candidate,
        score: scoreElement(candidate, element)
      });
    }
  }
  matches.sort((left, right) => right.score - left.score);
  return matches[0] ? { el: matches[0].el, matched: matches[0].matched } : null;
}
function resolveCandidate(candidate) {
  if (!candidate) return [];
  if (typeof candidate === "string") {
    return querySelectorAllSafe(candidate);
  }
  switch (candidate.kind) {
    case "css":
      return querySelectorAllSafe(candidate.value || "");
    case "data-guider":
      return querySelectorAllSafe(`[data-guider="${cssEscape(candidate.value)}"]`);
    case "testid":
      return querySelectorAllSafe(`[data-testid="${cssEscape(candidate.value)}"]`);
    case "aria":
      return querySelectorAllSafe(`[aria-label="${cssEscape(candidate.value)}"]`);
    case "role-name":
      return findByRoleName(candidate.role, candidate.name);
    case "text":
      return findByText(candidate.value, candidate.tag);
    default:
      return [];
  }
}
function querySelectorAllSafe(selector) {
  if (!selector) return [];
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch {
    return [];
  }
}
function findByRoleName(role, name) {
  if (!role || !name) return [];
  const query = String(name).trim().toLowerCase();
  if (!query) return [];
  const elements = document.querySelectorAll(`[role="${cssEscape(role)}"]`);
  return Array.from(elements).filter((element) => {
    const accessibleName = getAccessibleName(element).toLowerCase();
    return accessibleName === query || accessibleName.includes(query);
  });
}
function findByText(text, tag) {
  const query = String(text || "").trim().toLowerCase();
  if (!query) return [];
  const selector = tag || "a, button, input, [role=button], [role=link], [role=tab], summary, label";
  return Array.from(document.querySelectorAll(selector)).filter((element) => {
    const valueText = getAccessibleName(element).toLowerCase();
    return valueText === query || valueText.includes(query);
  });
}
function getAccessibleName(element) {
  return (element.getAttribute("aria-label") || (element instanceof HTMLInputElement ? element.value : "") || element.textContent || "").trim();
}
function scoreElement(candidate, element) {
  const kind = typeof candidate === "string" ? "css" : candidate.kind || "css";
  const rect = element.getBoundingClientRect();
  const viewportArea = Math.max(1, window.innerWidth * window.innerHeight);
  const elementArea = Math.max(1, rect.width * rect.height);
  const areaScore = Math.min(18, elementArea / viewportArea * 240);
  const viewportScore = rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth ? 10 : 0;
  const occlusionPenalty = isOccluded(element) ? -50 : 0;
  const exactNameBonus = typeof candidate === "object" && candidate.value ? getAccessibleName(element).toLowerCase() === candidate.value.toLowerCase() ? 12 : 0 : 0;
  return (KIND_WEIGHT[kind] || 0) + areaScore + viewportScore + exactNameBonus + occlusionPenalty;
}
function isVisible(element) {
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const styles = getComputedStyle(element);
  if (styles.visibility === "hidden" || styles.display === "none" || parseFloat(styles.opacity) === 0) {
    return false;
  }
  return rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}
function isOccluded(element) {
  const rect = element.getBoundingClientRect();
  const points = [
    { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
    { x: rect.left + 8, y: rect.top + 8 },
    { x: rect.right - 8, y: rect.bottom - 8 }
  ].filter((point) => point.x >= 0 && point.y >= 0 && point.x <= window.innerWidth && point.y <= window.innerHeight);
  for (const point of points) {
    const topElement = document.elementFromPoint(point.x, point.y);
    if (!topElement) continue;
    if (topElement === element || element.contains(topElement)) {
      return false;
    }
  }
  return points.length > 0;
}
function cssEscape(value) {
  return String(value || "").replace(/["\\]/g, "\\$&");
}

// src/widget/highlight.ts
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
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${ROOT_ID} { position: fixed; inset: 0; pointer-events: none; z-index: 2147483600; }
    #${ROOT_ID} .gd-focus {
      position: fixed;
      border: 1px solid rgba(31, 41, 55, .16);
      background: rgba(59, 130, 246, .04);
      box-shadow: 0 18px 48px rgba(15, 23, 42, .08), 0 0 0 10px rgba(59, 130, 246, .08);
      border-radius: 18px;
      ${reduceMotion ? "" : "transition: all .22s ease-out;"}
    }
    #${ROOT_ID} .gd-target {
      position: fixed;
      width: 34px;
      height: 34px;
      margin-left: -10px;
      margin-top: -10px;
      transform-origin: 7px 7px;
      ${reduceMotion ? "" : "transition: left .18s ease-out, top .18s ease-out;"}
    }
    #${ROOT_ID} .gd-target::before {
      content: '';
      position: absolute;
      inset: 0;
      clip-path: polygon(2% 2%, 74% 56%, 49% 61%, 64% 100%, 48% 100%, 34% 66%, 2% 2%);
      background: var(--gd-accent, #3b82f6);
      filter: drop-shadow(0 12px 22px rgba(59, 130, 246, .28));
    }
    #${ROOT_ID} .gd-target::after {
      content: '';
      position: absolute;
      left: -10px;
      top: -10px;
      width: 22px;
      height: 22px;
      border-radius: 999px;
      border: 1px solid rgba(59, 130, 246, .24);
      background: rgba(59, 130, 246, .08);
    }
    #${ROOT_ID} .gd-follower {
      position: fixed;
      width: 18px;
      height: 18px;
      margin-left: -9px;
      margin-top: -9px;
      border-radius: 999px;
      border: 1px solid rgba(15, 23, 42, .12);
      background: rgba(255, 255, 255, .78);
      box-shadow: 0 10px 22px rgba(15, 23, 42, .12);
      backdrop-filter: blur(10px);
      ${reduceMotion ? "" : "transition: left .08s linear, top .08s linear;"}
    }
    #${ROOT_ID} .gd-line {
      position: fixed;
      height: 2px;
      transform-origin: 0 50%;
      background: linear-gradient(90deg, rgba(59,130,246,.42), rgba(59,130,246,.92));
      ${reduceMotion ? "" : "transition: left .08s linear, top .08s linear, width .12s ease-out, transform .12s ease-out;"}
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
    }
    #${ROOT_ID} .gd-title { font-weight: 700; margin-bottom: 4px; }
    #${ROOT_ID} .gd-body { color: rgba(17, 24, 39, .72); }
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
  if (accent) {
    root.style.setProperty("--gd-accent", accent);
  }
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
    listenersAttached = false;
  }
  activeReposition = null;
}
function onReposition() {
  activeReposition == null ? void 0 : activeReposition();
}
function onMouseMove(event) {
  lastPointer = { x: event.clientX, y: event.clientY };
  activeReposition == null ? void 0 : activeReposition();
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
async function show({ element, title, body, accent }) {
  ensureStyle();
  const root = ensureRoot(accent);
  root.innerHTML = "";
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center", inline: "center" });
  await new Promise((resolve) => window.setTimeout(resolve, reduceMotion ? 0 : 180));
  const focus = document.createElement("div");
  focus.className = "gd-focus";
  root.appendChild(focus);
  const follower = document.createElement("div");
  follower.className = "gd-follower";
  root.appendChild(follower);
  const line = document.createElement("div");
  line.className = "gd-line";
  root.appendChild(line);
  const target = document.createElement("div");
  target.className = "gd-target";
  root.appendChild(target);
  const tip = document.createElement("div");
  tip.className = "gd-tip";
  tip.setAttribute("role", "status");
  tip.innerHTML = `
    <div class="gd-title"></div>
    <div class="gd-body"></div>
  `;
  const titleElement = tip.querySelector(".gd-title");
  const bodyElement = tip.querySelector(".gd-body");
  if (titleElement) {
    titleElement.textContent = title || "Go here";
  }
  if (bodyElement) {
    bodyElement.textContent = body || "";
  }
  root.appendChild(tip);
  const reposition = () => {
    const rect = element.getBoundingClientRect();
    const padding = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    focus.style.cssText = `top:${rect.top - padding}px;left:${rect.left - padding}px;width:${rect.width + 2 * padding}px;height:${rect.height + 2 * padding}px;`;
    const tipWidth = Math.min(280, viewportWidth - 24);
    const tipHeight = tip.offsetHeight || 96;
    let tipLeft = rect.right + 20;
    let tipTop = Math.max(8, Math.min(viewportHeight - tipHeight - 8, rect.top));
    if (tipLeft + tipWidth > viewportWidth - 8) {
      tipLeft = Math.max(8, Math.min(viewportWidth - tipWidth - 8, rect.left));
      tipTop = rect.bottom + tipHeight + 20 < viewportHeight ? rect.bottom + 18 : Math.max(8, rect.top - tipHeight - 18);
    }
    tip.style.left = `${tipLeft}px`;
    tip.style.top = `${tipTop}px`;
    const targetX = rect.left + Math.min(rect.width * 0.5, 30);
    const targetY = rect.top + Math.min(rect.height * 0.5, 30);
    const startX = lastPointer.x;
    const startY = lastPointer.y;
    follower.style.left = `${startX}px`;
    follower.style.top = `${startY}px`;
    target.style.left = `${targetX}px`;
    target.style.top = `${targetY}px`;
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);
    const length = Math.max(0, Math.hypot(dx, dy) - 18);
    line.style.left = `${startX}px`;
    line.style.top = `${startY}px`;
    line.style.width = `${length}px`;
    line.style.transform = `rotate(${angle}deg)`;
  };
  reposition();
  activeReposition = reposition;
  if (!listenersAttached) {
    window.addEventListener("resize", onReposition, true);
    window.addEventListener("scroll", onReposition, true);
    document.addEventListener("mousemove", onMouseMove, true);
    listenersAttached = true;
  }
}

// src/widget/llm.ts
var SYSTEM = `You are Guider, a navigation assistant embedded in a web app.
You receive: the app's site map JSON, the user's current route, a screenshot of the user's
current viewport, and the user's question.

Your job: return one grounded guidance target that the user can act on right now.

Strict rules:
- Use the screenshot to verify what is currently visible and the map to know what exists.
- Never invent UI or routes that are not supported by the map.
- Return exactly one best target, not a multi-step plan.
- If the answer is not supported by the map or the current screenshot, return confidence "low"
  and a fallbackMessage that clearly says you cannot verify it.

Output JSON shape:
{
  "summary": "short summary",
  "immediateSpeech": "one short sentence the assistant can say immediately",
  "target": {
    "title": "short imperative",
    "body": "one sentence explaining what to do",
    "selectors": [
      { "kind": "data-guider", "value": "..." },
      { "kind": "testid", "value": "..." },
      { "kind": "aria", "value": "..." },
      { "kind": "role-name", "role": "button", "name": "..." },
      { "kind": "text", "value": "...", "tag": "button" },
      { "kind": "css", "value": "..." }
    ],
    "visualHint": "describe the element visually",
    "expectedRoute": "route or null"
  },
  "routeIntent": "route or null",
  "confidence": "high"|"medium"|"low",
  "fallbackMessage": "string|null"
}`;
function compactMap(map, currentRoute) {
  const pages = Array.isArray(map == null ? void 0 : map.pages) ? map.pages : [];
  return {
    pages: pages.map((page) => {
      const isCurrent = page.route === currentRoute;
      return {
        route: page.route,
        purpose: page.purpose || null,
        categories: page.categories || [],
        ...isCurrent ? {
          summary: page.summary,
          interactive: page.interactive,
          visuals: page.visuals,
          modals: page.modals,
          dropdowns: page.dropdowns,
          conditions: page.conditions
        } : {
          interactiveCount: Array.isArray(page.interactive) ? page.interactive.length : 0,
          keyActions: Array.isArray(page.interactive) ? page.interactive.slice(0, 6).map((entry) => entry.label || entry.purpose || entry.tag) : []
        }
      };
    })
  };
}
function buildMessages({
  question,
  currentRoute,
  map,
  screenshotDataUrl
}) {
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
  if (!proxy && apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }
  const body = proxy ? { question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl } : {
    model,
    response_format: { type: "json_object" },
    messages: buildMessages({ question, currentRoute, map, screenshotDataUrl })
  };
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Guider plan failed (${response.status}): ${text.slice(0, 300)}`);
  }
  const data = await response.json();
  const content = proxy ? JSON.stringify(data) : ((_c = (_b = (_a = data.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) || "{}";
  try {
    return validateGuidance(JSON.parse(content), map);
  } catch {
    return emptyGuidance("I'm not sure where to point you. Try rephrasing.");
  }
}
async function streamPlanGuidance({
  question,
  currentRoute,
  map,
  screenshotDataUrl,
  proxyUrl,
  signal,
  onAck,
  onTarget
}) {
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify({ question, currentRoute, mapVersion: map == null ? void 0 : map.version, screenshotDataUrl }),
    signal
  });
  if (!response.ok || !response.body) {
    const text = await response.text().catch(() => "");
    throw new Error(`Guider stream failed (${response.status}): ${text.slice(0, 200)}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let guidance = emptyGuidance();
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let separatorIndex;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const raw = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);
      const event = parseSse(raw);
      if (!event) continue;
      if (event.event === "ack") {
        try {
          const payload = JSON.parse(event.data);
          onAck == null ? void 0 : onAck(payload.message || null);
        } catch {
          onAck == null ? void 0 : onAck(null);
        }
        continue;
      }
      if (event.event === "target") {
        try {
          const payload = JSON.parse(event.data);
          guidance = { ...guidance, ...validateGuidance(payload, map) };
          onTarget == null ? void 0 : onTarget(guidance.target);
        } catch {
          guidance = emptyGuidance("I'm not sure where to point you. Try rephrasing.");
        }
        continue;
      }
      if (event.event === "done") {
        try {
          const payload = JSON.parse(event.data);
          guidance = validateGuidance({ ...guidance, ...payload }, map);
        } catch {
          guidance = emptyGuidance("I'm not sure where to point you. Try rephrasing.");
        }
        continue;
      }
      if (event.event === "error") {
        throw new Error(event.data || "stream error");
      }
    }
  }
  return validateGuidance(guidance, map);
}
function parseSse(raw) {
  let event = "message";
  let data = "";
  for (const line of raw.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data += (data ? "\n" : "") + line.slice(5).trim();
  }
  return data ? { event, data } : null;
}
function validateGuidance(payload, map) {
  const parsed = payload && typeof payload === "object" ? payload : {};
  const target = parsed.target && isMapBackedTarget(parsed.target, map) ? normalizeTarget(parsed.target) : null;
  const routeIntent = typeof parsed.routeIntent === "string" ? parsed.routeIntent : null;
  const routeExists = !routeIntent || routeInMap(map, routeIntent);
  if (!target || !routeExists) {
    return emptyGuidance(parsed.fallbackMessage || "I can't verify that from the site map and current screen.");
  }
  return {
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    immediateSpeech: typeof parsed.immediateSpeech === "string" ? parsed.immediateSpeech : null,
    target,
    routeIntent,
    confidence: parsed.confidence === "high" || parsed.confidence === "medium" ? parsed.confidence : "medium",
    fallbackMessage: typeof parsed.fallbackMessage === "string" ? parsed.fallbackMessage : null
  };
}
function normalizeTarget(target) {
  if (!target.title || !Array.isArray(target.selectors) || target.selectors.length === 0) {
    return null;
  }
  return {
    title: target.title,
    body: typeof target.body === "string" ? target.body : "",
    selectors: target.selectors,
    visualHint: typeof target.visualHint === "string" ? target.visualHint : "",
    expectedRoute: typeof target.expectedRoute === "string" ? target.expectedRoute : null
  };
}
function emptyGuidance(fallbackMessage = "I can't verify that from the site map and current screen.") {
  return {
    summary: null,
    immediateSpeech: null,
    target: null,
    routeIntent: null,
    confidence: "low",
    fallbackMessage
  };
}
function isMapBackedTarget(target, map) {
  if (!Array.isArray(target.selectors) || target.selectors.length === 0) {
    return false;
  }
  const pages = Array.isArray(map == null ? void 0 : map.pages) ? map.pages : [];
  const interactiveEntries = pages.flatMap(
    (page) => Array.isArray(page.interactive) ? page.interactive : []
  );
  return target.selectors.some((selector) => matchesInteractive(selector, interactiveEntries));
}
function matchesInteractive(selector, entries) {
  if (typeof selector === "string") {
    return false;
  }
  return entries.some((entry) => {
    var _a;
    const label = String(entry.label || "").toLowerCase();
    const guiderId = String(entry.guiderId || "").toLowerCase();
    const testId = String(entry.testId || "").toLowerCase();
    const ariaLabel = String(((_a = entry.aria) == null ? void 0 : _a.label) || "").toLowerCase();
    switch (selector.kind) {
      case "data-guider":
        return guiderId && guiderId === String(selector.value || "").toLowerCase();
      case "testid":
        return testId && testId === String(selector.value || "").toLowerCase();
      case "aria":
        return ariaLabel && ariaLabel === String(selector.value || "").toLowerCase();
      case "text":
        return label.includes(String(selector.value || "").toLowerCase());
      case "role-name":
        return label.includes(String(selector.name || "").toLowerCase());
      default:
        return false;
    }
  });
}
function routeInMap(map, route) {
  const pages = Array.isArray(map == null ? void 0 : map.pages) ? map.pages : [];
  return pages.some((page) => page.route === route);
}

// src/widget/GuiderWidget.tsx
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
  const [phase, setPhase] = useState("idle");
  const [statusText, setStatusText] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeValue, setComposeValue] = useState("");
  const recorderRef = useRef(null);
  const liveRef = useRef(null);
  const abortRef = useRef(null);
  const speechRef = useRef(null);
  const statusTimerRef = useRef(null);
  const composeInputRef = useRef(null);
  const finishingVoiceRef = useRef(null);
  useEffect(() => {
    if (mapProp) {
      setMap(mapProp);
      return;
    }
    if (!mapUrl) return;
    let cancelled = false;
    fetch(mapUrl).then((response) => response.ok ? response.json() : null).then((json) => {
      if (!cancelled) {
        setMap(json);
      }
    }).catch(() => {
    });
    return () => {
      cancelled = true;
    };
  }, [mapProp, mapUrl]);
  const clearVoiceSession = useCallback(() => {
    recorderRef.current = null;
    finishingVoiceRef.current = null;
  }, []);
  useEffect(() => () => {
    var _a, _b;
    cleanup();
    (_a = abortRef.current) == null ? void 0 : _a.abort();
    void ((_b = recorderRef.current) == null ? void 0 : _b.stop("manual"));
    stopSpeaking();
    clearStatus(statusTimerRef);
  }, []);
  const route = currentRoute || (typeof window !== "undefined" ? window.location.pathname : "/");
  const resolvedWhisperUrl = whisperUrl || inferWhisperUrl(proxyUrl);
  const announce = useCallback((text, duration = 2400, shouldSpeak = speak) => {
    if (liveRef.current) {
      liveRef.current.textContent = "";
      window.setTimeout(() => {
        if (liveRef.current) {
          liveRef.current.textContent = text;
        }
      }, 30);
    }
    if (shouldSpeak) {
      speakText(text, speechRef);
    }
    flashStatus(text, duration, setStatusText, statusTimerRef);
  }, [speak]);
  const highlightTarget = useCallback(async (target) => {
    cleanup();
    if (!target) return;
    const found = findElement(target.selectors);
    if (!found) {
      announce(`I couldn't verify that on this screen. Look for ${target.visualHint || target.title}.`, 3200);
      return;
    }
    announce(
      [target.title, target.body, target.visualHint ? `Look for ${target.visualHint}.` : ""].filter(Boolean).join(" "),
      3200
    );
    await show({
      element: found.el,
      title: target.title,
      body: target.body,
      accent
    });
  }, [accent, announce]);
  const ask = useCallback(async (question) => {
    var _a;
    if (!question.trim()) return;
    setBusy(true);
    setPhase("guiding");
    setComposeOpen(false);
    setComposeValue("");
    cleanup();
    (_a = abortRef.current) == null ? void 0 : _a.abort();
    stopSpeaking();
    announce("Working on it.", 1200);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const screenshotDataUrl = await captureViewport();
      let guidance;
      if (proxyUrl) {
        guidance = await streamPlanGuidance({
          question,
          currentRoute: route,
          map,
          screenshotDataUrl,
          proxyUrl,
          signal: controller.signal,
          onAck: (message) => {
            if (message) {
              flashStatus(message, 1200, setStatusText, statusTimerRef);
            }
          },
          onTarget: (target) => {
            void highlightTarget(target);
          }
        });
      } else {
        guidance = await planGuidance({
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
      if (guidance.confidence === "low" || !guidance.target) {
        announce(guidance.fallbackMessage || "I'm not confident about where to point you.", 3200);
        return;
      }
      await highlightTarget(guidance.target);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        announce(`Sorry \u2014 ${String(error instanceof Error ? error.message : error)}`, 3600);
      }
    } finally {
      setBusy(false);
      setPhase("idle");
    }
  }, [apiKey, endpoint, highlightTarget, map, model, proxyUrl, route, announce]);
  const finishVoiceCapture = useCallback((reason) => {
    if (finishingVoiceRef.current) {
      return finishingVoiceRef.current;
    }
    const recorder = recorderRef.current;
    if (!recorder) {
      return Promise.resolve();
    }
    recorderRef.current = null;
    setPhase("transcribing");
    const task = (async () => {
      try {
        const capture = await recorder.stop(reason);
        if (!capture || shouldRejectCapture(capture)) {
          const message = (capture == null ? void 0 : capture.stopReason) === "no-speech" ? "I didn't hear anything. Try again." : "I didn't catch that clearly. Try again.";
          announce(message, 2200);
          return;
        }
        const text = resolvedWhisperUrl ? await transcribeViaProxy(capture.blob, resolvedWhisperUrl) : await transcribeWithWhisper(capture.blob, apiKey);
        const question = sanitizeTranscript(text);
        if (!question) {
          announce("I didn't catch that.", 2200);
          return;
        }
        await ask(question);
      } catch (error) {
        announce(`Voice error: ${String(error instanceof Error ? error.message : error)}.`, 3200);
      } finally {
        clearVoiceSession();
        if (!busy) {
          setPhase("idle");
        }
      }
    })();
    finishingVoiceRef.current = task;
    return task;
  }, [announce, apiKey, ask, busy, clearVoiceSession, resolvedWhisperUrl]);
  const onMicClick = useCallback(async () => {
    var _a;
    try {
      if (phase === "listening") {
        await finishVoiceCapture("manual");
        return;
      }
      cleanup();
      (_a = abortRef.current) == null ? void 0 : _a.abort();
      stopSpeaking();
      const recorder = new VoiceRecorder({
        onAutoStop: (reason) => {
          void finishVoiceCapture(reason);
        }
      });
      await recorder.start();
      recorderRef.current = recorder;
      setPhase("listening");
      clearStatus(statusTimerRef);
      setStatusText("Listening\u2026");
    } catch (error) {
      clearVoiceSession();
      setPhase("idle");
      announce(`Voice error: ${String(error instanceof Error ? error.message : error)}.`, 3200);
    }
  }, [announce, clearVoiceSession, finishVoiceCapture, phase]);
  const openComposer = useCallback((initialValue = "") => {
    setComposeValue(initialValue);
    setComposeOpen(true);
  }, []);
  const closeComposer = useCallback(() => {
    setComposeOpen(false);
    setComposeValue("");
  }, []);
  useEffect(() => {
    if (!composeOpen) return void 0;
    const timer = window.setTimeout(() => {
      var _a;
      return (_a = composeInputRef.current) == null ? void 0 : _a.focus();
    }, 30);
    return () => window.clearTimeout(timer);
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
        void onMicClick();
        return;
      }
      openComposer();
    };
    const onEscape = (event) => {
      if (event.key === "Escape") {
        closeComposer();
      }
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
    void ask(question);
  };
  const activeStatus = phase === "listening" ? "Listening\u2026" : phase === "transcribing" ? "Transcribing\u2026" : phase === "guiding" || busy ? "Working\u2026" : statusText;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(
      "div",
      {
        ref: liveRef,
        "aria-live": "polite",
        "aria-atomic": "true",
        style: {
          position: "absolute",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          width: 1,
          height: 1,
          overflow: "hidden",
          whiteSpace: "nowrap"
        }
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        "data-guider": "guider-launcher",
        onClick: () => {
          void onMicClick();
        },
        "aria-label": phase === "listening" ? "Stop Guider voice capture" : "Start Guider voice capture",
        "aria-pressed": phase === "listening",
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
          background: phase === "listening" ? accent : "rgba(17,17,17,0.92)",
          boxShadow: phase === "listening" ? `0 0 0 8px ${hexAlpha(accent, 0.18)}, 0 14px 36px ${hexAlpha(accent, 0.24)}` : "0 14px 36px rgba(15,23,42,0.18)",
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
              opacity: phase === "listening" ? 0.98 : 0.82
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
  const formData = new FormData();
  const extension = (blob.type.split("/")[1] || "webm").split(";")[0];
  formData.append("file", blob, `voice.${extension}`);
  const response = await fetch(url, { method: "POST", body: formData });
  if (!response.ok) throw new Error(`Whisper proxy failed (${response.status})`);
  const data = await response.json();
  return data.text || "";
}
function shouldRejectCapture(capture) {
  return !capture.hadSpeech || capture.durationMs < 500 || capture.peakLevel < 0.012;
}
function sanitizeTranscript(text) {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const lower = cleaned.toLowerCase();
  if (/^(um+|uh+|mm+|hmm+|ah+|er+)$/i.test(lower)) return "";
  const words = cleaned.split(" ").filter(Boolean);
  if (words.length === 1 && cleaned.length < 4) return "";
  return cleaned;
}
function hexAlpha(hex, alpha) {
  const match = /^#?([0-9a-f]{3,8})$/i.exec(hex || "");
  if (!match) return `rgba(48,128,255,${alpha})`;
  let value = match[1];
  if (value.length === 3) {
    value = value.split("").map((part) => part + part).join("");
  }
  const red = parseInt(value.slice(0, 2), 16);
  const green = parseInt(value.slice(2, 4), 16);
  const blue = parseInt(value.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
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
  timerRef.current = window.setTimeout(() => {
    setStatusText("");
    timerRef.current = null;
  }, duration);
}
function clearStatus(timerRef) {
  if (!timerRef.current) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}
function inferWhisperUrl(proxyUrl) {
  if (!proxyUrl) return void 0;
  return proxyUrl.replace(/\/api\/guider\/plan(?:\?.*)?$/, "/api/guider/transcribe");
}

// src/widget/context.tsx
import { createContext, useCallback as useCallback2, useContext, useState as useState2 } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var GuiderContext = createContext(null);
function GuiderProvider({ children, value }) {
  return /* @__PURE__ */ jsx2(GuiderContext.Provider, { value, children });
}
function useGuider() {
  return useContext(GuiderContext);
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

// src/agent/index.ts
var agentMode = {
  available: true,
  async run({
    plan,
    onProgress,
    signal,
    showHighlight = true
  }) {
    const progressHandler = onProgress ? (event) => onProgress(event) : void 0;
    return runPlan(plan, {
      onProgress: progressHandler,
      signal,
      showHighlight,
      highlight: highlight_exports
    });
  }
};
export {
  GuiderProvider,
  GuiderWidget,
  agentMode,
  useGuider
};
