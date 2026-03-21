const { getQuickJS } = require('quickjs-emscripten');
const { JSDOM } = require('jsdom');

const HN_URL = 'https://news.ycombinator.com';
const ACCESSED_PROPERTIES = new Set();

async function fetchHNHtml() {
  const response = await fetch(HN_URL);
  return response.text();
}

function resolveUrl(base, relative) {
  try {
    return new URL(relative, base).href;
  } catch {
    return null;
  }
}

function extractScripts(html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const scripts = [];
  
  const scriptElements = document.querySelectorAll('script');
  
  for (let i = 0; i < scriptElements.length; i++) {
    const script = scriptElements[i];
    const src = script.src;
    const content = script.textContent;
    
    if (src) {
      const fullUrl = resolveUrl(HN_URL, src);
      scripts.push({
        type: 'external',
        src: fullUrl || src,
        order: i,
        content: null
      });
    } else if (content && content.trim()) {
      scripts.push({
        type: 'inline',
        content: content,
        order: i,
        src: null
      });
    }
  }
  
  return scripts;
}

async function fetchExternalScript(url) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; QuickJS-Test/1.0)',
        'Accept': '*/*'
      }
    });
    return response.text();
  } catch (error) {
    return null;
  }
}

function createProxySetupCode() {
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
          prop === 'includes' || prop === 'sort' || prop === 'reverse' || prop === 'fill') {
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
      
      return __createDummyObject(fullPath);
    },
    set: function(target, prop, value) {
      var fullPath = path ? path + '.' + prop : prop;
      __logProp(fullPath + ' = ...');
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
    if (prop === 'location') return __createDummyObject('document.location');
    if (prop === 'cookie') return '';
    if (prop === 'title') return '';
    if (prop === 'URL') return '${HN_URL}';
    if (prop === 'documentURI') return '${HN_URL}';
    if (prop === 'readyState') return 'complete';
    if (prop === 'domain') return 'news.ycombinator.com';
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
    
    return __createDummyObject(fullPath);
  },
  set: function(target, prop, value) {
    __logProp('document.' + prop + ' = ...');
    return true;
  },
  has: function(target, prop) {
    return true;
  }
});

var __locationObj = {
  href: '${HN_URL}',
  origin: 'https://news.ycombinator.com',
  protocol: 'https:',
  host: 'news.ycombinator.com',
  hostname: 'news.ycombinator.com',
  port: '',
  pathname: '/',
  search: '',
  hash: '',
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
    __logProp('location.' + prop + ' = ' + value);
    if (prop in target) target[prop] = value;
    return true;
  }
});

var __navigatorObj = {
  userAgent: 'Mozilla/5.0 (compatible; QuickJS-Test/1.0)',
  appName: 'Netscape',
  appVersion: '5.0',
  platform: 'Linux x86_64',
  vendor: '',
  vendorSub: '',
  productSub: '20030107',
  cookieEnabled: true,
  onLine: true,
  language: 'en-US',
  languages: ['en-US'],
  hardwareConcurrency: 4,
  deviceMemory: 8,
  maxTouchPoints: 0,
  webdriver: false
};

