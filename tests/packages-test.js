// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade deepEqual */

(function() {
  
var t = {}, Spade = spade.Spade;

module('spade: packages', {
  setup: function() {
    t.spade = new Spade();
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('should find registered package', function() {
  
  var spade = t.spade;
  spade.register('PKG', { name: 'PKG' });
  
  equal(spade.package('PKG').name, 'PKG');
  equal(spade.package('PKG/foo/bar').name, 'PKG');
  
});

test('should respect mappings', function() {
  
  var spade = t.spade;
  spade.register('PKG', { mappings: { foo: 'FOO' } });
  
  spade.register('PKG/bar', function(require, exports) {
    exports.id = require('foo/foo').id;
  });
  
  spade.register('FOO/foo', function(r, e) { e.id = 'FOO'; });
  
  equal(spade.require('PKG/bar').id, 'FOO'); // should remap pkg name
  
});

test('should set default directories', function() {
  var spade = t.spade;
  spade.register('PKG', { name: 'PKG' });
  deepEqual(spade.package('PKG').directories, { 'lib': ['lib'] });
});

})();
