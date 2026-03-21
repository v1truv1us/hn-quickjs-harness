const { getQuickJS } = require('quickjs-emscripten');
const { JSDOM } = require('jsdom');

const TEST_SITES = [
  { name: 'Hacker News', url: 'https://news.ycombinator.com', complexity: 'minimal' },
  { name: 'Lobsters', url: 'https://lobste.rs', complexity: 'minimal' },
  { name: 'Reddit (old)', url: 'https://old.reddit.com', complexity: 'low' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Main_Page', complexity: 'low' },
  { name: 'GitHub Trending', url: 'https://github.com/trending', complexity: 'medium' },
  { name: 'Hacker News Comments', url: 'https://news.ycombinator.com/item?id=1', complexity: 'low' },
];

const results = {
  timestamp: new Date().toISOString(),
  sites: [],
  aggregatedProperties: new Set(),
  propertyFrequency: {},
  errors: [],
};

function createProxySetupCode(baseUrl) {
  return `
var __accessedProps = [];
var __loggedProps = {};
var __currentScript = '';

function __logProp(path) {
  if (!__loggedProps[path]) {
    __loggedProps[path] = true;
    __accessedProps.push(path);
  }
}

function __createDummyFunction(path) {
  var fnPath = path;
  var fn = function() {
    __logProp(fnPath + '()');
    return __createDummyObject(fnPath + '()');
  };
  fn.toString = function() { return 'function() { [native code] }'; };
  return fn;
}

function __createDummyArray(path) {
  var arr = [];
  var handler = {
    get: function(target, prop, receiver) {
      if (prop === 'length') {
        __logProp(path + '.length');
        return 0;
      }
      if (prop === 'then') return undefined;
      if (prop === 'constructor') return undefined;
      if (typeof prop === 'symbol') return undefined;
      if (prop === 'map' || prop === 'forEach' || prop === 'filter' || prop === 'reduce' || 
          prop === 'push' || prop === 'pop' || prop === 'shift' || prop === 'slice' || 
          prop === 'splice' || prop === 'concat' || prop === 'join' || prop === 'indexOf' ||
          prop === 'find' || prop === 'findIndex' || prop === 'some' || prop === 'every' ||
          prop === 'includes' || prop === 'sort' || prop === 'reverse' || prop === 'fill' ||
          prop === 'entries' || prop === 'keys' || prop === 'values' || prop === 'flat' ||
          prop === 'flatMap' || prop === 'copyWithin' || prop === 'at') {
        __logProp(path + '.' + prop);
        return __createDummyFunction(path + '.' + prop);
      }
      if (!isNaN(parseInt(prop))) {
        __logProp(path + '[' + prop + ']');
        return undefined;
      }
      var fullPath = path + '.' + prop;
      __logProp(fullPath);
      return __createDummyObject(fullPath);
    },
    set: function(target, prop, value) {
      return true;
    },
    has: function(target, prop) {
      return true;
    },
    ownKeys: function(target) {
      return [];
    },
    getOwnPropertyDescriptor: function(target, prop) {
      return { enumerable: true, configurable: true };
    }
  };
  return new Proxy(arr, handler);
}

function __createDummyObject(path) {
  var obj = {};
  var handler = {
    get: function(target, prop, receiver) {
      if (prop === 'then') return undefined;
      if (prop === 'constructor') return undefined;
      if (typeof prop === 'symbol') return undefined;
      
      var fullPath = path ? path + '.' + prop : prop;
      __logProp(fullPath);
      
      if (prop === 'length') return 0;
      if (prop === 'nodeType') return 1;
      if (prop === 'tagName') return 'DIV';
      if (prop === 'nodeName') return 'DIV';
      if (prop === 'nodeValue') return null;
      if (prop === 'textContent') return '';
      if (prop === 'innerHTML') return '';
      if (prop === 'outerHTML') return '';
      if (prop === 'className') return '';
      if (prop === 'id') return '';
      if (prop === 'style') return __createDummyObject(fullPath);
      if (prop === 'classList') return __createDummyObject(fullPath);
      if (prop === 'attributes') return __createDummyObject(fullPath);
      if (prop === 'children') return __createDummyArray(fullPath);
      if (prop === 'childNodes') return __createDummyArray(fullPath);
      if (prop === 'firstChild') return null;
      if (prop === 'lastChild') return null;
      if (prop === 'nextSibling') return null;
      if (prop === 'previousSibling') return null;
      if (prop === 'parentNode') return null;
      if (prop === 'parentElement') return null;
      if (prop === 'ownerDocument') return globalThis.document;
      if (prop === 'value') return '';
      if (prop === 'checked') return false;
      if (prop === 'selected') return false;
      if (prop === 'disabled') return false;
      if (prop === 'readOnly') return false;
      if (prop === 'href') return '';
      if (prop === 'src') return '';
      if (prop === 'name') return '';
      if (prop === 'type') return '';
      if (prop === 'placeholder') return '';
      if (prop === 'alt') return '';
      if (prop === 'title') return '';
      if (prop === 'width') return 0;
      if (prop === 'height') return 0;
      if (prop === 'offsetWidth') return 0;
      if (prop === 'offsetHeight') return 0;
      if (prop === 'clientWidth') return 0;
      if (prop === 'clientHeight') return 0;
      if (prop === 'scrollWidth') return 0;
      if (prop === 'scrollHeight') return 0;
      if (prop === 'offsetLeft') return 0;
      if (prop === 'offsetTop') return 0;
      if (prop === 'scrollLeft') return 0;
      if (prop === 'scrollTop') return 0;
      if (prop === 'dataset') return __createDummyObject(fullPath);
      
      return __createDummyObject(fullPath);
    },
    set: function(target, prop, value) {
      var fullPath = path ? path + '.' + prop : prop;
      __logProp(fullPath + ' [SET]');
      return true;
    },
    has: function(target, prop) {
      return true;
    },
    ownKeys: function(target) {
      return [];
    },
    getOwnPropertyDescriptor: function(target, prop) {
      return { enumerable: true, configurable: true };
    }
  };
  return new Proxy(obj, handler);
}

var __documentMethodList = {
  getElementById: function(id) {
    __logProp('document.getElementById(' + id + ')');
    return null;
  },
  getElementsByTagName: function(tag) {
    __logProp('document.getElementsByTagName(' + tag + ')');
    return __createDummyArray('HTMLCollection');
  },
  getElementsByClassName: function(cls) {
    __logProp('document.getElementsByClassName(' + cls + ')');
    return __createDummyArray('HTMLCollection');
  },
  querySelector: function(sel) {
    __logProp('document.querySelector(' + sel + ')');
    return null;
  },
  querySelectorAll: function(sel) {
    __logProp('document.querySelectorAll(' + sel + ')');
    return __createDummyArray('NodeList');
  },
  createElement: function(tag) {
    __logProp('document.createElement(' + tag + ')');
    return __createDummyObject('Element:' + tag);
  },
  createElementNS: function(ns, tag) {
    __logProp('document.createElementNS(' + ns + ', ' + tag + ')');
    return __createDummyObject('Element:' + tag);
  },
  createTextNode: function(text) {
    __logProp('document.createTextNode');
    return __createDummyObject('TextNode');
  },
  createComment: function(text) {
    __logProp('document.createComment');
    return __createDummyObject('Comment');
  },
  createDocumentFragment: function() {
    __logProp('document.createDocumentFragment');
    return __createDummyObject('DocumentFragment');
  },
  createEvent: function(type) {
    __logProp('document.createEvent');
    return __createDummyObject('Event');
  },
  addEventListener: function(type, fn, opts) {
    __logProp('document.addEventListener(' + type + ')');
  },
  removeEventListener: function(type, fn) {
    __logProp('document.removeEventListener(' + type + ')');
  },
  dispatchEvent: function(evt) {
    __logProp('document.dispatchEvent');
    return true;
  },
  write: function() {
    __logProp('document.write');
  },
  writeln: function() {
    __logProp('document.writeln');
  },
  open: function() {
    __logProp('document.open');
  },
  close: function() {
    __logProp('document.close');
  },
  hasFocus: function() {
    __logProp('document.hasFocus');
    return true;
  },
  execCommand: function() {
    __logProp('document.execCommand');
    return false;
  },
  queryCommandEnabled: function() {
    __logProp('document.queryCommandEnabled');
    return false;
  },
  queryCommandSupported: function() {
    __logProp('document.queryCommandSupported');
    return false;
  },
  getSelection: function() {
    __logProp('document.getSelection');
    return __createDummyObject('Selection');
  },
  importNode: function(node, deep) {
    __logProp('document.importNode');
    return node;
  },
  adoptNode: function(node) {
    __logProp('document.adoptNode');
    return node;
  },
  createRange: function() {
    __logProp('document.createRange');
    return __createDummyObject('Range');
  },
  createTreeWalker: function() {
    __logProp('document.createTreeWalker');
    return __createDummyObject('TreeWalker');
  },
  createNodeIterator: function() {
    __logProp('document.createNodeIterator');
    return __createDummyObject('NodeIterator');
  },
  createExpression: function() {
    __logProp('document.createExpression');
    return __createDummyObject('XPathExpression');
  },
  evaluate: function() {
    __logProp('document.evaluate');
    return __createDummyObject('XPathResult');
  }
};

var __document = new Proxy({}, {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (prop === 'constructor') return undefined;
    if (typeof prop === 'symbol') return undefined;
    
    var fullPath = 'document.' + prop;
    __logProp(fullPath);
    
    if (__documentMethodList[prop]) {
      return __documentMethodList[prop];
    }
    
    if (prop === 'body') return __createDummyObject('document.body');
    if (prop === 'head') return __createDummyObject('document.head');
    if (prop === 'documentElement') return __createDummyObject('document.documentElement');
    if (prop === 'location') return __location;
    if (prop === 'cookie') return '';
    if (prop === 'title') return '';
    if (prop === 'URL') return '${baseUrl}';
    if (prop === 'documentURI') return '${baseUrl}';
    if (prop === 'readyState') return 'complete';
    if (prop === 'domain') return '${new URL(baseUrl).hostname}';
    if (prop === 'referrer') return '';
    if (prop === 'visibilityState') return 'visible';
    if (prop === 'hidden') return false;
    if (prop === 'activeElement') return __createDummyObject('document.activeElement');
    if (prop === 'styleSheets') return __createDummyArray('document.styleSheets');
    if (prop === 'scripts') return __createDummyArray('document.scripts');
    if (prop === 'forms') return __createDummyArray('document.forms');
    if (prop === 'links') return __createDummyArray('document.links');
    if (prop === 'images') return __createDummyArray('document.images');
    if (prop === 'anchors') return __createDummyArray('document.anchors');
    if (prop === 'applets') return __createDummyArray('document.applets');
    if (prop === 'embeds') return __createDummyArray('document.embeds');
    if (prop === 'plugins') return __createDummyArray('document.plugins');
    if (prop === 'all') return __createDummyObject('document.all');
    if (prop === 'doctype') return __createDummyObject('document.doctype');
    if (prop === 'implementation') return __createDummyObject('document.implementation');
    if (prop === 'compatMode') return 'CSS1Compat';
    if (prop === 'contentType') return 'text/html';
    if (prop === 'characterSet') return 'UTF-8';
    if (prop === 'inputEncoding') return 'UTF-8';
    if (prop === 'xmlEncoding') return 'UTF-8';
    if (prop === 'xmlVersion') return null;
    if (prop === 'xmlStandalone') return false;
    if (prop === 'defaultView') return globalThis.window;
    if (prop === 'currentScript') return null;
    if (prop === 'fullscreen') return false;
    if (prop === 'fullscreenEnabled') return true;
    if (prop === 'pictureInPictureEnabled') return true;
    if (prop === 'pointerLockElement') return null;
    if (prop === 'fullscreenElement') return null;
    if (prop === 'scrollingElement') return __createDummyObject('document.scrollingElement');
    if (prop === 'timeline') return __createDummyObject('document.timeline');
    if (prop === 'fonts') return __createDummyObject('document.fonts');
    if (prop === 'lastModified') return new Date().toUTCString();
    if (prop === 'origin') return '${new URL(baseUrl).origin}';
    
    return __createDummyObject(fullPath);
  },
  set: function(target, prop, value) {
    __logProp('document.' + prop + ' [SET]');
    return true;
  },
  has: function(target, prop) {
    return true;
  }
});

var __locationObj = {
  href: '${baseUrl}',
  origin: '${new URL(baseUrl).origin}',
  protocol: '${new URL(baseUrl).protocol}',
  host: '${new URL(baseUrl).host}',
  hostname: '${new URL(baseUrl).hostname}',
  port: '${new URL(baseUrl).port || ""}',
  pathname: '${new URL(baseUrl).pathname}',
  search: '${new URL(baseUrl).search}',
  hash: '${new URL(baseUrl).hash}',
  ancestorOrigins: []
};

var __location = new Proxy(__locationObj, {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('location.' + prop);
    if (prop === 'reload') return function() { __logProp('location.reload()'); };
    if (prop === 'assign') return function(url) { __logProp('location.assign()'); };
    if (prop === 'replace') return function(url) { __logProp('location.replace()'); };
    if (prop === 'toString') return function() { return target.href; };
    return target[prop];
  },
  set: function(target, prop, value) {
    __logProp('location.' + prop + ' [SET]');
    if (prop in target) target[prop] = value;
    return true;
  }
});

var __navigatorObj = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  appName: 'Netscape',
  appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  platform: 'Win32',
  vendor: 'Google Inc.',
  vendorSub: '',
  productSub: '20030107',
  cookieEnabled: true,
  onLine: true,
  language: 'en-US',
  languages: ['en-US', 'en'],
  hardwareConcurrency: 8,
  deviceMemory: 8,
  maxTouchPoints: 0,
  webdriver: false,
  appCodeName: 'Mozilla',
  product: 'Gecko',
  doNotTrack: null,
  pdfViewerEnabled: true,
  javaEnabled: function() { return false; }
};

var __navigator = new Proxy(__navigatorObj, {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('navigator.' + prop);
    if (prop === 'getBattery') return function() { __logProp('navigator.getBattery()'); return Promise.resolve(__createDummyObject('BatteryManager')); };
    if (prop === 'getGamepads') return function() { __logProp('navigator.getGamepads()'); return []; };
    if (prop === 'sendBeacon') return function() { __logProp('navigator.sendBeacon()'); return true; };
    if (prop === 'registerProtocolHandler') return function() { __logProp('navigator.registerProtocolHandler()'); };
    if (prop === 'vibrate') return function() { __logProp('navigator.vibrate()'); return false; };
    if (prop === 'permissions') return __createDummyObject('navigator.permissions');
    if (prop === 'geolocation') return __createDummyObject('navigator.geolocation');
    if (prop === 'mediaDevices') return __createDummyObject('navigator.mediaDevices');
    if (prop === 'clipboard') return __createDummyObject('navigator.clipboard');
    if (prop === 'credentials') return __createDummyObject('navigator.credentials');
    if (prop === 'serviceWorker') return __createDummyObject('navigator.serviceWorker');
    if (prop === 'connection') return __createDummyObject('navigator.connection');
    if (prop === 'mimeTypes') return __createDummyArray('navigator.mimeTypes');
    if (prop === 'plugins') return __createDummyArray('navigator.plugins');
    if (prop === 'storage') return __createDummyObject('navigator.storage');
    if (prop === 'userAgentData') return __createDummyObject('navigator.userAgentData');
    if (prop === 'keyboard') return __createDummyObject('navigator.keyboard');
    if (prop === 'locks') return __createDummyObject('navigator.locks');
    return target[prop];
  }
});

var __historyObj = {
  length: 1,
  state: null,
  scrollRestoration: 'auto'
};

var __history = new Proxy(__historyObj, {
  get: function(target, prop, receiver) {
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

var __storageHandler = {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('Storage.' + prop);
    if (prop === 'length') return 0;
    if (prop === 'getItem') return function(key) { __logProp('Storage.getItem(' + key + ')'); return null; };
    if (prop === 'setItem') return function(key, val) { __logProp('Storage.setItem(' + key + ')'); };
    if (prop === 'removeItem') return function(key) { __logProp('Storage.removeItem(' + key + ')'); };
    if (prop === 'clear') return function() { __logProp('Storage.clear()'); };
    if (prop === 'key') return function(idx) { __logProp('Storage.key(' + idx + ')'); return null; };
    return undefined;
  },
  set: function(target, prop, value) {
    __logProp('Storage[' + prop + '] [SET]');
    return true;
  },
  has: function(target, prop) {
    return true;
  }
};

var __localStorage = new Proxy({}, __storageHandler);
var __sessionStorage = new Proxy({}, __storageHandler);

var __console = {
  log: function() {},
  warn: function() {},
  error: function() {},
  info: function() {},
  debug: function() {},
  trace: function() {},
  dir: function() {},
  dirxml: function() {},
  table: function() {},
  group: function() {},
  groupCollapsed: function() {},
  groupEnd: function() {},
  clear: function() {},
  count: function() {},
  countReset: function() {},
  assert: function() {},
  profile: function() {},
  profileEnd: function() {},
  time: function() {},
  timeEnd: function() {},
  timeLog: function() {},
  timeStamp: function() {},
  exception: function() {}
};

var __windowMethods = {
  addEventListener: function(type, fn, opts) {
    __logProp('window.addEventListener(' + type + ')');
  },
  removeEventListener: function(type, fn) {
    __logProp('window.removeEventListener(' + type + ')');
  },
  dispatchEvent: function(evt) {
    __logProp('window.dispatchEvent');
    return true;
  },
  setTimeout: function(fn, delay) {
    __logProp('window.setTimeout');
    return Math.floor(Math.random() * 1000000) + 1;
  },
  setInterval: function(fn, delay) {
    __logProp('window.setInterval');
    return Math.floor(Math.random() * 1000000) + 1;
  },
  clearTimeout: function(id) {
    __logProp('window.clearTimeout');
  },
  clearInterval: function(id) {
    __logProp('window.clearInterval');
  },
  requestAnimationFrame: function(fn) {
    __logProp('window.requestAnimationFrame');
    return Math.floor(Math.random() * 1000000) + 1;
  },
  cancelAnimationFrame: function(id) {
    __logProp('window.cancelAnimationFrame');
  },
  requestIdleCallback: function(fn) {
    __logProp('window.requestIdleCallback');
    return Math.floor(Math.random() * 1000000) + 1;
  },
  cancelIdleCallback: function(id) {
    __logProp('window.cancelIdleCallback');
  },
  fetch: function(url, opts) {
    __logProp('window.fetch');
    return Promise.resolve(__createDummyObject('Response'));
  },
  alert: function(msg) {
    __logProp('window.alert');
  },
  confirm: function(msg) {
    __logProp('window.confirm');
    return true;
  },
  prompt: function(msg, def) {
    __logProp('window.prompt');
    return null;
  },
  open: function(url, name, opts) {
    __logProp('window.open');
    return null;
  },
  close: function() {
    __logProp('window.close');
  },
  scrollTo: function() {
    __logProp('window.scrollTo');
  },
  scrollBy: function() {
    __logProp('window.scrollBy');
  },
  scroll: function() {
    __logProp('window.scroll');
  },
  getComputedStyle: function(el, pseudo) {
    __logProp('window.getComputedStyle');
    var style = __createDummyObject('CSSStyleDeclaration');
    return style;
  },
  getSelection: function() {
    __logProp('window.getSelection');
    return __createDummyObject('Selection');
  },
  matchMedia: function(query) {
    __logProp('window.matchMedia(' + query + ')');
    return { 
      matches: false, 
      media: query, 
      addEventListener: function(){}, 
      removeEventListener: function(){},
      addListener: function(){},
      removeListener: function(){}
    };
  },
  atob: function(str) {
    __logProp('window.atob');
    try { return Buffer.from(str, 'base64').toString('binary'); } catch(e) { return str; }
  },
  btoa: function(str) {
    __logProp('window.btoa');
    try { return Buffer.from(str, 'binary').toString('base64'); } catch(e) { return str; }
  },
  postMessage: function(msg, origin) {
    __logProp('window.postMessage');
  },
  blur: function() {
    __logProp('window.blur');
  },
  focus: function() {
    __logProp('window.focus');
  },
  print: function() {
    __logProp('window.print');
  },
  stop: function() {
    __logProp('window.stop');
  },
  moveBy: function() {
    __logProp('window.moveBy');
  },
  moveTo: function() {
    __logProp('window.moveTo');
  },
  resizeBy: function() {
    __logProp('window.resizeBy');
  },
  resizeTo: function() {
    __logProp('window.resizeTo');
  }
};

var __window = new Proxy({}, {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (prop === 'constructor') return undefined;
    if (typeof prop === 'symbol') return undefined;
    
    var fullPath = 'window.' + prop;
    __logProp(fullPath);
    
    if (__windowMethods[prop]) {
      return __windowMethods[prop];
    }
    
    if (prop === 'document') return __document;
    if (prop === 'location') return __location;
    if (prop === 'navigator') return __navigator;
    if (prop === 'history') return __history;
    if (prop === 'localStorage') return __localStorage;
    if (prop === 'sessionStorage') return __sessionStorage;
    if (prop === 'console') return __console;
    if (prop === 'innerWidth') return 1920;
    if (prop === 'innerHeight') return 1080;
    if (prop === 'outerWidth') return 1920;
    if (prop === 'outerHeight') return 1080;
    if (prop === 'screenX') return 0;
    if (prop === 'screenY') return 0;
    if (prop === 'screenLeft') return 0;
    if (prop === 'screenTop') return 0;
    if (prop === 'pageXOffset') return 0;
    if (prop === 'pageYOffset') return 0;
    if (prop === 'scrollX') return 0;
    if (prop === 'scrollY') return 0;
    if (prop === 'devicePixelRatio') return 1;
    if (prop === 'screen') return __createDummyObject('window.screen');
    if (prop === 'performance') return __createDummyObject('window.performance');
    if (prop === 'crypto') return __createDummyObject('window.crypto');
    if (prop === 'self') return __window;
    if (prop === 'top') return __window;
    if (prop === 'parent') return __window;
    if (prop === 'window') return __window;
    if (prop === 'globalThis') return globalThis;
    if (prop === 'frames') return __createDummyObject('window.frames');
    if (prop === 'length') return 0;
    if (prop === 'closed') return false;
    if (prop === 'name') return '';
    if (prop === 'status') return '';
    if (prop === 'opener') return null;
    if (prop === 'frameElement') return null;
    if (prop === 'origin') return '${new URL(baseUrl).origin}';
    if (prop === 'isSecureContext') return true;
    if (prop === 'crossOriginIsolated') return false;
    if (prop === 'clientInformation') return __navigator;
    if (prop === 'defaultStatus') return '';
    if (prop === 'defaultstatus') return '';
    if (prop === 'event') return undefined;
    if (prop === 'external') return __createDummyObject('window.external');
    if (prop === 'customElements') return __createDummyObject('window.customElements');
    if (prop === 'speechSynthesis') return __createDummyObject('window.speechSynthesis');
    if (prop === 'visualViewport') return __createDummyObject('window.visualViewport');
    if (prop === 'orientation') return undefined;
    if (prop === 'trustedTypes') return __createDummyObject('window.trustedTypes');
    
    return __createDummyObject(fullPath);
  },
  set: function(target, prop, value) {
    __logProp('window.' + prop + ' [SET]');
    return true;
  },
  has: function(target, prop) {
    return true;
  }
});

globalThis.window = __window;
globalThis.document = __document;
globalThis.navigator = __navigator;
globalThis.location = __location;
globalThis.history = __history;
globalThis.localStorage = __localStorage;
globalThis.sessionStorage = __sessionStorage;
globalThis.self = __window;
globalThis.top = __window;
globalThis.parent = __window;
globalThis.frames = __window;
globalThis.console = __console;
globalThis.alert = __windowMethods.alert;
globalThis.confirm = __windowMethods.confirm;
globalThis.prompt = __windowMethods.prompt;
globalThis.setTimeout = __windowMethods.setTimeout;
globalThis.setInterval = __windowMethods.setInterval;
globalThis.clearTimeout = __windowMethods.clearTimeout;
globalThis.clearInterval = __windowMethods.clearInterval;
globalThis.requestAnimationFrame = __windowMethods.requestAnimationFrame;
globalThis.cancelAnimationFrame = __windowMethods.cancelAnimationFrame;
globalThis.fetch = __windowMethods.fetch;
globalThis.atob = __windowMethods.atob;
globalThis.btoa = __windowMethods.btoa;
globalThis.scrollTo = __windowMethods.scrollTo;
globalThis.scrollBy = __windowMethods.scrollBy;
globalThis.getComputedStyle = __windowMethods.getComputedStyle;
globalThis.getSelection = __windowMethods.getSelection;
globalThis.matchMedia = __windowMethods.matchMedia;
globalThis.postMessage = __windowMethods.postMessage;
globalThis.blur = __windowMethods.blur;
globalThis.focus = __windowMethods.focus;
globalThis.print = __windowMethods.print;

function Event(type, opts) {
  this.type = type;
  this.bubbles = opts && opts.bubbles !== undefined ? opts.bubbles : false;
  this.cancelable = opts && opts.cancelable !== undefined ? opts.cancelable : false;
  this.composed = opts && opts.composed !== undefined ? opts.composed : false;
  this.timeStamp = Date.now();
  this.defaultPrevented = false;
  this.isTrusted = false;
  this.target = null;
  this.currentTarget = null;
  this.eventPhase = 0;
}
Event.prototype.preventDefault = function() { this.defaultPrevented = true; };
Event.prototype.stopPropagation = function() {};
Event.prototype.stopImmediatePropagation = function() {};
Event.prototype.initEvent = function() {};
globalThis.Event = Event;

function CustomEvent(type, opts) {
  Event.call(this, type, opts);
  this.detail = opts && opts.detail !== undefined ? opts.detail : null;
}
CustomEvent.prototype = Object.create(Event.prototype);
globalThis.CustomEvent = CustomEvent;

function MouseEvent(type, opts) {
  Event.call(this, type, opts);
  this.screenX = 0;
  this.screenY = 0;
  this.clientX = 0;
  this.clientY = 0;
  this.ctrlKey = false;
  this.shiftKey = false;
  this.altKey = false;
  this.metaKey = false;
  this.button = 0;
  this.buttons = 0;
}
MouseEvent.prototype = Object.create(Event.prototype);
globalThis.MouseEvent = MouseEvent;

function KeyboardEvent(type, opts) {
  Event.call(this, type, opts);
  this.key = '';
  this.code = '';
  this.keyCode = 0;
  this.which = 0;
  this.ctrlKey = false;
  this.shiftKey = false;
  this.altKey = false;
  this.metaKey = false;
}
KeyboardEvent.prototype = Object.create(Event.prototype);
globalThis.KeyboardEvent = KeyboardEvent;

function UIEvent(type, opts) {
  Event.call(this, type, opts);
  this.detail = 0;
  this.view = __window;
}
UIEvent.prototype = Object.create(Event.prototype);
globalThis.UIEvent = UIEvent;

function FocusEvent(type, opts) {
  UIEvent.call(this, type, opts);
  this.relatedTarget = null;
}
FocusEvent.prototype = Object.create(UIEvent.prototype);
globalThis.FocusEvent = FocusEvent;

function PointerEvent(type, opts) {
  MouseEvent.call(this, type, opts);
  this.pointerId = 0;
  this.pointerType = 'mouse';
  this.isPrimary = true;
  this.pressure = 0;
  this.tangentialPressure = 0;
  this.tiltX = 0;
  this.tiltY = 0;
  this.twist = 0;
  this.width = 1;
  this.height = 1;
}
PointerEvent.prototype = Object.create(MouseEvent.prototype);
globalThis.PointerEvent = PointerEvent;

function TouchEvent(type, opts) {
  UIEvent.call(this, type, opts);
  this.touches = [];
  this.targetTouches = [];
  this.changedTouches = [];
}
TouchEvent.prototype = Object.create(UIEvent.prototype);
globalThis.TouchEvent = TouchEvent;

function Touch() {}
globalThis.Touch = Touch;

function MutationObserver(fn) {
  this._callback = fn;
}
MutationObserver.prototype.observe = function() { __logProp('MutationObserver.observe'); };
MutationObserver.prototype.disconnect = function() { __logProp('MutationObserver.disconnect'); };
MutationObserver.prototype.takeRecords = function() { __logProp('MutationObserver.takeRecords'); return []; };
globalThis.MutationObserver = MutationObserver;

function IntersectionObserver(fn, opts) {
  this._callback = fn;
}
IntersectionObserver.prototype.observe = function() { __logProp('IntersectionObserver.observe'); };
IntersectionObserver.prototype.unobserve = function() { __logProp('IntersectionObserver.unobserve'); };
IntersectionObserver.prototype.disconnect = function() { __logProp('IntersectionObserver.disconnect'); };
globalThis.IntersectionObserver = IntersectionObserver;

function ResizeObserver(fn) {
  this._callback = fn;
}
ResizeObserver.prototype.observe = function() { __logProp('ResizeObserver.observe'); };
ResizeObserver.prototype.unobserve = function() { __logProp('ResizeObserver.unobserve'); };
ResizeObserver.prototype.disconnect = function() { __logProp('ResizeObserver.disconnect'); };
globalThis.ResizeObserver = ResizeObserver;

function PerformanceObserver(fn) {
  this._callback = fn;
}
PerformanceObserver.prototype.observe = function() { __logProp('PerformanceObserver.observe'); };
PerformanceObserver.prototype.disconnect = function() { __logProp('PerformanceObserver.disconnect'); };
globalThis.PerformanceObserver = PerformanceObserver;

function ReportingObserver(fn) {
  this._callback = fn;
}
ReportingObserver.prototype.observe = function() {};
ReportingObserver.prototype.disconnect = function() {};
globalThis.ReportingObserver = ReportingObserver;

function MessageChannel() {
  this.port1 = __createDummyObject('MessagePort');
  this.port2 = __createDummyObject('MessagePort');
}
globalThis.MessageChannel = MessageChannel;

function BroadcastChannel(name) {
  this.name = name;
}
BroadcastChannel.prototype.postMessage = function() {};
BroadcastChannel.prototype.close = function() {};
BroadcastChannel.prototype.addEventListener = function() {};
BroadcastChannel.prototype.removeEventListener = function() {};
globalThis.BroadcastChannel = BroadcastChannel;

function Image() {
  return __createDummyObject('Image');
}
globalThis.Image = Image;

function Audio() {
  return __createDummyObject('Audio');
}
globalThis.Audio = Audio;

function Option(text, value, defaultSelected, selected) {
  return __createDummyObject('Option');
}
globalThis.Option = Option;

function XMLHttpRequest() {
  var xhr = __createDummyObject('XMLHttpRequest');
  return xhr;
}
XMLHttpRequest.UNSENT = 0;
XMLHttpRequest.OPENED = 1;
XMLHttpRequest.HEADERS_RECEIVED = 2;
XMLHttpRequest.LOADING = 3;
XMLHttpRequest.DONE = 4;
globalThis.XMLHttpRequest = XMLHttpRequest;

function FormData() {
  return __createDummyObject('FormData');
}
globalThis.FormData = FormData;

function Headers() {
  return __createDummyObject('Headers');
}
globalThis.Headers = Headers;

function Request(url, opts) {
  return __createDummyObject('Request');
}
globalThis.Request = Request;

function Response(body, opts) {
  return __createDummyObject('Response');
}
globalThis.Response = Response;

function URL(url, base) {
  try {
    var parsed = new (typeof globalThis !== 'undefined' && globalThis.URL ? globalThis.URL : Object)(url, base);
    this.href = parsed.href || url;
    this.origin = parsed.origin || '';
    this.protocol = parsed.protocol || '';
    this.host = parsed.host || '';
    this.hostname = parsed.hostname || '';
    this.port = parsed.port || '';
    this.pathname = parsed.pathname || '';
    this.search = parsed.search || '';
    this.hash = parsed.hash || '';
  } catch(e) {
    this.href = url;
    this.origin = '';
    this.protocol = '';
    this.host = '';
    this.hostname = '';
    this.port = '';
    this.pathname = url;
    this.search = '';
    this.hash = '';
  }
}
globalThis.URL = URL;

function URLSearchParams(init) {
  this._params = [];
}
URLSearchParams.prototype.append = function() {};
URLSearchParams.prototype.delete = function() {};
URLSearchParams.prototype.get = function() { return null; };
URLSearchParams.prototype.getAll = function() { return []; };
URLSearchParams.prototype.has = function() { return false; };
URLSearchParams.prototype.set = function() {};
URLSearchParams.prototype.toString = function() { return ''; };
globalThis.URLSearchParams = URLSearchParams;

function Blob(parts, opts) {}
Blob.prototype.size = 0;
Blob.prototype.type = '';
Blob.prototype.slice = function() { return new Blob(); };
Blob.prototype.text = function() { return Promise.resolve(''); };
Blob.prototype.arrayBuffer = function() { return Promise.resolve(new ArrayBuffer()); };
globalThis.Blob = Blob;

function File(parts, name, opts) {
  Blob.call(this, parts, opts);
  this.name = name;
}
File.prototype = Object.create(Blob.prototype);
globalThis.File = File;

function FileReader() {}
FileReader.prototype.readAsText = function() {};
FileReader.prototype.readAsDataURL = function() {};
FileReader.prototype.readAsArrayBuffer = function() {};
globalThis.FileReader = FileReader;

function ArrayBuffer(length) {
  this.byteLength = length;
}
globalThis.ArrayBuffer = ArrayBuffer;

function DataView() {}
globalThis.DataView = DataView;

function Uint8Array() {}
function Uint8ClampedArray() {}
function Uint16Array() {}
function Uint32Array() {}
function Int8Array() {}
function Int16Array() {}
function Int32Array() {}
function Float32Array() {}
function Float64Array() {}
function BigInt64Array() {}
function BigUint64Array() {}
globalThis.Uint8Array = Uint8Array;
globalThis.Uint8ClampedArray = Uint8ClampedArray;
globalThis.Uint16Array = Uint16Array;
globalThis.Uint32Array = Uint32Array;
globalThis.Int8Array = Int8Array;
globalThis.Int16Array = Int16Array;
globalThis.Int32Array = Int32Array;
globalThis.Float32Array = Float32Array;
globalThis.Float64Array = Float64Array;
globalThis.BigInt64Array = BigInt64Array;
globalThis.BigUint64Array = BigUint64Array;

globalThis.Object = Object;
globalThis.Array = Array;
globalThis.String = String;
globalThis.Number = Number;
globalThis.Boolean = Boolean;
globalThis.Function = Function;
globalThis.Symbol = Symbol;
globalThis.Map = Map;
globalThis.Set = Set;
globalThis.WeakMap = WeakMap;
globalThis.WeakSet = WeakSet;
globalThis.Date = Date;
globalThis.RegExp = RegExp;
globalThis.Error = Error;
globalThis.TypeError = TypeError;
globalThis.RangeError = RangeError;
globalThis.SyntaxError = SyntaxError;
globalThis.URIError = URIError;
globalThis.EvalError = EvalError;
globalThis.ReferenceError = ReferenceError;
globalThis.JSON = JSON;
globalThis.Math = Math;
globalThis.parseInt = parseInt;
globalThis.parseFloat = parseFloat;
globalThis.isNaN = isNaN;
globalThis.isFinite = isFinite;
globalThis.encodeURI = encodeURI;
globalThis.decodeURI = decodeURI;
globalThis.encodeURIComponent = encodeURIComponent;
globalThis.decodeURIComponent = decodeURIComponent;
globalThis.escape = escape;
globalThis.unescape = unescape;
globalThis.eval = eval;
globalThis.Promise = Promise;
globalThis.Proxy = Proxy;
globalThis.Reflect = Reflect;
globalThis.BigInt = BigInt;

function DOMException(message, name) {
  this.message = message;
  this.name = name || 'Error';
}
globalThis.DOMException = DOMException;

function DOMTokenList() {}
DOMTokenList.prototype.add = function() {};
DOMTokenList.prototype.remove = function() {};
DOMTokenList.prototype.toggle = function() { return false; };
DOMTokenList.prototype.contains = function() { return false; };
DOMTokenList.prototype.item = function() { return null; };
globalThis.DOMTokenList = DOMTokenList;

function NodeList() {}
NodeList.prototype.item = function() { return null; };
NodeList.prototype.entries = function() { return []; };
NodeList.prototype.forEach = function() {};
globalThis.NodeList = NodeList;

function HTMLCollection() {}
HTMLCollection.prototype.item = function() { return null; };
HTMLCollection.prototype.namedItem = function() { return null; };
globalThis.HTMLCollection = HTMLCollection;

function CharacterData() {}
globalThis.CharacterData = CharacterData;

function Text() {}
globalThis.Text = Text;

function Comment() {}
globalThis.Comment = Comment;

function DocumentFragment() {}
globalThis.DocumentFragment = DocumentFragment;

function DocumentType() {}
globalThis.DocumentType = DocumentType;

function Attr() {}
globalThis.Attr = Attr;

function Element() {}
globalThis.Element = Element;

function HTMLElement() {}
globalThis.HTMLElement = HTMLElement;

function SVGElement() {}
globalThis.SVGElement = SVGElement;

function MathMLElement() {}
globalThis.MathMLElement = MathMLElement;

function Node() {
  this.ELEMENT_NODE = 1;
  this.TEXT_NODE = 3;
  this.COMMENT_NODE = 8;
  this.DOCUMENT_NODE = 9;
  this.DOCUMENT_FRAGMENT_NODE = 11;
}
globalThis.Node = Node;

function CSSStyleDeclaration() {}
globalThis.CSSStyleDeclaration = CSSStyleDeclaration;

function Screen() {}
globalThis.Screen = Screen;

function Storage() {}
globalThis.Storage = Storage;

function Performance() {}
globalThis.Performance = Performance;

function Crypto() {}
Crypto.prototype.getRandomValues = function(arr) { return arr; };
Crypto.prototype.subtle = {};
globalThis.Crypto = Crypto;

globalThis.crypto = new Crypto();
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
      const fullUrl = src.startsWith('http') ? src : new URL(src, baseUrl).href;
      scripts.push({
        type: 'external',
        src: fullUrl,
        order: i,
        content: null,
        scriptType: scriptType
      });
    } else if (content && content.trim()) {
      scripts.push({
        type: 'inline',
        content: content,
        order: i,
        src: null,
        scriptType: scriptType
      });
    }
  }
  
  return scripts;
}

async function fetchExternalScript(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*'
      }
    });
    return response.text();
  } catch (error) {
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
    propertiesAccessed: [],
    errors: [],
    executionTime: 0
  };
  
  const startTime = Date.now();
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${site.name} (${site.complexity})`);
    console.log(`URL: ${site.url}`);
    console.log('='.repeat(60));
    
    // Fetch HTML
    console.log('  [1/5] Fetching HTML...');
    const html = await fetchHtml(site.url);
    result.htmlSize = html.length;
    console.log(`        Fetched ${html.length} bytes`);
    
    // Extract scripts
    console.log('  [2/5] Extracting scripts...');
    const scripts = extractScripts(html, site.url);
    result.scriptsFound = scripts.length;
    console.log(`        Found ${scripts.length} script tags`);
    
    // Fetch external scripts
    console.log('  [3/5] Fetching external scripts...');
    let fetched = 0;
    for (const script of scripts) {
      if (script.type === 'external') {
        const content = await fetchExternalScript(script.src);
        if (content) {
          script.content = content;
          fetched++;
          console.log(`        Fetched: ${script.src.substring(0, 60)}...`);
        } else {
          result.errors.push(`Failed to fetch: ${script.src}`);
        }
      }
    }
    console.log(`        Fetched ${fetched} external scripts`);
    
    // Initialize QuickJS
    console.log('  [4/5] Initializing QuickJS and executing scripts...');
    const vm = QuickJS.newContext();
    
    // Setup mock environment
    const proxySetupCode = createProxySetupCode(site.url);
    const setupResult = vm.evalCode(proxySetupCode, 'proxy-setup.js', { type: 'script' });
    
    if (setupResult.error) {
      const errorObj = vm.dump(setupResult.error);
      result.errors.push(`Proxy setup failed: ${errorObj.message || JSON.stringify(errorObj)}`);
      setupResult.error.dispose();
      vm.dispose();
      result.executionTime = Date.now() - startTime;
      return result;
    }
    setupResult.value.dispose();
    
    // Execute scripts
    for (const script of scripts) {
      if (!script.content) continue;
      
      const label = script.type === 'external' ? script.src : `inline #${script.order}`;
      
      try {
        const isModule = script.scriptType === 'module';
        const execResult = vm.evalCode(
          script.content,
          script.type === 'external' ? script.src : `inline-${script.order}.js`,
          { type: isModule ? 'module' : 'script' }
        );
        
        if (execResult.error) {
          const errorObj = vm.dump(execResult.error);
          result.scriptsFailed++;
          result.errors.push(`${label.substring(0, 50)}: ${errorObj.message || errorObj}`);
          execResult.error.dispose();
        } else {
          result.scriptsExecuted++;
          if (execResult.value) execResult.value.dispose();
        }
      } catch (e) {
        result.scriptsFailed++;
        result.errors.push(`${label.substring(0, 50)}: Exception - ${e.message}`);
      }
    }
    
    // Extract accessed properties
    console.log('  [5/5] Extracting accessed properties...');
    const getAccessedCode = `JSON.stringify(__accessedProps)`;
    const accessedResult = vm.evalCode(getAccessedCode, 'get-accessed.js', { type: 'script' });
    
    if (!accessedResult.error && accessedResult.value) {
      const jsonStr = vm.dump(accessedResult.value);
      accessedResult.value.dispose();
      try {
        result.propertiesAccessed = JSON.parse(jsonStr);
      } catch (e) {}
    } else if (accessedResult.error) {
      accessedResult.error.dispose();
    }
    
    vm.dispose();
    result.success = true;
    
  } catch (error) {
    result.errors.push(`Site error: ${error.message}`);
  }
  
  result.executionTime = Date.now() - startTime;
  return result;
}