var __navigator = new Proxy(__navigatorObj, {
  get: function(target, prop, receiver) {
    if (prop === 'then') return undefined;
    if (typeof prop === 'symbol') return undefined;
    __logProp('navigator.' + prop);
    if (prop === 'getBattery') return function() { __logProp('navigator.getBattery()'); return Promise.resolve(__createDummyObject('BatteryManager')); };
    if (prop === 'getGamepads') return function() { __logProp('navigator.getGamepads()'); return []; };
    if (prop === 'javaEnabled') return function() { __logProp('navigator.javaEnabled()'); return false; };
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
    __logProp('Storage[' + prop + '] = ...');
    return true;
  },
  has: function(target, prop) {
    return true;
  }
};

var __localStorage = new Proxy({}, __storageHandler);
var __sessionStorage = new Proxy({}, __storageHandler);

var __consoleMethods = ['log', 'warn', 'error', 'info', 'debug', 'trace', 'dir', 'dirxml', 
                        'table', 'group', 'groupCollapsed', 'groupEnd', 'clear', 'count',
                        'countReset', 'assert', 'profile', 'profileEnd', 'time', 'timeEnd',
                        'timeLog', 'timeStamp', 'exception'];
var __console = {};
__consoleMethods.forEach(function(method) {
  __console[method] = function() {};
});

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
    return 1;
  },
  setInterval: function(fn, delay) {
    __logProp('window.setInterval');
    return 1;
  },
  clearTimeout: function(id) {
    __logProp('window.clearTimeout');
  },
  clearInterval: function(id) {
    __logProp('window.clearInterval');
  },
  requestAnimationFrame: function(fn) {
    __logProp('window.requestAnimationFrame');
    return 1;
  },
  cancelAnimationFrame: function(id) {
    __logProp('window.cancelAnimationFrame');
  },
  requestIdleCallback: function(fn) {
    __logProp('window.requestIdleCallback');
    return 1;
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
    return __createDummyObject('CSSStyleDeclaration');
  },
  getSelection: function() {
    __logProp('window.getSelection');
    return __createDummyObject('Selection');
  },
  matchMedia: function(query) {
    __logProp('window.matchMedia(' + query + ')');
    return { matches: false, media: query, addEventListener: function(){}, removeEventListener: function(){} };
  },
  atob: function(str) {
    __logProp('window.atob');
    return str;
  },
  btoa: function(str) {
    __logProp('window.btoa');
    return str;
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
    if (prop === 'origin') return 'https://news.ycombinator.com';
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
    
    return __createDummyObject(fullPath);
  },
  set: function(target, prop, value) {
    __logProp('window.' + prop + ' = ...');
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
  this.href = url;
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

function Uint8Array() {}
function Uint16Array() {}
function Uint32Array() {}
function Int8Array() {}
function Int16Array() {}
function Int32Array() {}
function Float32Array() {}
function Float64Array() {}
globalThis.Uint8Array = Uint8Array;
globalThis.Uint16Array = Uint16Array;
globalThis.Uint32Array = Uint32Array;
globalThis.Int8Array = Int8Array;
globalThis.Int16Array = Int16Array;
globalThis.Int32Array = Int32Array;
globalThis.Float32Array = Float32Array;
globalThis.Float64Array = Float64Array;

function DataView() {}
globalThis.DataView = DataView;

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
`;
}

async function main() {
  console.log('[*] QuickJS HN Test Harness');
  console.log('[*] Fetching HN HTML...');
  
  let html;
  try {
    html = await fetchHNHtml();
    console.log(`[*] Fetched ${html.length} bytes`);
  } catch (error) {
    console.error('[ERROR] Failed to fetch HN:', error.message);
    process.exit(1);
  }
  
  console.log('[*] Extracting scripts...');
  const scripts = extractScripts(html);
  console.log(`[*] Found ${scripts.length} script tags`);
  
  console.log('[*] Fetching external scripts...');
  for (const script of scripts) {
    if (script.type === 'external') {
      console.log(`    Fetching: ${script.src}`);
      const content = await fetchExternalScript(script.src);
      if (content) {
        script.content = content;
        console.log(`    Fetched ${content.length} bytes`);
      }
    }
  }
  
  console.log('[*] Initializing QuickJS...');
  const QuickJS = await getQuickJS();
  const vm = QuickJS.newContext();
  
  console.log('[*] Setting up mock environment...');
  const proxySetupCode = createProxySetupCode();
  
  try {
    const setupResult = vm.evalCode(proxySetupCode, 'proxy-setup.js', { type: 'script' });
    if (setupResult.error) {
      const errorHandle = setupResult.error;
      const errorObj = vm.dump(errorHandle);
      console.error('[ERROR] Failed to setup proxy environment:', JSON.stringify(errorObj, null, 2));
      errorHandle.dispose();
      vm.dispose();
      process.exit(1);
    } else {
      setupResult.value.dispose();
      console.log('[*] Mock environment ready');
    }
  } catch (e) {
    console.error('[ERROR] Proxy setup exception:', e.message);
    vm.dispose();
    process.exit(1);
  }
  
  console.log('[*] Executing scripts in document order...');
  
  const executedScripts = [];
  
  for (const script of scripts) {
    if (!script.content) continue;
    
    const label = script.type === 'external' ? script.src : `inline script #${script.order}`;
    console.log(`\n[*] Executing: ${label}`);
    console.log(`    Size: ${script.content.length} bytes`);
    executedScripts.push(label);
    
    try {
      const result = vm.evalCode(
        script.content,
        script.type === 'external' ? script.src : `inline-${script.order}.js`,
        { type: 'script' }
      );
      
      if (result.error) {
        const errorHandle = result.error;
        const errorObj = vm.dump(errorHandle);
        console.error(`[ERROR] Script execution failed:`, errorObj.message || errorObj);
        errorHandle.dispose();
      } else {
        console.log(`    [OK] Script executed successfully`);
        if (result.value) {
          result.value.dispose();
        }
      }
    } catch (e) {
      console.error(`[ERROR] Exception during execution:`, e.message);
    }
  }
  
  console.log('\n[*] Extracting accessed properties...');
  
  const getAccessedCode = `JSON.stringify(__accessedProps)`;
  const accessedResult = vm.evalCode(getAccessedCode, 'get-accessed.js', { type: 'script' });
  
  let accessedProps = [];
  if (!accessedResult.error && accessedResult.value) {
    const jsonStr = vm.dump(accessedResult.value);
    accessedResult.value.dispose();
    try {
      accessedProps = JSON.parse(jsonStr);
    } catch (e) {
      console.error('[ERROR] Failed to parse accessed props:', e.message);
    }
  } else if (accessedResult.error) {
    accessedResult.error.dispose();
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('ACCESSED WEB APIs AND DOM PROPERTIES (deduplicated, sorted)');
  console.log('='.repeat(80));
  
  const uniqueProps = [...new Set(accessedProps)].sort();
  
  console.log(`\nScripts executed: ${executedScripts.length}`);
  executedScripts.forEach(s => console.log(`  - ${s}`));
  
  console.log(`\nTotal unique properties accessed: ${uniqueProps.length}\n`);
  
  for (const prop of uniqueProps) {
    console.log(prop);
  }
  
  console.log('\n[*] Cleaning up...');
  vm.dispose();
  
  console.log('[*] Done!');
}

main().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
