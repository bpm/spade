// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {

var t = {}, Spade = spade.Spade, Sandbox = spade.Sandbox;
  

module('spade: Sandbox require', {
  setup: function() {
    t.sandbox = new Sandbox(new Spade()); 
    t.sandbox.spade.register('testing', { name: 'testing' });
    t.sandbox.spade.register('testing/main', "exports.hello = 'hi';");
  },
  
  teardown: function() {
    delete t.sandbox;
  }
});

test("require new", function(){
  equal(t.sandbox.require('testing').hello, 'hi');
});

// NOTE: This test doesn't necessarily tell us that anything special is happening, just that it works
test("require existing", function(){
  // Cache it
  t.sandbox.require('testing');
  // Now require again
  equal(t.sandbox.require('testing').hello, 'hi');
});

test("throw if doesn't exist", function(){
  raises(function(){ t.sandbox.require('missing'); }, "Module missing not found");
});

})();


