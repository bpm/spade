// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*jslint evil:true */
/*globals ARGS ARGV ENV __module */

/*! @license
==========================================================================
Spade 2.0 CommonJS Runtime
copyright 2010 Strobe Inc.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the "Software"),
to deal in the Software without restriction, including without limitation
the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
DEALINGS IN THE SOFTWARE.

Spade is part of the SproutCore project.

SproutCore and the SproutCore logo are trademarks of Sprout Systems, Inc.

For more information visit http://www.sproutcore.com/spade

==========================================================================
@license */

// Make this work when loaded from browser or from node.js
var spade ;
(function() {

  var Spade, Tp, Sandbox, Sp,
      Loader, Lp, K, Evaluator, Ep, Compiler, Cp;

  // defining these types here will allow the minifier the compact them
  if ('undefined' !== typeof spade) { return; } // nothing to do

  K = function() {}; // noop

  // assume id is already normalized
  function packageIdFor(normalizedId) {
    return normalizedId.slice(0, normalizedId.indexOf('/'));
  }

  function remap(id, contextPkg) {
    var mappings = contextPkg ? contextPkg.mappings : null;
    if (!mappings) { return id; }

    var packageId = packageIdFor(id);
    if (mappings[packageId]) {
      id = mappings[packageId] + id.slice(id.indexOf('/'));
    }
    return id;
  }

  function normalize(id, contextId, contextPkg, _asPackage) {
    var idx, len;

    // slice separator off the end since it is not used...
    if (id[id.length-1]==='/') { id = id.slice(0,-1); }

    // need to walk if there is a .
    if (id.indexOf('.')>=0) {
      var parts = contextId && (id[0]==='.') ? contextId.split('/') : [],
          part, next,
          packageName = parts[0],
          needsCleanup = false;

      idx = 0;
      len = id.length;

      if (contextPkg && contextPkg.main && contextId === packageName+'/main') {
      // If we're requiring from main we need to handle relative requires specially
        needsCleanup = true;
        parts = contextPkg.main.replace(/^\.?\//, '').split('/');
      }

      parts.pop(); // get rid of the last path element since it is a module.

      while(idx<len) {
        next = id.indexOf('/', idx);
        if (next<0) { next = len; }
        part = id.slice(idx, next);
        if (part==='..') { parts.pop(); }
        else if (part!=='.' && part!=='' && part!==null) { parts.push(part); }
        // skip .., empty, and null.
        idx = next+1;
      }

      id = parts.join('/');

      if (needsCleanup) {
        var libPaths = contextPkg.directories.lib;
        for (idx=0,len=libPaths.length; idx<len; idx++){
          id = id.replace(libPaths[idx].replace(/^\.?\//, '')+'/', '');
        }
        id = packageName+'/'+id;
      }

    // else, just slice off beginning '/' if needed
    } else if (id[0]==='/') { id = id.slice(1); }

    // if we end up with no separators, make this a pkg
    if (id.indexOf('/')<0) { id = id+(_asPackage ? '/~package' : '/main'); }
    // may need to walk if there is a separator...
    if (id.indexOf('/')>0 || id.indexOf('.')>0) {
    }
    // slice separators off begin and end
    if (id[0]==='/') { id = id.slice(1); }

    // Remove unnecessary ~lib references
    id = id.replace('~lib/', '');

    return remap(id, contextPkg);
  }

  function parseIdFormats(id, formats) {
    // Handle requires with extension
    var formatRE = new RegExp("^(.+)\\.("+formats.join('|')+")$"), match, format;
    if (id.substring(0,5) !== "file:" && (match = id.match(formatRE))) {
      id = match[1];
      format = match[2];
      formats = [format];
    }

    return {
      id: id,
      format: format,
      formats: formats
    };
  }

  // ..........................................................
  // PLATFORM
  //
  // Detect important platform properties.  Mostly for determining code
  // that can't run one way or the other.
  var SPADE_PLATFORM;
  if (('undefined'===typeof ENV) || !ENV.SPADE_PLATFORM) {
    SPADE_PLATFORM = { ENGINE: 'browser' };
  } else {
    SPADE_PLATFORM = ENV.SPADE_PLATFORM;
  }

  var LANG;
  if ('undefined'!==typeof ENV) { LANG = ENV.LANG; }
  if (!LANG && 'undefined'!==typeof navigator) { LANG = navigator.language; }
  if (!LANG) { LANG = 'en-US'; }


  // ..........................................................
  // Sandbox - you could make a secure version if you want...
  //

  // runs a factory within context and returns exports...
  function execFactory(id, factory, sandbox, spade) {
    var require, mod;

    var pkg      = spade.package(id),
        filename = factory.filename,
        format   = factory.format,
        skipPreprocess = factory.skipPreprocess,
        ARGV     = sandbox.ARGV,
        ENV      = sandbox.ENV,
        fullId   = id+'.'+format;

    require = function(moduleId) {
      return sandbox.require(moduleId, id, pkg);
    };

    // make the require 'object' have the same API as sandbox and spade.
    require.require = require;

    require.exists = function(moduleId) {
      return sandbox.exists(normalize(moduleId, id, pkg));
    };

    require.normalize = function(moduleId) {
      return normalize(moduleId, id, pkg);
    };

    require.async = function(moduleId, callback) {
      return sandbox.async(normalize(moduleId, id, pkg), callback);
    };

    require.sandbox = function(name, isolate) {
      return spade.sandbox(name, isolate);
    };

    require.url = function(moduleId, ext) {
      return sandbox.url(normalize(moduleId, id, pkg), ext);
    };

    require.runCommand = function(command, args){
      return sandbox.runCommand(command, args, id, pkg);
    };

    require.id = id; // so you can tell one require from another

    sandbox._modules[id] = mod = {
      id:        id,
      exports:   {},
      sandbox:   sandbox
    };

    factory = factory.data; // extract the raw module body

    // compile if needed - use cache so we only do it once per sandbox
    if ('string' === typeof factory) {
      if (sandbox._factories[fullId]) {
        factory = sandbox._factories[fullId];
      } else {
        sandbox._loading[id] = sandbox._loading[fullId] = true;

        if (!skipPreprocess) {
          factory = sandbox.compileFormat(factory, filename, format, pkg);
          factory = sandbox.compilePreprocessors(factory, filename, pkg, id);
        }

        // TODO: Add check for compilation mode
        var wrapped = sandbox.compileWrapper(factory, filename, pkg, id);
        spade.compiler.add(fullId, wrapped);

        factory = sandbox.evaluate('(function(require, exports, __module, ARGV, ENV, __filename) {'+factory+';\n}) //@ sourceURL='+filename+'\n', filename);
        sandbox._factories[fullId] = factory;
        sandbox._loading[id] = sandbox._loading[fullId] = false;
      }
    }

    if ('function' === typeof factory) {
      var ret = factory(require, mod.exports, mod, ARGV, ENV, filename);
      if (ret !== undefined) { mod.exports = ret; } // allow return exports
    } else {
      mod.exports = factory;
    }

    return mod.exports;
  }

  /**
    @constructor

    Sandbox provides an isolated context for loading and running modules.
    You can create new sandboxes anytime you want.  If you pass true for the
    isolate flag, then the sandbox will be created in a separate context if
    supported on the platform.  Otherwise it will share globals with the
    default sandbox context.

    Note that isolated sandboxes are not the same as secure sandboxes.  For
    example in the browser, a isolated sandbox is created using an iframe
    which still exposes access to the DOM and parent environment.

    Isolated sandboxes are mostly useful for testing and sharing plugin code
    that might want to use different versions of packages.

    @param {Spade} spade
      The spade instance

    @param {Boolean} isolate
      Set to true if you want to isolate it

    @returns {Sandbox} instance
  */
  Sandbox = function(spade, name, isolate) {
    if (typeof name !== 'string') {
      isolate = name;
      name = null;
    }

    if (!name) { name = '(anonymous)'; }

    this.spade = spade;
    this.name  = name;
    this.isIsolated = !!isolate;
    this._factories = {}; // evaluated factories
    this._loading   = {}; // list of loading modules
    this._modules   = {}; // cached export results
    this._used      = {}; // to detect circular references
  };

  // alias this to help minifier make the page a big smaller.
  Sp = Sandbox.prototype;

  Sp.toString = function() {
    return '[Sandbox '+this.name+']';
  };

  /**
    Evaluate the passed string in the Sandbox context, returning the result.
    This is the primitive used to evalute string-encoded factories into
    modules that can execute within a specific context.
  */
  Sp.evaluate = function(code, filename) {
    if (this.isDestroyed) { throw new Error("Sandbox destroyed"); }
    if (!this._evaluatorInited) {
      this._evaluatorInited = true;
      this.spade.evaluator.setup(this);
    }
    return this.spade.evaluator.evaluate(code, this, filename);
  };

  function findPlugins(sandbox, pkg, type, options) {
    if (!options) { options = {}; }

    var plugins = [], ret = [], found,
        single = options.single,
        key = options.key,
        searchSelf = (options.searchSelf != false) ? true : options.searchSelf;

    if (searchSelf) {
      found = pkg && pkg['plugin:'+type];
      if (key) { found = found && found[key]; }
      if (found) {
        if (single) { return found; }
        plugins = plugins.concat(found);
      }
    }

    // look in immediate dependencies only, if we wanted to have formats we would have required them
    var deps = pkg && pkg.dependencies;
    if (deps) {
      for(var packageId in deps) {
        pkg = sandbox.spade.package(packageId);
        found = pkg && pkg['plugin:'+type];
        if (key) { found = found && found[key]; }
        if (found) { plugins = plugins.concat(found); }
      }
    }

    // Remove duplicates
    for (var i=0,len=plugins.length; i < len; i++) {
      if (ret.indexOf(plugins[i]) < 0) { ret.push(plugins[i]); }
    }

    if (single) {
      if (ret.length > 1) { console.warn("Found multiple plugins when expecting one for type: '"+type+"' and key: '"+key+"'"); }
      return ret[0] || null;
    } else {
      return ret;
    }
  }

  Sp.compileFormat = function(code, filename, format, pkg) {
    var plugin = findPlugins(this, pkg, 'formats', { key: format, single: true });
    if (plugin) { plugin = this.require(plugin); }
    return plugin ? plugin.compileFormat(code, this, filename, format, pkg) : code;
  };

  Sp.compilePreprocessors = function(code, filename, pkg, id) {
    var plugins = findPlugins(this, pkg, 'preprocessors'), plugin;
    for (var i=0, len=plugins.length; i < len; i++) {
      // Avoid trying to process self
      if (plugins[i] === id) { continue; }
      plugin = this.require(plugins[i]);
      if (!this._loading[id] || plugin.compilePreprocessor) {
        code = plugin.compilePreprocessor(code, this, filename, pkg);
      }
    }
    return code;
  };

  Sp.compileWrapper = function(code, filename, pkg, id) {
    var plugin = findPlugins(this, pkg, 'wrapper', { single: true, searchSelf: false });
    if (plugin) { plugin = this.require(plugin); }
    return plugin ? plugin.compileWrapper(code, this, filename, pkg) : code;
  };

  /**
    Sandbox-specific require.  This is actually the most primitive form of
    require.
  */
  Sp.require = function(id, callingId) {
    var pkg = callingId ? this.spade.package(callingId) : null;
    id = normalize(id, callingId, pkg);

    var ret = this._modules[id];
    if (ret) { ret = ret.exports; }

    var factory;
    if (ret) {
      if (!this._used[id]) { this._used[id] = ret; }
      return ret ;

    } else {
      factory = this.spade.loadFactory(this.spade.resolve(id, this));
      if (!factory) { throw new Error('Module '+id+' not found'); }

      var spade = this.spade;
      if (!this.ENV) { this.ENV = spade.env(); } // get at the last minute
      if (!this.ARGV) { this.ARGV = spade.argv(); }

      ret = execFactory(id, factory, this, spade);

      // detect circular references...
      if (this._used[id] && (this._used[id] !== ret)) {
        throw new Error("Circular require detected for module "+id);
      }
    }

    this.spade.compiler.used(id+'.'+factory.format);

    return ret ;
  };

  /**
    Sandbox-specific test to determine if the named module exists or not.
    This property only reflects what is immediately available through the
    sync-loader.  Using the async loader may change the return value of this
    call.
  */
  Sp.exists = function(id, callingId) {
    var pkg = callingId ? this.spade.package(callingId) : null;
    id = normalize(id, callingId, pkg);
    if (this._modules[id]) { return true; }
    return this.spade.factoryExists(this.spade.resolve(id, this));
  };

  /**
    Sandbox-specific async load.  This is actually the most primitive form of
    require.
  */
  Sp.async = function(id, callback, callingId) {
    var spade = this.spade, pkg;

    pkg = callingId ? this.spade.package(callingId) : null;
    id = spade.resolve(normalize(id, callingId, pkg), this);
    return spade.loadFactory(id, callback);
  };

  Sp.url = function(id, ext, callingId) {
    var ret, pkg;

    pkg = callingId ? this.spade.package(callingId) : null;
    id = normalize(id, callingId, pkg);

    pkg = this.spade.package(id);
    if (!pkg) {
      var packageId = packageIdFor(id)+'/~package';
      if (this.spade.exists(packageId)) { this.spade.require(packageId); }
      pkg = this.spade.package(id);
    }

    if (!pkg) {
      throw new Error("Can't get url for non-existent package "+id);
    }

    if (!pkg.root) {
      throw new Error('Package for '+id+' does not support urls');
    }

    ret = pkg.root + id.slice(id.indexOf('/'));
    if (ext) { ret = ret+'.'+ext; }
    return ret ;
  };

  Sp.runCommand = function(command, args, callerId, pkg){
    var xhr = new XMLHttpRequest(),
        url = "_spade/command",
        params = [];

    args.command = command;
    args.callerId = callerId;
    args.pkgRoot = pkg && pkg.root;

    for (var arg in args){
      params.push(encodeURIComponent(arg)+"="+encodeURIComponent(args[arg]));
    }
    params = params.join('&');

    xhr.open('POST', url, false);

    try {
      xhr.send(params);
    } catch(e) {
      throw new Error('unable to run command `'+command+'`, most likely either this browser or server does not support this');
    }

    if (xhr.status === 200) {
      return xhr.responseText;
    // Safari returns -1100 for file:// not found
    } else if (xhr.status === 404 || xhr.status === -1100) {
      throw new Error('unable to run command `'+command+'`, most likely you are running without a supported server');
    } else {
      throw new Error('running command `'+command+'` return status '+xhr.status+': '+xhr.responseText);
    }
  };

  Sp.isDestroyed = false;

  Sp.destroy = function() {
    if (!this.isDestroyed) {
      this.isDestroyed = true;
      this.spade.evaluator.teardown(this);
    }
    return this;
  };

  // ..........................................................
  // LOADER
  //

  /**
    The built-in loader object knows how to load whole packages as long as
    you have registered an external reference to the package.  This is pkg
    info that contains:

        {
          extern: true,  // this is not a real package yet
          src: 'http://example.com/bar',  // URL to load
          expects: ['foo', 'bar', 'baz']  // optional modules to expect
        }
  */
  Loader = function() {
    this._loading = {};
  };

  Lp = Loader.prototype;

  function syncLoad(spade, id, url, format, force) {
    if (force) { url = url+'?'+Date.now(); }

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, false);
    try {
      xhr.send(null);
    } catch(e) {
      throw new Error('unable to fetch '+url+', most likely this browser is not supported');
    }

    // successful file:// requests return 0 in Safari and Firefox
    if (xhr.status === 200 || xhr.status === 0) {
      var body = xhr.responseText;
      if (body.slice(0,2) === '#!') { body = body.slice(body.indexOf('\n')); }

      if (!format) { format = 'js'; }
      spade.register(id, body, { format: format });
      return true;

    // Safari returns -1100 for file:// not found
    } else if (xhr.status === 404 || xhr.status === -1100) {
      return false;

    } else {
      throw new Error('fetching '+url+' return status '+xhr.status+': '+xhr.responseText);
    }
  }

  function resolveUrl(id, extern) {
    var dirname, dir, dirs, idx,
        packageUrl = extern.root,
        url, urls = [];

    id = normalize(id);
    id = id.slice(id.indexOf('/')+1); // slide off pkg

    // get directory
    if (id[0]==='~') {
      idx = id.indexOf('/');
      dirname = idx>=0 ? id.slice(0, idx) : id;
      id = dirname.length>=id.length ? null : id.slice(dirname.length+1);
      dirname = dirname.slice(1); // get rid of ~
    } else { dirname = 'lib'; }

    // map to directories
    dirs = extern.directories && extern.directories[dirname];
    if (!dirs) {
      throw new Error("Can't require '"+id+"' when '"+dirname+"' is not a known directory.");
    }
    if (typeof dirs === 'string') { dirs = [dirs]; }

    for(var idx=0,len=dirs.length; idx < len; idx++){
      dir = dirs[idx];
      // combine elements to form URL
      url = packageUrl;
      if (url === '.') { url = null; }
      if (dir && dir !== '.') { url = url ? url+'/'+dir : dir; }
      if (id && id !== '.') { url = url ? url+'/'+id : id; }

      // Clean up '.' and '..'
      var parts = url.split('/');
      for(var i=0,plen=parts.length; i<plen;) {
        if (parts[i] === '.') {
          parts = parts.slice(0,i).concat(parts.slice(i+1)); // Remove item
          // Retry at same index
        } else if (parts[i] === '..') {
          if (i === 0) {
            console.warn("Can't resolve leading '..'");
            i++; // Go to next
          } else {
            parts = parts.slice(0,i-1).concat(parts.slice(i+1)); // Remove previous and current item
            i--; // Retry at previous index
          }
        } else {
          i++; // Go to next
        }
      }
      url = parts.join('/');
      urls.push(url);
    }

    return urls;
  }
  Lp.resolveUrl = resolveUrl;

  function syncLoadFormats(spade, id, extern, formats) {
    var packageUrl = extern.root,
        urls = resolveUrl(id, extern),
        tryUrls = [];

    for (var urlIdx=0,urlsLen=urls.length; urlIdx<urlsLen; urlIdx++) {
      for (var formatIdx=0,formatsLen=formats.length; formatIdx<formatsLen; formatIdx++) {
        tryUrls.push(urls[urlIdx]+'.'+formats[formatIdx]);
      }
    }

    // If we know about a file we want to try to load it first
    // We still will try others incase it doesn't exist
    if (extern.files) {
      for (var idx=0,len=tryUrls.length; idx<len; idx++) {
        var relativeUrl = tryUrls[idx].replace(packageUrl+'/', '');
        if (extern.files.indexOf(relativeUrl) > -1) {
          // Move url to the front
          tryUrls = [tryUrls[idx]].concat(tryUrls.slice(0,idx)).concat(tryUrls.slice(idx+1));
          break;
        }
      }
    }

    function tryUrl(url) {
      var format = url.match(/\.(.+)$/)[1]; // this is a touch hacky
      return syncLoad(spade, id, url, format, true);
    }

    return !!tryUrls.some(tryUrl);
  }

  function verifyInBrowser(id, done) {
    if ('undefined'===typeof document) {
      var err = new Error("Cannot load package "+id+" outside of browser");
      if (done) { done(err); }
      else { throw err; }
      return false;
    }

    return true;
  }

  Lp.loadFactory = function(spade, id, formats, done) {

    var url, loaded, packageId,
        extern = spade.package(id),
        that = this;

    // loader only works for sync requests if the package info permits sync
    // loading.  In production mode, normally it should not.
    if (!done && (!extern || !extern.sync)) { return this; }

    // this loader only works in the browser
    if (!verifyInBrowser(id, done)) { return this; }

    if (!done) {
      url = extern.src;
      if (!url) { loaded = syncLoadFormats(spade, id, extern, formats); }
      else { loaded = syncLoad(spade, id, url); }
      if (!loaded) { throw new Error('fetching '+id+' not found'); }
    // not actually loadable
    } else if (!extern || !extern.extern) {
      done(new Error('Module '+id+' not found'));

    } else {

      // now do actual load of src
      if (!extern.src) {
        throw new Error("Cannot load package "+id+" without a src URL");
      }

      // if already loading, just add to queue
      packageId = packageIdFor(normalize(id));
      if (this._loading[packageId]) {
        this._loading[packageId].push(done);
      } else {
        this._loading[packageId] = [done];
        this.loadURL(extern.src, function() { that.didLoad(packageId); });
        // TODO: Load dependencies
      }
    }
    return this;
  };

  Lp.exists = function(spade, id, formats) {

    var extern = spade.package(id);

    // loader only works for sync requests if the package info permits sync
    // loading.  In production mode, normally it should not.
    if (!extern || !extern.sync || !extern.root) { return false; }

    // this loader only works in the browser
    if (!verifyInBrowser(id)) { return false; }
    return syncLoadFormats(spade, id, extern, formats, true);
  };

  Lp.didLoad = function(packageId) {
    // TODO: verify/load dependencies
    var callbacks = this._loading[packageId];
    delete this._loading[packageId];
    if (callbacks) { callbacks.forEach(function(done) { done(); }); }
  };

  // actually create a script tag and load it
  Lp.loadURL = function(url, callback) {
    var el, head, didCallback = false;

    el = document.createElement('script');
    el.src = url;
    el.type = 'text/javascript';

    el.onload = callback;
    // IE doesn't support onload for scripts
    el.onreadystatechange = function(){
      if (el.readyState === 'loaded' || el.readyState === 'complete') {
        callback();
        el = null; // Avoid memory leaks in IE
      }
    };

    head = document.head || document.body;
    head.appendChild(el);
    head = null; // Avoid memory leaks in IE
  };

  // NOTE: On ready stuff mostly stolen from jQuery 1.4.  Need to incl here
  // because spade will often be used to load jQuery.
  // Will only be invoked once.  Just be prepared to call it
  Lp.scheduleReady = function(callback) {

    // handle case where ready is invoked AFTER the document is already ready
    if ( document.readyState === "complete" ) { return setTimeout(callback, 1); }

    var handler, handled = false;

    // The DOM ready check for Internet Explorer
    function doScrollCheck() {
      if (handled) { return; }

      try {
        // If IE is used, use the trick by Diego Perini
        // http://javascript.nwbox.com/IEContentLoaded/
        document.documentElement.doScroll("left");
      } catch(e) {
        setTimeout( doScrollCheck, 1 );
        return;
      }

      // and execute any waiting functions
      handler();
    }

    // Mozilla, Opera and webkit nightlies currently support this event
    if (document.addEventListener) {

      handler = function() {
        if (handled) { return; }
        handled = true;
        document.removeEventListener("DOMContentLoaded", handler, false);
        window.removeEventListener('load', handler, false);
        callback();
      };

      document.addEventListener( "DOMContentLoaded", handler, false);

      // A fallback to window.onload, that will always work
      window.addEventListener( "load", handler, false );

    // If IE event model is used
    } else if ( document.attachEvent ) {

      handler = function() {
        if (!handled && document.readyState === "complete") {
          handled = true;
          document.detachEvent( "onreadystatechange", handler );
          window.detachEvent('onload', handler);
          callback();
        }
      };

      // ensure firing before onload,
      // maybe late but safe also for iframes
      document.attachEvent("onreadystatechange", handler);

      // A fallback to window.onload, that will always work
      window.attachEvent( "onload", handler);

      // If IE and not a frame
      // continually check to see if the document is ready
      var toplevel = false;

      try {
        toplevel = window.frameElement === null;
      } catch(e) {}
      if ( document.documentElement.doScroll && toplevel ) { doScrollCheck(); }
    }
  };

  // ..........................................................
  // Evaluator Class
  //

  Evaluator = function() {};
  Ep = Evaluator.prototype;

  Ep.setup = function(sandbox) {
    if (sandbox.isIsolated) { throw new Error("Isolated Sandbox not supported"); }
  };

  Ep.evaluate = function(text, sandbox, filename) {
    return eval(text);
  };

  Ep.teardown = function(sandbox) {
    // noop by default
  };

  // ..........................................................
  // Compiler Class
  //

  Compiler = function(spade) {
    this.spade = spade;
    this.packages = {};
    this.usedPackages = [];
  };
  Cp = Compiler.prototype;

  Cp.add = function(fullId, code) {
    this.packages[fullId] = code;
  };

  Cp.used = function(fullId) {
    // Moving it to the end is probably not right
    var idx, len=this.usedPackages.length;
    for (idx=0; idx < len; idx++) {
      if (this.usedPackages[idx] === fullId) {
        this.usedPackages.splice(idx,1); // Remove item
        break;
      }
    }
    this.usedPackages.push(fullId); // Add to end
  };

  Cp.write = function() {
    // Is map a standard method?
    var out = this.usedPackages.map(function(name){
                return "/************* "+name+" *************/\n\n"+this.packages[name];
              }, this).join("\n\n\n");
    return out;
  };

  // ..........................................................
  // Spade Class - defined so we can recreate
  //

  Spade = function() {
    this.loader   = new this.Loader(this);
    this.evaluator = new this.Evaluator(this);
    this.defaultSandbox  = this.sandbox();
    this.compiler = new this.Compiler(this);
    this._factories = {};
    this._packages  = {};

    // register this instance as the result of the spade package.
    var inst = this;
    this.register('spade', { "name": "spade", "version": this.VERSION });
    this.register('spade/main', function(r, e, m) { m.exports = inst; });
  };

  Tp = Spade.prototype;

  Tp.VERSION  = "0.1.0";

  // expose the classes.  We do it this way so that you can create a new
  // Spade instance and treat it like the spade module
  Tp.Spade    = Spade;
  Tp.Sandbox  = Sandbox;
  Tp.Loader   = Loader;
  Tp.Evaluator = Evaluator;
  Tp.Compiler = Compiler;

  Tp.env = function() {
    if (!this.ENV) { this.ENV = 'undefined' !== typeof ENV ? ENV : {}; }
    if (!this.ENV.SPADE_PLATFORM) { this.ENV.SPADE_PLATFORM = SPADE_PLATFORM; }
    if (!this.ENV.LANG) { this.ENV.LANG = LANG; }
    return this.ENV;
  };

  Tp.argv = function() {
    if (!this.ARGV) { this.ARGV = 'undefined' !== typeof ARGV ? ARGV : []; }
    return this.ARGV;
  };

  /**
    Expose the spade require methods to the global context.  This should allow
    your global code to access spade in the same way that normal modules
    would.
  */
  Tp.globalize = function() {
    var spade = this;

    // save old info for conflict...
    this._conflict = {
      require: 'undefined' !== typeof require ? require : undefined,
      ENV:     'undefined' !== typeof ENV     ? ENV     : undefined,
      ARGV:    'undefined' !== typeof ARGV    ? ARGV    : undefined
    };

    require = function() { return spade.require.apply(spade,arguments); };
    ['async', 'sandbox', 'exists', 'url'].forEach(function(key) {
      require[key] = function() { return spade[key].apply(spade, arguments);};
    });

    ENV = this.env();
    ARGV = this.argv();
    return this;
  };

  /**
    Restores original values after a call to globalize().  If you call this
    method more than once it will have no effect.
  */
  Tp.noConflict = function() {
    var c = this._conflict;
    if (c) {
      delete this._conflict;
      require = c.require;
      ENV = c.ENV;
      ARGV = c.ARGV;
    }
    return this;
  };

  /**
    Returns a new sandbox instance attached to the current spade instance.
    Can isolate if preferred.

    @param {Boolean} isolate
      true if you want the sandbox to be isolated.  Throws exception if
      platform cannot isolate.

    @returns {Sandbox} sandbox instance
  */
  Tp.sandbox = function(name, isolate) {
    return new this.Sandbox(this, name, isolate);
  };

  /**
    Register a module or package information.  You can pass one of the
    following:

      'module/id', 'module body string'
      'module/id', function() { module func }
      'module/id', { exports: 'foo' }
      'module/id' - just register module id and no body to indicate presence

    Note also that if you pass just a packageId, it will be normalized to
    packageId/~package.  This is how you register a package.

    @param {String} id
      The module or package id

    @param {String|Function|Hash} data
      A module function, module body (as string), or hash of exports to use.

    @param {String} opts
      Additional metadata only if you are registering a module factory.  Known
      keys include 'filename' and 'format' (for compilation of DSLs).

  */
  Tp.register = function(id, data, opts) {
    if (!data) { data = K ; }
    var t = typeof data, isExtern, factory, isPkg;

    id = normalize(id, null, null, true);
    isPkg = id.slice(-9) === '/~package';

    // register - note packages can only accept hashes
    if (isPkg && 'object'!==typeof data) {
      throw new Error('You can only register hashes for packages');
    }

    // Set some package defaults
    if (isPkg) {
      if (!data.directories) { data.directories = {}; }
      if (!data.directories.lib) {
        data.directories.lib = ['lib'];
      } else if (typeof data.directories.lib === 'string') {
        data.directories.lib = [data.directories.lib];
      }
    }

    factory = { data: data };
    factory.filename     = opts && opts.filename ? opts.filename : id;
    factory.format       = opts && opts.format ? opts.format : 'js';
    factory.skipPreprocess = !!(opts && opts.skipPreprocess); // Force boolean

    // Store with generic id if none, or if JS
    if (!this._factories[id] || factory.format === 'js') {
      this._factories[id] = factory;
    }

    // Store with format
    if (!isPkg) {
      this._factories[id+'.'+factory.format] = factory;
    }

    return this;
  };

  /**
    Efficient way to register external packages.  Pass a hash of packageIds
    and source URLs.  If the package is already registered, the extern will
    not replace it so this is safe to call multiple times.
  */
  Tp.externs = function(externs, extern) {
    var tmp, packages = this._packages;

    // normalize method call.
    if ('string' === typeof externs) {
      tmp = {};
      tmp[externs] = extern;
      externs = tmp;
      extern = null;
    }

    for(var packageId in externs) {
      if (!externs.hasOwnProperty(packageId)) { continue; }
      if (packages[packageId] && !packages[packageId].extern) { continue; }

      extern = externs[packageId];
      if ('string' === typeof extern) { extern = {name: packageId, src: extern}; }
      extern.extern = true;
      this.register(packageId, extern);
    }
  };

  /**
    Require a module from the default sandbox.

    @param {String} id
      The module id.

    @returns {Hash} module exports
  */
  Tp.require = function(id) {
    return this.defaultSandbox.require(id, this.defaultSandbox.callerId);
  };


  /**
    Async load a module if it is not already a registered factory.  Invoke
    the passed callback with an optional error object when the module is
    ready to load.
  */
  Tp.async = function(id, callback) {
    return this.defaultSandbox.async(id, callback);
  };

  Tp.exists = function(id) {
    return this.defaultSandbox.exists(id);
  };

  Tp.url = function(id, ext) {
    return this.defaultSandbox.url(id, ext);
  };

  function _collectFormats(spade, ret, pkg) {

    function extractFormats(formats) {
      if (formats) {
        Object.keys(formats).forEach(function(key) {
          if (ret.indexOf(key)<0) { ret.unshift(key); } // new formats go first
        });
      }
    }

    extractFormats(pkg['plugin:formats']);

    var deps = pkg.dependencies;
    if (!deps) { return ret; }

    for(var packageId in deps) {
      pkg = spade.package(packageId);
      if (pkg) { extractFormats(pkg['plugin:formats']); }
    }

    return ret ;
  }

  /**
    Called by the sandbox to get a factory object for the named moduleId
  */
  Tp.loadFactory = function(id, callback) {
    var pkg, formats, format, data, ret;

    // find any formats the current package might know about.  Note that for
    // lazy-loaders this may not be entirely up to date (since not all pkgs
    // are registered right away)
    pkg = this.package(id);
    formats = pkg ? _collectFormats(this, ['js'], pkg) : ['js'];

    data = parseIdFormats(id, formats);
    id = data.id;
    format = data.format;
    formats = data.formats;

    ret = format ? this._factories[id+'.'+format] : this._factories[id];

    if (callback) {
      if (!ret) {
        if (this.loader && this.loader.loadFactory) {
          this.loader.loadFactory(this, id, formats, callback);
        } else { callback(new Error('Module '+id+' not found')); }
      } else { callback(); }

    } else if (!ret && this.loader && this.loader.loadFactory) {
      this.loader.loadFactory(this, id, formats);
      ret = format ? this._factories[id+'.'+format] : this._factories[id];
    }

    return ret ;
  };

  /**
    Called by the sandbox to determine if the named id exists on the system.
    The id should already be normalized.  If the id is not yet registered, the
    loader will also be consulted.
  */
  Tp.factoryExists = function(id) {
    if (this._factories[id]) { return true; }
    if (!this.loader || !this.loader.exists) { return false; }

    var pkg     = this.package(id),
        formats = pkg ? _collectFormats(this, ['js'], pkg) : ['js'],
        data = parseIdFormats(id, formats);

    return this.loader.exists(this, data.id, data.formats);
  };

  /**
    Returns the package info, if any, for the named module or packageId
  */
  Tp.package = function(id) {
    id = packageIdFor(normalize(id))+'/~package';
    var ret = this._factories[id];
    return ret ? ret.data : null;
  };

  /**
    Normalize a moduleId, expanding it if needed.
  */
  Tp.normalize = function(id, contextId) {
    return normalize(id, contextId);
  };

  // maps the passed ID to a potentially location specific ID.  This gives
  // the loader a way to vary the factory function returned for a given id
  // per sandbox
  Tp.resolve = function(id, sandbox) {
    if (sandbox && this.loader && this.loader.resolve) {
      return this.loader.resolve(id, sandbox);
    } else { return id; }
  };

  // uses the loader to invoke when the app is ready.  For the browser this
  // is on the ready event.
  Tp.ready = function(callback) {
    switch(this.readyState) {
      case 'ready':
        callback();
        break;

      case 'scheduled':
        this._readyQueue.push(callback);
        break;

      default:
        this._readyQueue = [callback];
        this.readyState = 'scheduled';
        if (this.loader && this.loader.scheduleReady) {
          var that = this;
          this.loader.scheduleReady(function() {
            var queue = that._readyQueue, len = queue ? queue.length : 0;
            that._readyQueue = null;
            that.readyState = 'ready';
            for(var idx=0;idx<len;idx++) { queue[idx](); }
          });

        } else {
          throw new Error('Loader does not support activate on ready state');
        }
    }
  };

  // instantiate spade and also attach class for testing
  spade = new Spade();

  // in the browser - if ENV and ARGS are not defined, just create some
  // reasonable defaults.  We assume that when loading strobe from the CLI
  // these will already be setup.
  if (SPADE_PLATFORM.engine === 'browser') { spade.globalize(); }

  // make this work when called as a module
  if ('undefined' !== typeof require) {
    if ('undefined' !== typeof __module) { __module.exports = spade; }
    else if ('undefined' !== typeof module) { module.exports = spade; }
  }

})();

