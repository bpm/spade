// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade,
    Sandbox = require('spade').Sandbox;

Ct.module('spade: Sandbox require');

Ct.setup(function(t) {
  t.sandbox = new Sandbox(new Spade()); 
  t.sandbox.spade.register('testing', { name: 'testing' });
  t.sandbox.spade.register('testing/main', "exports.hello = 'hi';");
});

Ct.teardown(function(t) { 
  delete t.sandbox;
});

Ct.test("require new", function(t){
  t.equal(t.sandbox.require('testing').hello, 'hi');
});

// NOTE: This test doesn't necessarily tell us that anything special is happening, just that it works
Ct.test("require existing", function(t){
  // Cache it
  t.sandbox.require('testing');
  // Now require again
  t.equal(t.sandbox.require('testing').hello, 'hi');
});

// TODO: I'm not actually sure how this should work - PW
Ct.test("require circular");
/*
Ct.test("require circular", function(t){
  t.sandbox.spade.register('testing/file1', "exports.value = require('testing/file2').value * 2;");
  t.sandbox.spade.register('testing/file2', "exports.value = require('testing/file1').value * 2;");
  t.equal(t.sandbox.require('testing/file1').value, 4);
});
*/

Ct.test("throw if doesn't exist", function(t){
  t.throws(function(){ t.sandbox.require('missing'); }, "Module missing not found");
});

