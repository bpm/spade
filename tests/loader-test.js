// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals spade */

(function() {

var t = {}, Spade = spade.Spade;
  
// ..........................................................
// BASIC REQUIRE
// 

module('spade: loader', {
  setup: function() {
    t.spade = new Spade(); 

    // preload a module
    t.spade.register('foo/main', function(r, e) { e.id = 'foo'; });

    // dummy loader loads only foo/bar on demand
    t.spade.loader = {

      requests: 0, 

      loadFactory: function(spade, id, formats, done) {
        this.requests++;
        if (id === 'foo/bar') {
          spade.register(id, function(r,e) { e.id='foo/bar'; });
        }
        if (done) throw "should not be passed done"
      }
    };
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('should not talk to loader if module is registered', function() {
  var spade = t.spade;
  equal(spade.require('foo').id, 'foo', 'should find foo');
  equal(spade.loader.requests, 0, 'loader should not have been called');
});

test('should let loader register', function() {
  var spade = t.spade;
  equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
  equal(spade.loader.requests, 1, 'loader should have been called');
});

test('should throw if loader does not register', function() {
  var spade = t.spade;
  raises(function() {
    spade.require('imaginary/bar');
  });
  equal(spade.loader.requests, 1, 'loader should have been called');
});

})();
