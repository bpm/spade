// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {
  
var t = {};   
var t3; 

// ..........................................................
// BASIC REQUIRE
// 

module('spade: normalize', {
  setup: function() {
    t.spade = new spade.Spade(); 
  }, 
  
  teardown: function() {
    delete t.spade;
  }
});

test('normalize', function() {
  var spade = t.spade;
  equal(spade.normalize('foo/bar'), 'foo/bar');
  equal(spade.normalize('./foo', 'bar/baz'), 'bar/foo');
  equal(spade.normalize('../foo', 'bar/baz'), 'foo/main');
  equal(spade.normalize('foo/../bar//foo/./baz', 'bar/baz'), 'bar/foo/baz');

  equal(spade.normalize('/foo/./bar'), 'foo/bar');
  equal(spade.normalize('foo/../bar/'), 'bar/main');
  equal(spade.normalize('/foo/../bar/'), 'bar/main');

  equal(spade.normalize('/foo/bar'), 'foo/bar');
  equal(spade.normalize('foo/bar/'), 'foo/bar');
  equal(spade.normalize('/foo/bar/'), 'foo/bar');
  
  equal(spade.normalize('PKG/foo/bar'), 'PKG/foo/bar');
  equal(spade.normalize('BAR/foo', 'PKG/bar/baz'), 'BAR/foo');
  equal(spade.normalize('./foo', 'PKG/bar/baz'), 'PKG/bar/foo');
  equal(spade.normalize('../foo', 'PKG/bar/baz'), 'PKG/foo');
  equal(spade.normalize('./foo/../../bar//foo/./baz', 'PKG/bar/baz'), 'PKG/bar/foo/baz');
  
});

test('normalize package', function() {
  var spade = t.spade;
  spade.register('sproutcore', {}); // register as a package
  equal(spade.normalize('sproutcore'), 'sproutcore/main');
  equal(spade.normalize('foo/sproutcore'), 'foo/sproutcore');
});

test('normalize relative require from main', function() {
  // I think this is a valid test, but not certain
  var spade = t.spade, mainRequire, otherRequire;
  spade.register('foo', { main: './lib/foo', directories: { lib: './lib/foo' } });
  spade.register('foo/main', 'return require;');
  spade.register('foo/other/main', 'return require;');
  mainRequire = spade.require('foo/main');
  otherRequire = spade.require('foo/other/main');
  equal(mainRequire.normalize('./foo/adfadf'), 'foo/adfadf', 'works for real main');
  equal(otherRequire.normalize('./foo/core'), 'foo/other/foo/core', "no difference for fake main");
});

test('normalize tilde paths with lib', function() {
  var spade = t.spade, fooRequire;
  spade.register('foo', { directories: { lib: './lib' }}); // register as a package
  spade.register('foo/main', 'return require;');
  fooRequire = spade.require('foo');
  equal(fooRequire.normalize('foo/~lib/main'), 'foo/main');
  equal(fooRequire.normalize('foo/~lib/core'), 'foo/core');
});

})();