function generateReport(results) {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' QUICKJS DOM API REQUIREMENTS SPEC - DETAILED ANALYSIS '.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  // Aggregate all properties
  const allProps = new Map();
  for (const site of results.sites) {
    for (const prop of site.propertiesAccessed) {
      if (!allProps.has(prop)) {
        allProps.set(prop, { count: 0, sites: [] });
      }
      allProps.get(prop).count++;
      allProps.get(prop).sites.push(site.name);
    }
  }
  
  // Sort by frequency
  const sortedProps = [...allProps.entries()].sort((a, b) => b[1].count - a[1].count);
  
  console.log('\n## SUMMARY');
  console.log('-'.repeat(40));
  console.log(`Sites tested: ${results.sites.length}`);
  console.log(`Sites successful: ${results.sites.filter(s => s.success).length}`);
  console.log(`Total unique properties accessed: ${allProps.size}`);
  
  console.log('\n## SITES TESTED');
  console.log('-'.repeat(40));
  for (const site of results.sites) {
    const status = site.success ? '✓' : '✗';
    console.log(`${status} ${site.name} (${site.complexity})`);
    console.log(`    HTML: ${(site.htmlSize / 1024).toFixed(1)}KB, Scripts: ${site.scriptsFound} (${site.scriptsExecuted} executed, ${site.scriptsFailed} failed)`);
    console.log(`    Properties accessed: ${site.propertiesAccessed.length}`);
  }
  
  console.log('\n## ALL ACCESSED PROPERTIES (sorted by frequency)');
  console.log('-'.repeat(40));
  for (const [prop, data] of sortedProps) {
    console.log(`[${data.count.toString().padStart(2)}] ${prop}`);
  }
  
  // Categorize properties
  console.log('\n## CATEGORIZED REQUIREMENTS');
  console.log('-'.repeat(40));
  
  const categories = {
    'document.query': [],
    'document.event': [],
    'document.property': [],
    'window.event': [],
    'window.method': [],
    'window.property': [],
    'navigator': [],
    'location': [],
    'storage': [],
    'element': [],
    'DOM API': [],
    'other': []
  };
  
  for (const [prop, data] of sortedProps) {
    if (prop.startsWith('document.querySelector') || prop.startsWith('document.getElement') || 
        prop.startsWith('document.getElementsBy')) {
      categories['document.query'].push(prop);
    } else if (prop.startsWith('document.addEventListener') || prop.startsWith('document.removeEventListener')) {
      categories['document.event'].push(prop);
    } else if (prop.startsWith('document.')) {
      categories['document.property'].push(prop);
    } else if (prop.startsWith('window.addEventListener') || prop.startsWith('window.removeEventListener')) {
      categories['window.event'].push(prop);
    } else if (prop.startsWith('window.') && prop.includes('(')) {
      categories['window.method'].push(prop);
    } else if (prop.startsWith('window.')) {
      categories['window.property'].push(prop);
    } else if (prop.startsWith('navigator.')) {
      categories['navigator'].push(prop);
    } else if (prop.startsWith('location.')) {
      categories['location'].push(prop);
    } else if (prop.startsWith('Storage.')) {
      categories['storage'].push(prop);
    } else if (prop.startsWith('Element:') || prop.startsWith('HTMLElement:') || 
               prop.startsWith('CSSStyleDeclaration') || prop.includes('.style')) {
      categories['element'].push(prop);
    } else if (prop.includes('Node') || prop.includes('Element') || prop.includes('Event')) {
      categories['DOM API'].push(prop);
    } else {
      categories['other'].push(prop);
    }
  }
  
  for (const [category, props] of Object.entries(categories)) {
    if (props.length > 0) {
      console.log(`\n### ${category.toUpperCase()} (${props.length} properties)`);
      for (const prop of props) {
        const data = allProps.get(prop);
        console.log(`  [${data.count}] ${prop}`);
      }
    }
  }
  
  // Priority recommendations
  console.log('\n## MVP PRIORITY RECOMMENDATIONS');
  console.log('-'.repeat(40));
  
  const highPriority = sortedProps.filter(([_, d]) => d.count >= 2).map(([p, _]) => p);
  const mediumPriority = sortedProps.filter(([_, d]) => d.count === 1).map(([p, _]) => p);
  
  console.log(`\nHIGH PRIORITY (used by 2+ sites): ${highPriority.length}`);
  for (const prop of highPriority.slice(0, 20)) {
    console.log(`  • ${prop}`);
  }
  if (highPriority.length > 20) {
    console.log(`  ... and ${highPriority.length - 20} more`);
  }
  
  console.log(`\nMEDIUM PRIORITY (used by 1 site): ${mediumPriority.length}`);
  console.log(`  (See full list above)`);
  
  return {
    summary: {
      sitesTested: results.sites.length,
      sitesSuccessful: results.sites.filter(s => s.success).length,
      totalUniqueProperties: allProps.size,
      highPriorityCount: highPriority.length,
      mediumPriorityCount: mediumPriority.length
    },
    allProperties: sortedProps.map(([prop, data]) => ({
      property: prop,
      frequency: data.count,
      sites: data.sites
    })),
    highPriority,
    mediumPriority,
    siteResults: results.sites
  };
}

async function main() {
  console.log('╔' + '═'.repeat(60) + '╗');
  console.log('║  QuickJS DOM API Requirements Analysis                  ║');
  console.log('║  Testing progressively complex websites                 ║');
  console.log('╚' + '═'.repeat(60) + '╝');
  
  console.log('\n[*] Initializing QuickJS...');
  const QuickJS = await getQuickJS();
  
  for (const site of TEST_SITES) {
    const result = await testSite(site, QuickJS);
    results.sites.push(result);
    
    // Aggregate properties
    for (const prop of result.propertiesAccessed) {
      results.aggregatedProperties.add(prop);
      if (!results.propertyFrequency[prop]) {
        results.propertyFrequency[prop] = 0;
      }
      results.propertyFrequency[prop]++;
    }
  }
  
  const report = generateReport(results);
  
  // Save report to file
  const fs = require('fs');
  fs.writeFileSync(
    '/home/v1truv1us/hn-quickjs-harness/report.json',
    JSON.stringify(report, null, 2)
  );
  console.log('\n\n[✓] Report saved to report.json');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
