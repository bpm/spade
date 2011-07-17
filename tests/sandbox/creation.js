// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {

var t = {}, Spade = spade.Spade, Sandbox = spade.Sandbox;
  

module('spade: Sandbox Creation', {
  setup: function() {
    t.spade = new Spade(); 
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('basic sandbox', function() {
  var spade = t.spade,
      sandbox = new Sandbox(spade);
      
  // note: using equal() here causes an infinite loop for some reason
  ok(sandbox.spade === spade, 'sandbox.spade == spade');
  equal(sandbox.name, '(anonymous)');
  equal(sandbox.isIsolated, false);
});

test('named sandbox', function() {
  var sandbox = new Sandbox(t.spade, 'Test Sandbox');

  equal(sandbox.name, 'Test Sandbox');
});

test('isolated sandbox', function() {
  var sandbox = new Sandbox(t.spade, 'Test Sandbox', true),
      sandbox2 = new Sandbox(t.spade, true);

  equal(sandbox.isIsolated, true);
  equal(sandbox2.isIsolated, true);
});

})();

