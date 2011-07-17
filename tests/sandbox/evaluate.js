// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {

var t = {}, Spade = spade.Spade, Sandbox = spade.Sandbox;
  

module('spade: Sandbox evaluation', {
  setup: function() {
    t.sandbox = new Sandbox(new Spade());
  },
  
  teardown: function() {
    delete t.sandbox;
  }
});

test('normal', function(){
  equal(t.sandbox._evaluatorInited, undefined);
  equal(t.sandbox.evaluate('2 * 2'), 4);
  equal(t.sandbox._evaluatorInited, true);
});

test('already initialized', function(){
  // Initialize
  t.sandbox.evaluate('');
  // Test
  equal(t.sandbox.evaluate('3 * 3'), 9);
});

test('destroyed', function(){
  t.sandbox.destroy();
  raises(function(){ t.sandbox.evaluate('4 * 4'); }, Error, "Sandbox destroyed");
});

})();

