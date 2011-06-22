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

Ct.module('spade: basic require');

Ct.setup(function(t) {
  t.spade = new Spade();
});

Ct.teardown(function(t) {
  delete t.spade;
});


Ct.test('register then require a module', function(t) {
  var spade = t.spade;

  spade.register('foo/bar', function(require, exports) {
    exports.foo = 'bar';
  });

  var exp = spade.require('foo/bar');
  t.equal(exp.foo, 'bar', 'exports.foo == bar - means require succeeded');
});

Ct.test('register a string factory then require', function(t) {
  var spade = t.spade;

  spade.register('foo/bar', "exports.foo = 'bar';");

  var exp = spade.require('foo/bar');
  t.equal(exp.foo, 'bar', 'exports.foo == bar - means require succeeded');
});

Ct.test('require a non-existant module will throw an exception', function(t) {
  var spade = t.spade;
  t.throws(function() {
    spade.require('imaginary/foo');
  }, 'Module imaginary/foo not found');
});

Ct.test('require a module that was just registered symbolically.  This is for compatibility with non-module items', function(t) {
  var spade = t.spade;
  spade.register('not/a-module');
  t.ok(spade.require('not/a-module'));
});

Ct.test('require system installed packages');


// ..........................................................
// BASIC REQUIRE
//

Ct.module('spade: extension require');

Ct.setup(function(t) {
  t.spade = new Spade();

  t.spade.register('foo', {
    'plugin:formats': {
      'css': 'foo/format',
      'txt': 'foo/format'
    }
  });
  t.spade.register('foo/format', "exports.compileFormat = function(code){ return code; };");
  t.spade.register('foo/bar', "exports.foo = 'bar.js';",  { format: 'js' });
  t.spade.register('foo/bar', "exports.foo = 'bar.css';", { format: 'css' });
});

Ct.teardown(function(t) {
  delete t.spade;
});


Ct.test('valid extension', function(t) {
  var exp = t.spade.require('foo/bar.js');
  t.equal(exp.foo, 'bar.js', 'exports.foo == bar.js - means require succeeded');
});

Ct.test('same name different extensions', function(t){
  var spade  = t.spade,
      jsExp  = spade.require('foo/bar.js'),
      cssExp = spade.require('foo/bar.css');

  t.equal(jsExp.foo,  'bar.js',  'exports.foo == bar.js - means require succeeded');
  t.equal(cssExp.foo, 'bar.css', 'exports.foo == bar.css - means require succeeded');
});

Ct.test("don't load file for different extension", function(t){
  t.throws(function(){ t.spade.require('foo/bar.txt'); }, Error, 'adfaff');
});

Ct.test("defaults to js", function(t){
  var exp = t.spade.require('foo/bar');
  t.equal(exp.foo, 'bar.js', 'exports.foo == bar.js - means required js as default');
});

Ct.test("defaults to first registered if no js", function(t){
  var spade = t.spade;

  spade.register('foo/baz', "exports.foo = 'baz.css';", { format: 'css' });
  spade.register('foo/baz', "exports.foo = 'baz.txt';", { format: 'txt' });

  var exp = spade.require('foo/baz');
  t.equal(exp.foo, 'baz.css', 'exports.foo == baz.css - means required last registered');
});
