// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade,
    Sandbox = require('spade').Sandbox;

Ct.module('spade: Sandbox evaluation');

Ct.setup(function(t) {
  t.sandbox = new Sandbox(new Spade());
});

Ct.teardown(function(t) {
  delete t.sandbox;
});

Ct.test('normal', function(t){
  t.equal(t.sandbox._evaluatorInited, undefined);
  t.equal(t.sandbox.evaluate('2 * 2'), 4);
  t.equal(t.sandbox._evaluatorInited, true);
});

Ct.test('already initialized', function(t){
  // Initialize
  t.sandbox.evaluate('');
  // Test
  t.equal(t.sandbox.evaluate('3 * 3'), 9);
});

Ct.test('destroyed', function(t){
  t.sandbox.destroy();
  t.throws(function(){ t.sandbox.evaluate('4 * 4'); }, Error, "Sandbox destroyed");
});
