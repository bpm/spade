// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade raises */

(function() {
  
var t = {},
    Spade = spade.Spade;
    
// ..........................................................
// BASIC REQUIRE
//

module('spade: basic require', {
  setup: function() {
    t.spade = new Spade();
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('register then require a module', function() {
  var spade = t.spade;

  spade.register('foo/bar', function(require, exports) {
    exports.foo = 'bar';
  });

  var exp = spade.require('foo/bar');
  equal(exp.foo, 'bar', 'exports.foo == bar - means require succeeded');
});

test('register a string factory then require', function() {
  var spade = t.spade;

  spade.register('foo/bar', "exports.foo = 'bar';");

  var exp = spade.require('foo/bar');
  equal(exp.foo, 'bar', 'exports.foo == bar - means require succeeded');
});

test('require a non-existant module will throw an exception', function() {
  var spade = t.spade;
  raises(function() {
    spade.require('imaginary/foo');
  }, 'Module imaginary/foo not found');
});

test('require a module that was just registered symbolically.  This is for compatibility with non-module items', function() {
  var spade = t.spade;
  spade.register('not/a-module');
  ok(spade.require('not/a-module'));
});

})();
