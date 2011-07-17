// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {

var t = {}, Spade = spade.Spade, Sandbox = spade.Sandbox;
  

module('spade: Sandbox Miscellaneous', {
  setup: function() {
    t.sandbox = new Sandbox(new Spade(), 'Test Sandbox');
  },
  
  teardown: function() {
    delete t.sandbox;
  }
});

test('toString', function(){
  equal(t.sandbox.toString(), '[Sandbox Test Sandbox]');
});

test("exists", function(){
  t.sandbox.spade.register('test', { name: 'test' });
  t.sandbox.spade.register('test/main', '');

  ok(t.sandbox.exists('test'), "test should exist");
  ok(!t.sandbox.exists('missing'), "missing should not exist");
});

test("async", function(){
  t.sandbox.spade.register('test', { name: 'test' });
  t.sandbox.spade.register('test/main', 'exports.hello = "hi";');

  stop(1000);
  t.sandbox.async('test', function(err) {
    equals(err, null, 'should not return an error');
    start();
  });
});

test("url", function(){
  t.sandbox.spade.register('no-root', { name: 'no-root' });
  t.sandbox.spade.register('with-root', { name: 'with-root', root: 'root/url' });

  raises(function(){ t.sandbox.url('missing'); }, "Can't get url for non-existent package missing/main");
  raises(function(){ t.sandbox.url('no-root'); }, "Package for no-root/main does not support urls");
  equal(t.sandbox.url('with-root'), 'root/url/main');
});

test("destroy", function(){
  equal(t.sandbox.isDestroyed, false);
  t.sandbox.destroy();
  equal(t.sandbox.isDestroyed, true);
});

})();

