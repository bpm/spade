// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade;

// ..........................................................
// BASIC REQUIRE
// 

Ct.module('spade: normalize');

Ct.setup(function(t) {
  t.spade = new Spade(); 
});

Ct.teardown(function(t) { 
  delete t.spade;
});

Ct.test('normalize', function(t) {
  var spade = t.spade;
  t.equal(spade.normalize('foo/bar'), 'foo/bar');
  t.equal(spade.normalize('./foo', 'bar/baz'), 'bar/foo');
  t.equal(spade.normalize('../foo', 'bar/baz'), 'foo/main');
  t.equal(spade.normalize('foo/../bar//foo/./baz', 'bar/baz'), 'bar/foo/baz');

  t.equal(spade.normalize('/foo/./bar'), 'foo/bar');
  t.equal(spade.normalize('foo/../bar/'), 'bar/main');
  t.equal(spade.normalize('/foo/../bar/'), 'bar/main');

  t.equal(spade.normalize('/foo/bar'), 'foo/bar');
  t.equal(spade.normalize('foo/bar/'), 'foo/bar');
  t.equal(spade.normalize('/foo/bar/'), 'foo/bar');
  
  t.equal(spade.normalize('PKG/foo/bar'), 'PKG/foo/bar');
  t.equal(spade.normalize('BAR/foo', 'PKG/bar/baz'), 'BAR/foo');
  t.equal(spade.normalize('./foo', 'PKG/bar/baz'), 'PKG/bar/foo');
  t.equal(spade.normalize('../foo', 'PKG/bar/baz'), 'PKG/foo');
  t.equal(spade.normalize('./foo/../../bar//foo/./baz', 'PKG/bar/baz'), 'PKG/bar/foo/baz');
  
});

Ct.test('normalize package', function(t) {
  var spade = t.spade;
  spade.register('sproutcore', {}); // register as a package
  t.equal(spade.normalize('sproutcore'), 'sproutcore/main');
  t.equal(spade.normalize('foo/sproutcore'), 'foo/sproutcore');
});

Ct.test('normalize relative require from main', function(t) {
  // I think this is a valid test, but not certain
  var spade = t.spade, mainRequire, otherRequire;
  spade.register('foo', { main: './lib/foo', directories: { lib: './lib/foo' } });
  spade.register('foo/main', 'return require;');
  spade.register('foo/other/main', 'return require;');
  mainRequire = spade.require('foo/main');
  otherRequire = spade.require('foo/other/main');
  t.equal(mainRequire.normalize('./foo/adfadf'), 'foo/adfadf', 'works for real main');
  t.equal(otherRequire.normalize('./foo/core'), 'foo/other/foo/core', "no difference for fake main");
});

Ct.test('normalize tilde paths with lib', function(t){
  var spade = t.spade, fooRequire;
  spade.register('foo', { directories: { lib: './lib' }}); // register as a package
  spade.register('foo/main', 'return require;');
  fooRequire = spade.require('foo');
  t.equal(fooRequire.normalize('foo/~lib/main'), 'foo/main');
  t.equal(fooRequire.normalize('foo/~lib/core'), 'foo/core');
});
