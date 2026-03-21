const { getQuickJS } = require('quickjs-emscripten');
const { JSDOM } = require('jsdom');
const fs = require('fs');

const TEST_SITES = [
  { name: 'Hacker News', url: 'https://news.ycombinator.com', complexity: 'minimal' },
  { name: 'Lobsters', url: 'https://lobste.rs', complexity: 'minimal' },
  { name: 'Hacker News Item', url: 'https://news.ycombinator.com/item?id=42068545', complexity: 'minimal' },
  { name: 'Old Reddit', url: 'https://old.reddit.com/r/programming', complexity: 'low' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/JavaScript', complexity: 'low' },
  { name: 'SourceHut', url: 'https://sr.ht', complexity: 'minimal' },
  { name: 'Drew DeVault', url: 'https://drewdevault.com', complexity: 'minimal' },
  { name: 'Paul Graham', url: 'http://www.paulgraham.com', complexity: 'minimal' },
];

const results = {
  timestamp: new Date().toISOString(),
  sites: [],
  aggregatedProperties: new Map(),
};

function createProxySetupCode(baseUrl) {
  const baseHostname = new URL(baseUrl).hostname;
  const baseOrigin = new URL(baseUrl).origin;
  
  return `
var __accessedProps = [];
var __loggedProps = {};

function __logProp(path) {
  if (!__loggedProps[path]) {
    __loggedProps[path] = true;
    __accessedProps.push(path);
  }
}

function __createDummyFunction(path) {
  return function() {
    __logProp(path + '()');
    return __createDummyObject(path + '()');
  };
}

function __createDummyArray(path) {
  var arr = [];
  return new Proxy(arr, {
    get: function(target, prop, receiver) {
      if (prop === 'then') return undefined;
      if (prop === 'constructor') return undefined;
      if (typeof prop === 'symbol') return undefined;
      
      var fullPath = path + '.' + prop;
      __logProp(fullPath);
      
      if (prop === 'length') return 0;
      if (prop === 'item') return function(i) { __logProp(fullPath + '(' + i + ')'); return undefined; };
      if (prop === 'namedItem') return function(n) { __logProp(fullPath + '(' + n + ')'); return undefined; };
      if (!isNaN(parseInt(prop))) return undefined;
      
      return __createDummyFunction(fullPath);
    },
    set: function() { return true; },
    has: function() { return true; }
  });
}

function __createDummyObject(path) {
  var obj = {};
  return new Proxy(obj, {
    get: function(target, prop, receiver) {
      if (prop === 'then') return undefined;
      if (prop === 'constructor') return undefined;
      if (typeof prop === 'symbol') return undefined;
      
      var fullPath = path + '.' + prop;
      __logProp(fullPath);
      
      if (prop === 'length') return 0;
      if (prop === 'nodeType') return 1;
      if (prop === 'tagName' || prop === 'nodeName') return 'DIV';
      if (prop === 'textContent' || prop === 'innerHTML' || prop === 'outerHTML') return '';
      if (prop === 'className') return '';
      if (prop === 'id') return '';
      if (prop === 'value') return '';
      if (prop === 'checked' || prop === 'selected' || prop === 'disabled') return false;
      if (prop === 'href' || prop === 'src') return '';
      if (prop === 'dataset') return __createDummyObject(fullPath);
      if (prop === 'style') return __createDummyObject(fullPath);
      if (prop === 'classList') return __createDummyObject(fullPath);
      if (prop === 'children' || prop === 'childNodes') return __createDummyArray(fullPath);
      if (prop === 'firstChild' || prop === 'lastChild' || prop === 'nextSibling' || 
          prop === 'previousSibling' || prop === 'parentNode' || prop === 'parentElement') return null;
      if (prop === 'ownerDocument') return __document;
      if (prop === 'getAttribute') return function(n) { __logProp(fullPath + '(' + n + ')'); return null; };
      if (prop === 'setAttribute') return function() { __logProp(fullPath + '()'); };
      if (prop === 'hasAttribute') return function() { __logProp(fullPath + '()'); return false; };
      if (prop === 'removeAttribute') return function() { __logProp(fullPath + '()'); };
      if (prop === 'addEventListener') return function() { __logProp(fullPath + '()'); };
      if (prop === 'removeEventListener') return function() { __logProp(fullPath + '()'); };
      if (prop === 'appendChild') return function(c) { __logProp(fullPath + '()'); return c; };
      if (prop === 'removeChild') return function(c) { __logProp(fullPath + '()'); return c; };
      if (prop === 'insertBefore') return function() { __logProp(fullPath + '()'); };
      if (prop === 'cloneNode') return function() { __logProp(fullPath + '()'); return __createDummyObject(path); };
      if (prop === 'querySelector') return function(s) { __logProp(fullPath + '(' + s + ')'); return null; };
      if (prop === 'querySelectorAll') return function(s) { __logProp(fullPath + '(' + s + ')'); return __createDummyArray(fullPath); };
      if (prop === 'getElementsByClassName') return function(c) { __logProp(fullPath + '(' + c + ')'); return __createDummyArray(fullPath); };
      if (prop === 'getElementsByTagName') return function(t) { __logProp(fullPath + '(' + t + ')'); return __createDummyArray(fullPath); };
      if (prop === 'getElementById') return function(i) { __logProp(fullPath + '(' + i + ')'); return null; };
      if (prop === 'getBoundingClientRect') return function() { __logProp(fullPath + '()'); return {top:0,left:0,right:0,bottom:0,width:0,height:0,x:0,y:0}; };
      if (prop === 'getClientRects') return function() { __logProp(fullPath + '()'); return []; };
      if (prop === 'scrollIntoView') return function() { __logProp(fullPath + '()'); };
      if (prop === 'focus') return function() { __logProp(fullPath + '()'); };
      if (prop === 'blur') return function() { __logProp(fullPath + '()'); };
      if (prop === 'click') return function() { __logProp(fullPath + '()'); };
      if (prop === 'dispatchEvent') return function() { __logProp(fullPath + '()'); return true; };
      
      return __createDummyObject(fullPath);
    },
    set: function(target, prop, value) {
      __logProp(path + '.' + prop + ' [SET]');
      return true;
    },
    has: function() { return true; }
  });
}

var __locationObj = {
  href: '${baseUrl}',
  origin: '${baseOrigin}',
  protocol: '${new URL(baseUrl).protocol}',
  host: '${baseHostname}',
  hostname: '${baseHostname}',
  port: '',
  pathname: '${new URL(baseUrl).pathname || "/"}',
  search: '${new URL(baseUrl).search || ""}',
  hash: ''
};

var __location = new Proxy(__locationObj, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('location.' + prop);
    if (prop === 'reload') return function() { __logProp('location.reload()'); };
    if (prop === 'assign') return function() { __logProp('location.assign()'); };
    if (prop === 'replace') return function() { __logProp('location.replace()'); };
    if (prop === 'toString') return function() { return target.href; };
    return target[prop];
  },
  set: function(target, prop, value) {
    __logProp('location.' + prop + ' [SET]');
    return true;
  }
});

var __console = { log: function(){}, warn: function(){}, error: function(){}, info: function(){}, debug: function(){} };

var __storage = new Proxy({}, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('Storage.' + prop);
    if (prop === 'length') return 0;
    if (prop === 'getItem') return function(k) { __logProp('Storage.getItem(' + k + ')'); return null; };
    if (prop === 'setItem') return function(k,v) { __logProp('Storage.setItem(' + k + ')'); };
    if (prop === 'removeItem') return function(k) { __logProp('Storage.removeItem(' + k + ')'); };
    if (prop === 'clear') return function() { __logProp('Storage.clear()'); };
    if (prop === 'key') return function(i) { __logProp('Storage.key(' + i + ')'); return null; };
    return undefined;
  },
  set: function(target, prop, value) {
    __logProp('Storage[' + prop + '] [SET]');
    return true;
  }
});

var __navigator = new Proxy({
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  appName: 'Netscape',
  platform: 'Win32',
  cookieEnabled: true,
  language: 'en-US',
  languages: ['en-US'],
  hardwareConcurrency: 8,
  onLine: true
}, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('navigator.' + prop);
    return target[prop];
  }
});

var __history = new Proxy({ length: 1, state: null }, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('history.' + prop);
    if (prop === 'pushState') return function() { __logProp('history.pushState()'); };
    if (prop === 'replaceState') return function() { __logProp('history.replaceState()'); };
    if (prop === 'go') return function() { __logProp('history.go()'); };
    if (prop === 'back') return function() { __logProp('history.back()'); };
    if (prop === 'forward') return function() { __logProp('history.forward()'); };
    return target[prop];
  }
});

var __performance = new Proxy({}, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('performance.' + prop);
    if (prop === 'now') return function() { return Date.now(); };
    if (prop === 'timing') return __createDummyObject('performance.timing');
    if (prop === 'navigation') return __createDummyObject('performance.navigation');
    return __createDummyObject('performance.' + prop);
  }
});

var __document = new Proxy({}, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (prop === 'constructor') return undefined;
    if (typeof prop === 'symbol') return undefined;
    
    __logProp('document.' + prop);
    
    if (prop === 'location') return __location;
    if (prop === 'URL') return '${baseUrl}';
    if (prop === 'readyState') return 'complete';
    if (prop === 'domain') return '${baseHostname}';
    if (prop === 'cookie') return '';
    if (prop === 'title') return '';
    if (prop === 'hidden') return false;
    if (prop === 'visibilityState') return 'visible';
    if (prop === 'referrer') return '';
    if (prop === 'documentElement') return __createDummyObject('document.documentElement');
    if (prop === 'head') return __createDummyObject('document.head');
    if (prop === 'body') return __createDummyObject('document.body');
    if (prop === 'activeElement') return null;
    if (prop === 'currentScript') return null;
    if (prop === 'defaultView') return __window;
    if (prop === 'compatMode') return 'CSS1Compat';
    if (prop === 'characterSet') return 'UTF-8';
    if (prop === 'contentType') return 'text/html';
    if (prop === 'fonts') return __createDummyObject('document.fonts');
    if (prop === 'styleSheets') return __createDummyArray('document.styleSheets');
    if (prop === 'scripts') return __createDummyArray('document.scripts');
    if (prop === 'forms') return __createDummyArray('document.forms');
    if (prop === 'all') return __createDummyObject('document.all');
    
    if (prop === 'getElementById') return function(id) { __logProp('document.getElementById(' + id + ')'); return null; };
    if (prop === 'getElementsByClassName') return function(cls) { __logProp('document.getElementsByClassName(' + cls + ')'); return __createDummyArray('HTMLCollection'); };
    if (prop === 'getElementsByTagName') return function(tag) { __logProp('document.getElementsByTagName(' + tag + ')'); return __createDummyArray('HTMLCollection'); };
    if (prop === 'querySelector') return function(sel) { __logProp('document.querySelector(' + sel + ')'); return null; };
    if (prop === 'querySelectorAll') return function(sel) { __logProp('document.querySelectorAll(' + sel + ')'); return __createDummyArray('NodeList'); };
    if (prop === 'createElement') return function(tag) { __logProp('document.createElement(' + tag + ')'); return __createDummyObject('Element:' + tag); };
    if (prop === 'createElementNS') return function(ns, tag) { __logProp('document.createElementNS(' + tag + ')'); return __createDummyObject('Element:' + tag); };
    if (prop === 'createTextNode') return function(t) { __logProp('document.createTextNode'); return __createDummyObject('TextNode'); };
    if (prop === 'createDocumentFragment') return function() { __logProp('document.createDocumentFragment'); return __createDummyObject('DocumentFragment'); };
    if (prop === 'createComment') return function(t) { __logProp('document.createComment'); return __createDummyObject('Comment'); };
    if (prop === 'createRange') return function() { __logProp('document.createRange'); return __createDummyObject('Range'); };
    if (prop === 'addEventListener') return function(type, fn, opts) { __logProp('document.addEventListener(' + type + ')'); };
    if (prop === 'removeEventListener') return function(type, fn) { __logProp('document.removeEventListener(' + type + ')'); };
    if (prop === 'dispatchEvent') return function(evt) { __logProp('document.dispatchEvent'); return true; };
    if (prop === 'hasFocus') return function() { __logProp('document.hasFocus'); return true; };
    if (prop === 'write') return function() { __logProp('document.write'); };
    if (prop === 'writeln') return function() { __logProp('document.writeln'); };
    if (prop === 'open') return function() { __logProp('document.open'); };
    if (prop === 'close') return function() { __logProp('document.close'); };
    if (prop === 'execCommand') return function() { __logProp('document.execCommand'); return false; };
    if (prop === 'getSelection') return function() { __logProp('document.getSelection'); return __createDummyObject('Selection'); };
    if (prop === 'importNode') return function(n) { __logProp('document.importNode'); return n; };
    if (prop === 'adoptNode') return function(n) { __logProp('document.adoptNode'); return n; };
    
    return __createDummyObject('document.' + prop);
  },
  set: function(target, prop, value) {
    __logProp('document.' + prop + ' [SET]');
    return true;
  }
});

var __window = new Proxy({}, {
  get: function(target, prop) {
    if (prop === 'then') return undefined;
    if (prop === 'constructor') return undefined;
    if (typeof prop === 'symbol') return undefined;
    
    __logProp('window.' + prop);
    
    if (prop === 'window' || prop === 'self' || prop === 'top' || prop === 'parent' || prop === 'frames') return __window;
    if (prop === 'document') return __document;
    if (prop === 'location') return __location;
    if (prop === 'navigator') return __navigator;
    if (prop === 'history') return __history;
    if (prop === 'localStorage' || prop === 'sessionStorage') return __storage;
    if (prop === 'console') return __console;
    if (prop === 'performance') return __performance;
    if (prop === 'innerWidth' || prop === 'outerWidth') return 1920;
    if (prop === 'innerHeight' || prop === 'outerHeight') return 1080;
    if (prop === 'screenX' || prop === 'screenY' || prop === 'screenLeft' || prop === 'screenTop') return 0;
    if (prop === 'pageXOffset' || prop === 'pageYOffset' || prop === 'scrollX' || prop === 'scrollY') return 0;
    if (prop === 'devicePixelRatio') return 1;
    if (prop === 'length') return 0;
    if (prop === 'closed') return false;
    if (prop === 'name') return '';
    if (prop === 'origin') return '${baseOrigin}';
    if (prop === 'isSecureContext') return true;
    if (prop === 'crypto') return __createDummyObject('window.crypto');
    if (prop === 'screen') return __createDummyObject('window.screen');
    if (prop === 'visualViewport') return __createDummyObject('window.visualViewport');
    if (prop === 'customElements') return __createDummyObject('window.customElements');
    if (prop === 'trustedTypes') return __createDummyObject('window.trustedTypes');
    if (prop === 'outerHTML') return '';
    if (prop === 'frameElement') return null;
    if (prop === 'opener') return null;
    if (prop === 'Uint8Array') return Uint8Array;
    if (prop === 'ArrayBuffer') return ArrayBuffer;
    if (prop === 'DataView') return DataView;
    
    if (prop === 'setTimeout') return function(fn, delay) { __logProp('window.setTimeout'); return 1; };
    if (prop === 'setInterval') return function(fn, delay) { __logProp('window.setInterval'); return 1; };
    if (prop === 'clearTimeout') return function() { __logProp('window.clearTimeout'); };
    if (prop === 'clearInterval') return function() { __logProp('window.clearInterval'); };
    if (prop === 'requestAnimationFrame') return function(fn) { __logProp('window.requestAnimationFrame'); return 1; };
    if (prop === 'cancelAnimationFrame') return function() { __logProp('window.cancelAnimationFrame'); };
    if (prop === 'requestIdleCallback') return function(fn) { __logProp('window.requestIdleCallback'); return 1; };
    if (prop === 'cancelIdleCallback') return function() { __logProp('window.cancelIdleCallback'); };
    if (prop === 'addEventListener') return function(type, fn, opts) { __logProp('window.addEventListener(' + type + ')'); };
    if (prop === 'removeEventListener') return function(type, fn) { __logProp('window.removeEventListener(' + type + ')'); };
    if (prop === 'dispatchEvent') return function(evt) { __logProp('window.dispatchEvent'); return true; };
    if (prop === 'fetch') return function() { __logProp('window.fetch'); return Promise.resolve(__createDummyObject('Response')); };
    if (prop === 'alert') return function() { __logProp('window.alert'); };
    if (prop === 'confirm') return function() { __logProp('window.confirm'); return true; };
    if (prop === 'prompt') return function() { __logProp('window.prompt'); return null; };
    if (prop === 'open') return function() { __logProp('window.open'); return null; };
    if (prop === 'close') return function() { __logProp('window.close'); };
    if (prop === 'scrollTo' || prop === 'scrollBy' || prop === 'scroll') return function() { __logProp('window.' + prop); };
    if (prop === 'getComputedStyle') return function(el) { __logProp('window.getComputedStyle'); return __createDummyObject('CSSStyleDeclaration'); };
    if (prop === 'getSelection') return function() { __logProp('window.getSelection'); return __createDummyObject('Selection'); };
    if (prop === 'matchMedia') return function(q) { __logProp('window.matchMedia(' + q + ')'); return {matches: false, media: q}; };
    if (prop === 'atob') return function(s) { __logProp('window.atob'); return s; };
    if (prop === 'btoa') return function(s) { __logProp('window.btoa'); return s; };
    if (prop === 'postMessage') return function() { __logProp('window.postMessage'); };
    if (prop === 'blur' || prop === 'focus' || prop === 'print') return function() { __logProp('window.' + prop); };
    if (prop === 'queueMicrotask') return function(fn) { __logProp('window.queueMicrotask'); Promise.resolve().then(fn); };
    
    return __createDummyObject('window.' + prop);
  },
  set: function(target, prop, value) {
    __logProp('window.' + prop + ' [SET]');
    return true;
  }
});

globalThis.window = __window;
globalThis.document = __document;
globalThis.navigator = __navigator;
globalThis.location = __location;
globalThis.history = __history;
globalThis.localStorage = __storage;
globalThis.sessionStorage = __storage;
globalThis.self = __window;
globalThis.top = __window;
globalThis.parent = __window;
globalThis.console = __console;
globalThis.performance = __performance;

globalThis.Event = function Event(type, opts) {
  this.type = type;
  this.bubbles = opts && opts.bubbles || false;
  this.cancelable = opts && opts.cancelable || false;
  this.defaultPrevented = false;
  this.target = null;
  this.currentTarget = null;
  this.timeStamp = Date.now();
};
globalThis.Event.prototype.preventDefault = function() { this.defaultPrevented = true; };
globalThis.Event.prototype.stopPropagation = function() {};
globalThis.Event.prototype.stopImmediatePropagation = function() {};

globalThis.CustomEvent = function CustomEvent(type, opts) {
  globalThis.Event.call(this, type, opts);
  this.detail = opts && opts.detail || null;
};
globalThis.CustomEvent.prototype = Object.create(globalThis.Event.prototype);

globalThis.MouseEvent = function MouseEvent(type, opts) {
  globalThis.Event.call(this, type, opts);
  this.clientX = this.clientY = this.screenX = this.screenY = 0;
  this.button = 0;
  this.buttons = 0;
  this.ctrlKey = this.shiftKey = this.altKey = this.metaKey = false;
};
globalThis.MouseEvent.prototype = Object.create(globalThis.Event.prototype);

globalThis.KeyboardEvent = function KeyboardEvent(type, opts) {
  globalThis.Event.call(this, type, opts);
  this.key = '';
  this.code = '';
  this.keyCode = 0;
  this.which = 0;
  this.ctrlKey = this.shiftKey = this.altKey = this.metaKey = false;
};
globalThis.KeyboardEvent.prototype = Object.create(globalThis.Event.prototype);

globalThis.UIEvent = function UIEvent(type, opts) {
  globalThis.Event.call(this, type, opts);
  this.detail = 0;
  this.view = __window;
};
globalThis.UIEvent.prototype = Object.create(globalThis.Event.prototype);

globalThis.FocusEvent = function FocusEvent(type, opts) {
  globalThis.UIEvent.call(this, type, opts);
  this.relatedTarget = null;
};
globalThis.FocusEvent.prototype = Object.create(globalThis.UIEvent.prototype);

globalThis.PointerEvent = function PointerEvent(type, opts) {
  globalThis.MouseEvent.call(this, type, opts);
  this.pointerId = 0;
  this.pointerType = 'mouse';
};
globalThis.PointerEvent.prototype = Object.create(globalThis.MouseEvent.prototype);

globalThis.MutationObserver = function MutationObserver(fn) {};
globalThis.MutationObserver.prototype.observe = function() {};
globalThis.MutationObserver.prototype.disconnect = function() {};

globalThis.IntersectionObserver = function IntersectionObserver(fn) {};
globalThis.IntersectionObserver.prototype.observe = function() {};
globalThis.IntersectionObserver.prototype.unobserve = function() {};
globalThis.IntersectionObserver.prototype.disconnect = function() {};

globalThis.ResizeObserver = function ResizeObserver(fn) {};
globalThis.ResizeObserver.prototype.observe = function() {};
globalThis.ResizeObserver.prototype.disconnect = function() {};

globalThis.PerformanceObserver = function PerformanceObserver(fn) {};
globalThis.PerformanceObserver.prototype.observe = function() {};
globalThis.PerformanceObserver.prototype.disconnect = function() {};

globalThis.MutationRecord = function() {};
globalThis.Node = function() {};
globalThis.Node.ELEMENT_NODE = 1;
globalThis.Node.TEXT_NODE = 3;
globalThis.Node.COMMENT_NODE = 8;
globalThis.Node.DOCUMENT_NODE = 9;
globalThis.Node.DOCUMENT_FRAGMENT_NODE = 11;
globalThis.Element = function() {};
globalThis.HTMLElement = function() {};
globalThis.SVGElement = function() {};
globalThis.DocumentFragment = function() {};
globalThis.Text = function() {};
globalThis.Comment = function() {};
globalThis.DOMTokenList = function() {};
globalThis.NamedNodeMap = function() {};
globalThis.Attr = function() {};
globalThis.Range = function() {};
globalThis.Selection = function() {};
globalThis.DOMRect = function() { return {top:0,left:0,right:0,bottom:0,width:0,height:0,x:0,y:0}; };

globalThis.XMLHttpRequest = function() {};
globalThis.FormData = function() {};
globalThis.Headers = function() {};
globalThis.Request = function() {};
globalThis.Response = function() {};
globalThis.Blob = function() {};
globalThis.File = function() {};
globalThis.FileReader = function() {};
globalThis.URL = function(u) { this.href = u; };
globalThis.URLSearchParams = function() {};
globalThis.MessageChannel = function() { this.port1 = {}; this.port2 = {}; };
globalThis.BroadcastChannel = function(n) { this.name = n; };
globalThis.Image = function() {};
globalThis.Audio = function() {};
globalThis.Option = function() {};
globalThis.DOMException = function(m, n) { this.message = m; this.name = n; };

globalThis.atob = function(s) { return s; };
globalThis.btoa = function(s) { return s; };
globalThis.setTimeout = function(fn) { return 1; };
globalThis.setInterval = function(fn) { return 1; };
globalThis.clearTimeout = function() {};
globalThis.clearInterval = function() {};
globalThis.fetch = function() { return Promise.resolve({}); };
globalThis.requestAnimationFrame = function(fn) { return 1; };
globalThis.cancelAnimationFrame = function() {};
globalThis.queueMicrotask = function(fn) { Promise.resolve().then(fn); };
`;
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    }
  });
  return response.text();
}

