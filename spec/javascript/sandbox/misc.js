// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade,
    Sandbox = require('spade').Sandbox;

Ct.module('spade: Sandbox Miscellaneous');

Ct.setup(function(t){
  t.sandbox = new Sandbox(new Spade(), 'Test Sandbox');
});

Ct.teardown(function(t){
  delete t.sandbox;
});

Ct.test('toString', function(t){
  t.equal(t.sandbox.toString(), '[Sandbox Test Sandbox]');
});

Ct.test("exists", function(t){
  t.sandbox.spade.register('test', { name: 'test' });
  t.sandbox.spade.register('test/main', '');

  t.ok(t.sandbox.exists('test'), "test should exist");
  t.ok(!t.sandbox.exists('missing'), "missing should not exist");
});

Ct.test("async", function(t){
  t.sandbox.spade.register('test', { name: 'test' });
  t.sandbox.spade.register('test/main', 'exports.hello = "hi";');

  t.deepEqual(t.sandbox.async('test'), {
    "data": "exports.hello = \"hi\";",
    "filename": "test/main",
    "format": "js",
    "skipPreprocess": false
  });
});

Ct.test("url", function(t){
  t.sandbox.spade.register('no-root', { name: 'no-root' });
  t.sandbox.spade.register('with-root', { name: 'with-root', root: 'root/url' });

  t.throws(function(){ t.sandbox.url('missing') }, "Can't get url for non-existent package missing/main");
  t.throws(function(){ t.sandbox.url('no-root') }, "Package for no-root/main does not support urls");
  t.equal(t.sandbox.url('with-root'), 'root/url/main');
});

Ct.test("destroy", function(t){
  t.equal(t.sandbox.isDestroyed, false);
  t.sandbox.destroy();
  t.equal(t.sandbox.isDestroyed, true);
});
