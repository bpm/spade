// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade;

Ct.module('spade: packages');

Ct.setup(function(t) {
  t.spade = new Spade(); 
});

Ct.teardown(function(t) { 
  delete t.spade;
});

Ct.test('should find registered package', function(t) {
  
  var spade = t.spade;
  spade.register('PKG', { name: 'PKG' });
  
  t.equal(spade.package('PKG').name, 'PKG');
  t.equal(spade.package('PKG/foo/bar').name, 'PKG');
  
});

Ct.test('should respect mappings', function(t) {
  
  var spade = t.spade;
  spade.register('PKG', { mappings: { foo: 'FOO' } });
  
  spade.register('PKG/bar', function(require, exports) {
    exports.id = require('foo/foo').id;
  });
  
  spade.register('FOO/foo', function(r, e) { e.id = 'FOO'; });
  
  t.equal(spade.require('PKG/bar').id, 'FOO'); // should remap pkg name
  
});