function extractScripts(html, baseUrl) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const scripts = [];
  
  const scriptElements = document.querySelectorAll('script');
  
  for (let i = 0; i < scriptElements.length; i++) {
    const script = scriptElements[i];
    const src = script.src;
    const content = script.textContent;
    const scriptType = script.type || '';
    
    if (src) {
      try {
        const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
        scripts.push({ type: 'external', src: fullUrl, order: i, content: null, scriptType });
      } catch (e) {}
    } else if (content && content.trim()) {
      scripts.push({ type: 'inline', content, order: i, src: null, scriptType });
    }
  }
  
  return scripts;
}

async function fetchExternalScript(url) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' }
    });
    return response.text();
  } catch {
    return null;
  }
}

async function testSite(site, QuickJS) {
  const result = {
    name: site.name,
    url: site.url,
    complexity: site.complexity,
    success: false,
    htmlSize: 0,
    scriptsFound: 0,
    scriptsExecuted: 0,
    scriptsFailed: 0,
    scriptsSkipped: 0,
    propertiesAccessed: [],
    errors: [],
    executionTime: 0
  };
  
  const startTime = Date.now();
  
  try {
    console.log(`\n${'─'.repeat(50)}`);
    console.log(`Testing: ${site.name} (${site.complexity})`);
    
    const html = await fetchHtml(site.url);
    result.htmlSize = html.length;
    console.log(`  HTML: ${(html.length / 1024).toFixed(1)}KB`);
    
    const scripts = extractScripts(html, site.url);
    result.scriptsFound = scripts.length;
    console.log(`  Scripts: ${scripts.length}`);
    
    let fetched = 0;
    for (const script of scripts) {
      if (script.type === 'external') {
        const content = await fetchExternalScript(script.src);
        if (content) {
          script.content = content;
          fetched++;
        } else {
          result.scriptsSkipped++;
        }
      }
    }
    console.log(`  Fetched: ${fetched} external, skipped: ${result.scriptsSkipped}`);
    
    const vm = QuickJS.newContext();
    const proxySetupCode = createProxySetupCode(site.url);
    const setupResult = vm.evalCode(proxySetupCode, 'setup.js', { type: 'script' });
    
    if (setupResult.error) {
      const err = vm.dump(setupResult.error);
      result.errors.push(`Setup failed: ${err.message || JSON.stringify(err)}`);
      setupResult.error.dispose();
      vm.dispose();
      result.executionTime = Date.now() - startTime;
      return result;
    }
    setupResult.value.dispose();
    
    for (const script of scripts) {
      if (!script.content) continue;
      
      // Skip module scripts (QuickJS doesn't support ES modules well)
      if (script.scriptType === 'module') {
        result.scriptsSkipped++;
        continue;
      }
      
      try {
        const execResult = vm.evalCode(
          script.content,
          script.type === 'external' ? script.src : `inline-${script.order}.js`,
          { type: 'script' }
        );
        
        if (execResult.error) {
          const err = vm.dump(execResult.error);
          result.scriptsFailed++;
          const msg = err.message || String(err);
          if (result.errors.length < 5) {
            result.errors.push(msg.substring(0, 100));
          }
          execResult.error.dispose();
        } else {
          result.scriptsExecuted++;
          if (execResult.value) execResult.value.dispose();
        }
      } catch (e) {
        result.scriptsFailed++;
        if (result.errors.length < 5) {
          result.errors.push(e.message.substring(0, 100));
        }
      }
    }
    
    const accessedResult = vm.evalCode(`JSON.stringify(__accessedProps)`, 'get.js', { type: 'script' });
    if (!accessedResult.error && accessedResult.value) {
      const jsonStr = vm.dump(accessedResult.value);
      accessedResult.value.dispose();
      try {
        result.propertiesAccessed = JSON.parse(jsonStr);
      } catch {}
    } else if (accessedResult.error) {
      accessedResult.error.dispose();
    }
    
    vm.dispose();
    result.success = true;
    
  } catch (error) {
    result.errors.push(error.message);
  }
  
  result.executionTime = Date.now() - startTime;
  console.log(`  Result: ${result.scriptsExecuted} executed, ${result.scriptsFailed} failed, ${result.propertiesAccessed.length} props`);
  
  return result;
}

