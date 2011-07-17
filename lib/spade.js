// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license
// ==========================================================================
/*jslint evil:true */
/*globals spade ARGS ARGV ENV __module ActiveXObject */

(function() {

var K, indexOf, Sandbox, Sp, Evaluator, Ep, Loader, Lp, Spade, Tp;


// ..........................................................
// HELPER FUNCTIONS
// 

K = function() {}; // noop

if (Array.prototype.indexOf) {
  indexOf = function(ary, obj, fromIndex) { 
    return ary.indexOf(obj, fromIndex);
  };
} else {
  indexOf = function(ary, obj, fromIndex) {
    var len = ary.length, idx;
    fromIndex = fromIndex<0 ? Math.max(0, ary.length+fromIndex) : (fromIndex||0);
    for(idx = fromIndex; idx<len; idx++) {
      if (ary[idx] === obj) return idx;
    }
    return -1;
  };
}

// assume id is already normalized
function packageIdFor(normalizedId) {
  return normalizedId.slice(0, indexOf(normalizedId, '/'));
}

function remap(id, contextPkg) {
  var mappings = contextPkg ? contextPkg.mappings : null;
  if (!mappings) { return id; }

  var packageId = packageIdFor(id);
  if (mappings[packageId]) {
    id = mappings[packageId] + id.slice(indexOf(id, '/'));
  }
  return id;
}

// convert a relative or otherwise de-normalized module id into canoncial form
// normalize('./foo', 'bar/baz') -> 'bar/foo'
// normalize('foo', 'bar/baz') -> 'foo/main' (or foo/~package is asPackage)
// normalize('foo/bar', 'bar/baz') -> 'foo/bar'
function normalize(id, contextId, contextPkg, _asPackage) {
  var idx, len;

  // slice separator off the end since it is not used...
  if (id[id.length-1]==='/') { id = id.slice(0,-1); }

  // need to walk if there is a .
  if (indexOf(id, '.')>=0) {
    var parts = contextId && (id.charAt(0) ==='.') ? contextId.split('/') : [],
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
      next = indexOf(id, '/', idx);
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
  if (indexOf(id, '/')<0) { id = id+(_asPackage ? '/~package' : '/main'); }

  // slice separators off begin and end
  if (id[0]==='/') { id = id.slice(1); }

  // Remove unnecessary ~lib references
  id = id.replace('~lib/', '');

  return remap(id, contextPkg);
}

// ..........................................................
// SANDBOX - you could make a secure version if you want
// 

// runs a factory within context and returns exports...
function execFactory(id, factory, sandbox, spade) {
  var require, mod, factoryData, fullId;

  var filename = factory.filename,
      ARGV     = sandbox.ARGV,
      ENV      = sandbox.ENV;

  require = sandbox.makeRequire(id, spade);
  
  sandbox._modules[id] = mod = {
    id:        id,
    exports:   {},
    sandbox:   sandbox
  };

  factoryData = factory.data; // extract the raw module body

  // evaluate if needed - use cache so we only do it once per sandbox
  if ('string' === typeof factoryData) {
    
    if (sandbox._factories[id]) {
      factoryData = sandbox._factories[id];
    } else {
      sandbox._loading[id] = true;

      // The __evalFunc keeps IE 9 happy since it doesn't like
      // unassigned anonymous functions
      factoryData = sandbox.evaluate('__evalFunc = function(require, exports, __module, ARGV, ENV, __filename) {'+factoryData+'} //@ sourceURL='+filename+'\n', filename);
      sandbox._factories[id] = factoryData;
      sandbox._loading[id] = false;
    }
  }

  if ('function' === typeof factoryData) {
    var ret = factoryData(require, mod.exports, mod, ARGV, ENV, filename);
    if (ret !== undefined) { mod.exports = ret; } // allow return exports
  } else {
    mod.exports = factoryData;
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

  @param {String} name
    (Optional) name of the sandbox for debugging purposes
    
  @param {Boolean} isolate
    Set to true if you want to isolate it

  @returns {Sandbox} instance
*/
Sandbox = function(spade, name, isolate) {
  
  // name parameter is optional
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

// alias this to help minifier make the page a bit smaller.
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

/**
  NOTE: This is a primitive form of the require() method.  Usually you should
  use the require() method defined in your module.

  Sandbox-specific require.  This is the most primitive form of require.  All
  other requires() pass through here.
  
  @param {String} id
    The module id you want to require.
    
  @param {String} callingId
    (Optional) The id of the module requiring the module.  This is needed if 
    you the id you pass in might be relative.
    
  @returns {Object} exports of the required module
*/
Sp.require = function(id, callingId) {
  var spade = this.spade,
      pkg, ret, factory;
      
  pkg = callingId ? spade.package(callingId) : null;
  id = normalize(id, callingId, pkg);

  ret = this._modules[id];
  if (ret) { ret = ret.exports; }

  if (ret) {
    
    // save so we can detect circular references later
    if (!this._used[id]) { this._used[id] = ret; }
    return ret ;

  } else {
    factory = spade.loadFactory(spade.resolve(id, this));
    if (!factory) { throw new Error('Module '+id+' not found'); }

    if (!this.ENV)  { this.ENV = spade.env(); } // get at the last minute
    if (!this.ARGV) { this.ARGV = spade.argv(); }

    ret = execFactory(id, factory, this, spade);

    if (this._used[id] && (this._used[id] !== ret)) {
      throw new Error("Circular require detected for module "+id);
    }
  }

  return ret ;
};

/**
  NOTE: This is a primitive form of the exists() method.  Usually you should
  use the require.exists() method defined on the require() function in your
  module.

  Sandbox-specific test to determine if the named module exists or not.
  This property only reflects what is immediately available through the
  sync-loader.  Using the async loader may change the return value of this
  call.
  
  @param {String} id
    The module id you want to test
    
  @param {String} callingId
    (Optional) The id of the module requesting the module.  Required if the id 
    you pass in might be relative.
    
  @returns {Object} exports of the required module
*/
Sp.exists = function(id, callingId) {
  var spade = this.spade, pkg;
  pkg = callingId ? spade.package(callingId) : null;
  id  = normalize(id, callingId, pkg);
  if (this._modules[id]) { return true; }
  return spade.factoryExists(spade.resolve(id, this));
};

/**
  NOTE: This is a primitive form of the async() method.  Usually you should
  use the require.async() method defined on the require() function in your
  module.
  
  Asynchronously attempts to load a module, invoking a callback if and when
  the module is loaded.  If the module is already defined, the callback will
  be invoked immediately.  Otherwise, this will use the Loader plugin on the
  main spade context to attempt to load the module.  If the module cannot 
  be loaded, the callback will be invoked with an error object as its first
  parameter to inform you that it failed.
  
  Note that the default Loader that ships with spade is not actually capable
  of asynchronously loading modules, which means this method will always fail
  unless the module is already present.  You can use the spade-loader package
  to install an async loader that will work.
  
  @param {String} id
    The module id you want to load

  @param {Function} callback
    A callback to invoke when the module is loaded or if the load has failed.
    The calback should expect an error object (or null) as the first 
    parameter.
    
  @param {String} callingId
    (Optional) The id of the module requesting the module.  Required if the id 
    you pass in might be relative.
    
  @returns {void}
*/
Sp.async = function(id, callback, callingId) {
  var spade = this.spade, pkg;
  pkg = callingId ? spade.package(callingId) : null;
  id = spade.resolve(normalize(id, callingId, pkg), this);
  spade.loadFactory(id, callback);
};

/**
  NOTE: This is a primitive form of the url() method.  Usually you should
  use the require.url() method defined on the require() function in your
  module.

  Returns the URL of the given resource based on the settings of the named
  package.  This method requires the package information to include a `root`
  property that defines the root URL where resources can be found.  
  
  This method is useful for finding non-JavaScript resources such as images,
  video, etc.
  
  @param {String} id
    A module id form of the reference you want to load.
    
  @param {String} ext
    (Optional) and extension to append to the returned URL.
    
  @param {String} callingId
    (Optional) The id of the module requesting the module.  Required if the id 
    you pass in might be relative.

  @param {String} the computed URL.
*/
Sp.url = function(id, ext, callingId) {
  var spade = this.spade, ret, pkg;

  pkg = callingId ? spade.package(callingId) : null;
  id = normalize(id, callingId, pkg);

  pkg = spade.package(id);
  if (!pkg) {
    var packageId = packageIdFor(id)+'/~package';
    if (spade.exists(packageId)) { spade.require(packageId); }
    pkg = spade.package(id);
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

Sp.isDestroyed = false;

Sp.destroy = function() {
  if (!this.isDestroyed) {
    this.isDestroyed = true;
    this.spade.evaluator.teardown(this);
  }
  return this;
};

/**
  Return a new require function for the normalized module ID.  Normally you
  would not call this method yourself but you might override it if you want 
  to add new API to the require() methods passed into modules.
*/
Sp.makeRequire = function(id, spade) {
  var pkg     = spade.package(id),
      sandbox = this,
      require;

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

  require.id = id; // so you can tell one require from another

  return require;
};

// ..........................................................
// LOADER
//

/**
  @constructor 
  
  The Loader object is used to asynchronously load modules from the server.
  It also provides other low-level URL resolution and event handling 
  functions needed to integrate with the low-level environment.  The default
  implementation does not support any kind of async loading.  See the 
  spade-loader package for a way to add support for this.
*/
Loader = function() {
  this._loading = {};
};

Lp = Loader.prototype;

/**
  Called by spade whenever a module is requested that has not already been
  registered in memory.  This function should attempt to load the module if 
  possible, registering any packages on the spade instance.
  
  If a `done` is a function, then this method should run asynchronously -
  invoking the callback when complete.  If the load failed, this method should
  pass an error as the first parameter.  Otherwise it should not pass any 
  parameter.
  
  If `done` is null, then this method should run synchronously and then simply
  return when it is complete.  If the named module cannot be loaded, you can
  just return with no errors as the spade environment will detect this 
  condition and fail.
  
  Note that loaders are not required to support both sync and async loading. 
  If you don't support one or the other, simply throw an error.
  
  @method
  
  @param {Spade} spade
    The spade instance.
    
  @param {String} id
    The normalized module id to load.
    
  @param {Function} done
    (Optional) if passed, run this function async and invoke the done callback
    when complete.
    
  @returns {void}
*/
Lp.loadFactory = null;

/**
  Called by spade whenever it wants to detect if a given module exists and the
  id is not yet registered with the spade instance.
  
  This method should do its best to determine if the module exists and return
  the appropriate value.  Note that if you only support async loading of 
  modules then you may not be able to detect when a module is defined outside
  of what is already registered. In this case it is OK to simply return false.
  
  @method
  
  @param {Spade} spade
    The spade instance.
    
  @param {String} id
    The normalized module id to load
    
  @returns {Boolean} true if module exists
*/
Lp.exists = null;

// NOTE: On ready stuff mostly stolen from jQuery 1.4.  Need to incl here
// because spade will often be used to load jQuery.
// Will only be invoked once.  Just be prepared to call it
/**
  Called once by spade on page load to schedule a ready callback, which should
  be invoked once the documents 'ready' event (or an equivalent) is fired.

  You should never call this method yourself but you might override it when
  using spade outside of a proper browser.

  @param {Function} callback
    The callback to be invoked when the document is 'ready'.
    
  @returns {void}
*/
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

/**
  @constructor
  
  An Evaluator instance is used to evaluate code inside of a sandbox.  A 
  default instance is created on spade and used automatically by sandboxes. 
  You can extend this class and replace the default one on spade in order to
  provide additional new features, such as sandbox isolation or secure eval.

  The default Evaluator simply evals code in the current context using the 
  built-in eval() function.  It does not support isolated sandboxes.  To add
  isolated sandbox support, add the `spade-isolate` package.
*/
Evaluator = function() {};
Ep = Evaluator.prototype;

/**
  Called once on each new sandbox to allow the evaluator to setup any required
  context for future calls.  For isolated sandboxes, this is usually where
  you would create the new compilation context and store it on the sandbox for
  future use.
  
  The default implementation does nothing, but will throw an exception if you
  try to setup a new isolated sandbox. (Since the feature is not supported.).
  If you override this method, you do not need to call the default function.
  
  @param {Sandbox} sandbox
    The sandbox to setup.
    
  @returns {void}
*/
Ep.setup = function(sandbox) {
  if (sandbox.isIsolated) { 
    throw new Error("Isolated sandboxes are not supported."); 
  }
};

/**
  Evaluates the passed JavaScript within the context of a sandbox and returns
  the resulting value (usually a function).  The default version simply calls
  the built-in eval().
  
  @param {String} text
    The code to evaluate.
    
  @param {Sandbox} sandbox
    The sandbox owning the code.
    
  @param {String} filename
    An optional filename to associate with the text (may be useful for debug
    support)
    
  @returns {Object} evaluated result.
*/
Ep.evaluate = function(text, sandbox, filename) {
  return eval(text);
};

/**
  Called once by the sandbox when it is destroyed to allow the evaluator to
  cleanup any data it might have stashed on the sandbox.  For isolated 
  sandboxes, this method might destroy the compilation context to allow its 
  memory to be reclaimed.
  
  Since the default evaluator does not support isolated contexts, this method
  is a no-op.
  
  @param {Sandbox} sandbox
    The sandbox about to be destroyed.
    
  @returns {void}
*/
Ep.teardown = function(sandbox) {
  // noop by default
};

// ..........................................................
// Spade Class - defined so we can recreate
//

/**
  @constructor
  
  The root object used to coordinate the entire spade environment.  A global
  instance of this class is created on page load called `spade`.  Most of the
  time you will only interact with this object directly to register new 
  modules and perhaps to load a new module outside of traditional module code.
  
  Note that if you are using BPM and your app is actually published as modules
  then you won't actually need reference this object at all as the details are
  handled for you.

  # Registering a Module
  
  If you are manually constructing a JavaScript file to load from the server
  and you want to register new modules, you will need to use the
  `spade.register()` method:
  
      spade.register('package_name/module_name', function() { ... });
      
  This will make the module `package_name/module_name` available to all other
  modules.  The first time the module is required, your passed function will
  be called.
  
  You can also register metadata about a package by registering the 
  `package_name/~package` module:
  
      spade.register('package_name/~package', { 
        "name": "package_name",
        "version": "1.0.0",
        ...
      });
      
  Note that in addition to factory functions you can also pass in JSON hashes
  (which will simply be returned directory) or a string of code - which will
  be eval'd on demand.
  
  The string format is particularly important because defining modules as 
  strings can dramatically improve load time on mobile devices while also 
  allowing you to easily support isolated sandbox contexts.
  
  # Requiring a Module
  
  Normally when you write module code that is managed by Spade you will have
  a `require()` method defined within the module that you should use to load
  modules.
  
  If you happen to be writing code outside of a spade module and need to 
  require a module, however, you can use the `spade.require()` method instead:
  
      var jQuery = spade.require('jquery');
      
  This works just like the built-in require method except it will not support
  relative modules (since there is no module to be relative too).  This 
  method will require modules from the default sandbox, found at 
  `spade.defaultSandbox`.
  
  # Plugins
  
  Spade supports a number of plugins that you can use to enhance the way 
  spade discovers and loads modules.  The two plugins currently supported are
  a `loader` and `evaluator`.
  
  The `loader` plugin is used to asynchronously discover and load modules. It
  expects the object to be an instance of Spade.Loader.  See `Loader` 
  documentation for more information.
  
  The `evaluator` plugin is used to evaluate code within a sandbox context. It
  can be enhanced to support isolated sandboxes as well as worker threads and
  many other contexts.  See the `Evaluator` documentation for more 
  information.
  
*/
Spade = function() {
  this.loader   = new this.Loader(this);
  this.evaluator = new this.Evaluator(this);
  this.defaultSandbox  = this.sandbox();
  this._factories = {};
  this._packages  = {};
};

Tp = Spade.prototype;

Tp.VERSION  = "1.0.0";

// expose the classes.  We do it this way so that you can create a new
// Spade instance and treat it like the spade module
Tp.Spade    = Spade;
Tp.Sandbox  = Sandbox;
Tp.Loader   = Loader;
Tp.Evaluator = Evaluator;

/**
  Computes and returns a normalized ENV hash.  By default this will look for
  a globally defined variable called `ENV` and use that.  If not defined,
  it will look for a locally defined `ENV` variable instead.
  
  In either case, this method will also normalize the variable to include at
  least the `LANG` and `SPADE_PLATFORM` properties.
  
  @returns {Hash} the environment hash
*/
Tp.env = function() {
  var env = this.ENV;
  if (!env) { this.ENV = env = ('undefined' !== typeof ENV) ? ENV : {}; }
  if (!env.SPADE_PLATFORM) { env.SPADE_PLATFORM = 'browser'; }
  if (!env.LANG) {
    env.LANG = ('undefined' !== typeof navigator) ? navigator.language : 'en-US';
  }
    
  return env;
};

/**
  Computes and returns the ARGV array for the current spade environment.  By
  default this will look for a globally defined variable called `ARGV` and 
  use that.
  
  ARGV is a useful way to pass in startup options to spade modules.
  
  @returns {Array} the argv array
*/
Tp.argv = function() {
  var argv = this.ARGV;
  if (!argv) { argv= this.ARGV = ('undefined' !== typeof ARGV) ? ARGV : []; }
  return argv;
};

/**
  Restores original values after a call to `spade.globalize()`.  If you call 
  this method more than once it will have no effect.
  
  @returns {void}
*/
Tp.noConflict = function() {
  var c = this._conflict;
  if (c) {
    delete this._conflict;
    spade = this._conflict;
  }
  return this;
};

/**
  Returns a new sandbox instance attached to the current spade instance.
  If you pass true for the `isolate` parameter, the new sandbox will attempt
  to load its code in an isolated compilation context (possibly using an 
  iframe in browsers).  Note that isolated sandboxes are not supported by 
  default.  Include the spade-isolate package instead.

  @param {String} name
    (Optional) name for the sandbox for debugging purposes.
  
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

  @returns {void}
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

  // Store with generic id if none, or if JS
  this._factories[id] = factory;
  return this;
};

/**
  Efficient way to register external packages.  Pass a hash of packageIds
  and source URLs.  If the package is already registered, the extern will
  not replace it so this is safe to call multiple times.
  
  @param {Hash} externs
    A hash of package names and package settings.
    
  @returns {void}
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

/**
  Returns true if the passed module exists in the default sandbox.
  
  @param {String} id
    The module id to check.
    
  @returns {Boolean} true if module id exists
*/
Tp.exists = function(id) {
  return this.defaultSandbox.exists(id);
};

/**
  Returns the URL for a resource matching the passed module id and optional
  extension.
  
  @param {String} id
    the module id to resolve
  
  @param {String} ext
    (Optional) extension to append to URL
    
  @returns {String} url
*/
Tp.url = function(id, ext) {
  return this.defaultSandbox.url(id, ext);
};

/**
  Called by the sandbox to get a factory object for the named moduleId.  
  Normally you will not need to call this method directly or even override it.
  
  @param {String} id
    Fully normalized module id
    
  @param {Function} callback
    (Optional) callback to invoke once factory is loaded.  If not passed, this
    method will run sync.  Otherwise it will run async.
    
  @returns {Hash} factory hash.
*/
Tp.loadFactory = function(id, callback) {
  
  var ret = this._factories[id],
      loader = this.loader;

  if (callback) {
    if (!ret) {
      if (loader && loader.loadFactory) {
        loader.loadFactory(this, id, callback);
      } else { callback(new Error('Module '+id+' not found')); }
    } else { callback(); }

  } else if (!ret && loader && loader.loadFactory) {
    loader.loadFactory(this, id);
    ret = this._factories[id];
  }

  return ret ;
};

/**
  Called by the sandbox to determine if the named id exists on the system.
  The id should already be normalized.  If the id is not yet registered, the
  loader will also be consulted.
  
  Normally you will not need to call this method directly or override it.
  
  @param {String} id
    Fully normalized module id
    
  @returns {Boolean} true if factory exists
*/
Tp.factoryExists = function(id) {
  if (this._factories[id]) { return true; }
  var loader = this.loader;
  return loader && loader.exists && loader.exists(this, id);
};

/**
  Returns the package info, if any, for the named module or packageId
  
  @param {String} id
    A package name or fully normalized module id.
    
  @returns {Hash} package info or null if package is not registered
*/
Tp.package = function(id) {
  id = packageIdFor(normalize(id))+'/~package';
  var ret = this._factories[id];
  return ret ? ret.data : null;
};

/**
  Normalize a moduleId, expanding relative values if needed.
  
  @param {String} id
    The module id, possibly de-normalized.
    
  @param {String} contextId
    (Optional) The normalized module id of the calling module.  Required if 
    your module id might be relative.
    
  @returns {String} the normalized module id
*/
Tp.normalize = function(id, contextId) {
  return normalize(id, contextId);
};

/**
  Maps the passed module id to a potentially location specific module id.
  This gives the loader a way to vary the factory function returns for a given
  module id per sandbox.  Useful when supporting multiple versions of the 
  same package.
  
  @param {String} id
    Normalized module id
    
  @param {Sandbox} sandbox
    The requesting sandbox
    
  @returns {String} resolved module id
*/
Tp.resolve = function(id, sandbox) {
  var loader = this.loader;
  return sandbox && loader && loader.resolve ? loader.resolve(id, sandbox):id;
};

/**
  Invokes the passed callback when the browser is ready.  This will work 
  regardless of the environment you are in.
  
  @param {Function} callback
    Invoked when the browser is ready.  If browser is alrady ready, invoked
    immediately.
    
  @returns {void}
*/
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
      if (this.loader.scheduleReady) {
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
var newSpade = new Spade();
if ('undefined' !== typeof spade) newSpade._conflict = spade;
spade = newSpade;

// make this work when called as a module - both from within spade and from
// node.
if ('undefined' !== typeof require) {
  if ('undefined' !== typeof __module) { __module.exports = spade; }
  else if ('undefined' !== typeof module) { module.exports = spade; }
}

})();
