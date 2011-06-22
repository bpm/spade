// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade,
    Sandbox = require('spade').Sandbox;


Ct.module('spade: Sandbox Creation');

Ct.setup(function(t) {
  t.spade = new Spade(); 
});

Ct.teardown(function(t) { 
  delete t.spade;
});

Ct.test('basic sandbox', function(t) {
  var spade = t.spade,
      sandbox = new Sandbox(spade);

  t.equal(sandbox.spade, spade);
  t.equal(sandbox.name, '(anonymous)');
  t.equal(sandbox.isIsolated, false);
});

Ct.test('named sandbox', function(t) {
  var sandbox = new Sandbox(t.spade, 'Test Sandbox');

  t.equal(sandbox.name, 'Test Sandbox');
});

Ct.test('isolated sandbox', function(t) {
  var sandbox = new Sandbox(t.spade, 'Test Sandbox', true),
      sandbox2 = new Sandbox(t.spade, true);

  t.equal(sandbox.isIsolated, true);
  t.equal(sandbox2.isIsolated, true);
});