function generateReport(sites) {
  const allProps = new Map();
  
  for (const site of sites) {
    for (const prop of site.propertiesAccessed) {
      if (!allProps.has(prop)) {
        allProps.set(prop, { count: 0, sites: [] });
      }
      allProps.get(prop).count++;
      allProps.get(prop).sites.push(site.name);
    }
  }
  
  const sortedProps = [...allProps.entries()].sort((a, b) => b[1].count - a[1].count);
  
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' QUICKJS HEADLESS BROWSER - DOM API REQUIREMENTS SPEC '.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  console.log('\n## TEST RESULTS SUMMARY');
  console.log('─'.repeat(50));
  
  for (const site of sites) {
    const status = site.success ? '✓' : '✗';
    console.log(`${status} ${site.name.padEnd(20)} | ${site.complexity.padEnd(8)} | Scripts: ${site.scriptsExecuted}/${site.scriptsFound} | Props: ${site.propertiesAccessed.length}`);
  }
  
  console.log('\n## ALL ACCESSED PROPERTIES (by frequency)');
  console.log('─'.repeat(50));
  
  for (const [prop, data] of sortedProps) {
    const sitesList = data.sites.map(s => s.replace(/\s/g, '').substring(0, 8)).join(',');
    console.log(`[${data.count}] ${prop.padEnd(50)} (${sitesList})`);
  }
  
  // Categorize
  const categories = {
    'DOCUMENT_QUERY': [],
    'DOCUMENT_EVENTS': [],
    'DOCUMENT_PROPS': [],
    'WINDOW_METHODS': [],
    'WINDOW_PROPS': [],
    'ELEMENT_METHODS': [],
    'STORAGE': [],
    'NAVIGATOR': [],
    'LOCATION': [],
    'PERFORMANCE': [],
    'OTHER': []
  };
  
  for (const [prop, data] of sortedProps) {
    if (prop.includes('querySelector') || prop.includes('getElement') || prop.includes('getElements')) {
      categories.DOCUMENT_QUERY.push(prop);
    } else if (prop.includes('addEventListener') || prop.includes('removeEventListener') || prop.includes('dispatchEvent')) {
      if (prop.startsWith('document.')) categories.DOCUMENT_EVENTS.push(prop);
      else categories.WINDOW_METHODS.push(prop);
    } else if (prop.startsWith('document.')) {
      categories.DOCUMENT_PROPS.push(prop);
    } else if (prop.startsWith('window.') && prop.includes('(')) {
      categories.WINDOW_METHODS.push(prop);
    } else if (prop.startsWith('window.')) {
      categories.WINDOW_PROPS.push(prop);
    } else if (prop.startsWith('Element:') || prop.includes('.appendChild') || prop.includes('.setAttribute')) {
      categories.ELEMENT_METHODS.push(prop);
    } else if (prop.startsWith('Storage.')) {
      categories.STORAGE.push(prop);
    } else if (prop.startsWith('navigator.')) {
      categories.NAVIGATOR.push(prop);
    } else if (prop.startsWith('location.')) {
      categories.LOCATION.push(prop);
    } else if (prop.startsWith('performance.')) {
      categories.PERFORMANCE.push(prop);
    } else {
      categories.OTHER.push(prop);
    }
  }
  
  console.log('\n## CATEGORIZED API REQUIREMENTS');
  console.log('─'.repeat(50));
  
  for (const [cat, props] of Object.entries(categories)) {
    if (props.length > 0) {
      console.log(`\n### ${cat} (${props.length})`);
      props.forEach(p => console.log(`  • ${p}`));
    }
  }
  
  // Priority recommendations
  const highPriority = sortedProps.filter(([_, d]) => d.count >= 2);
  const mediumPriority = sortedProps.filter(([_, d]) => d.count === 1);
  
  console.log('\n## IMPLEMENTATION PRIORITY');
  console.log('─'.repeat(50));
  console.log(`\nTIER 1 - Required for basic sites (${highPriority.length} APIs):`);
  highPriority.slice(0, 10).forEach(([p, _]) => console.log(`  ✓ ${p}`));
  
  console.log(`\nTIER 2 - Extended support (${mediumPriority.length} APIs):`);
  mediumPriority.slice(0, 10).forEach(([p, _]) => console.log(`  ○ ${p}`));
  if (mediumPriority.length > 10) console.log(`  ... and ${mediumPriority.length - 10} more`);
  
  return {
    summary: {
      sitesTested: sites.length,
      sitesSuccessful: sites.filter(s => s.success).length,
      totalScripts: sites.reduce((a, s) => a + s.scriptsFound, 0),
      scriptsExecuted: sites.reduce((a, s) => a + s.scriptsExecuted, 0),
      totalUniqueProperties: allProps.size
    },
    properties: sortedProps.map(([p, d]) => ({ property: p, frequency: d.count, sites: d.sites })),
    highPriority: highPriority.map(([p]) => p),
    sites: sites
  };
}

async function main() {
  console.log('╔' + '═'.repeat(50) + '╗');
  console.log('║  QuickJS Headless Browser - API Analysis       ║');
  console.log('╚' + '═'.repeat(50) + '╝');
  
  const QuickJS = await getQuickJS();
  const sites = [];
  
  for (const site of TEST_SITES) {
    const result = await testSite(site, QuickJS);
    sites.push(result);
  }
  
  const report = generateReport(sites);
  
  fs.writeFileSync('/home/v1truv1us/hn-quickjs-harness/spec-report.json', JSON.stringify(report, null, 2));
  console.log('\n[✓] Detailed report saved to spec-report.json');
}

main().catch(console.error);
