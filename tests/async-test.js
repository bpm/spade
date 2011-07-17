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

module('spade: async require', {
  setup: function() {
    t.spade = new Spade(); 

    // preload a module
    t.spade.register('foo/baz', function(require,e) { 
      e.id = 'foo/baz'; 
      e.async = require.async; // export for testing
    });

    // dummy loader loads only foo/bar on demand after delay
    t.spade.loader = {

      requests: 0, 

      loadFactory: function(spade, id, done) {
        this.requests++;
        if (id === 'foo/bar') {
          setTimeout(function() {
            spade.register(id, function(r,e) { e.id='foo/bar'; });
            done();
          }, 10);

        } else {
          done('Not Found'); // immediately
        }
      }
    };
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('should not talk to loader if registered', function() {
  var spade = t.spade;

  stop(1000);
  
  spade.async('foo/baz', function(err) {
    start();
    equal(err, null);
    equal(spade.loader.requests, 0, 'loader should not have been called');
    equal(spade.require('foo/baz').id, 'foo/baz', 'should find foo');
  });
  
});

test('should let loader register', function() {
  var spade = t.spade;
  stop(1000);
  spade.async('foo/bar', function(err) {
    start();
    equal(err, null);
    equal(spade.loader.requests, 1, 'loader should have been called');
    equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
  });
});


test('should normalize id', function() {
  var spade = t.spade;
  stop(1000);
  spade.async('/./foo/baz/../bar', function(err) {
    start();
    equal(err, null);
    equal(spade.loader.requests, 1, 'loader should have been called');
    equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
  });
});


test('should expose async inside of module', function() {
  var spade = t.spade;
  stop(1000);

  var async = spade.require('foo/baz').async;
  ok(async, 'should have an async function');
  
  // normalize relative to async
  async('./bar', function(err) {
    start();
    equal(err, null);
    equal(spade.loader.requests, 1, 'loader should have been called');
    equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
  });
});


test('should return err if loader does not register', function() {
  var spade = t.spade;
  stop(1000);
  spade.async('imaginary/bar', function(err) {
    start();
    equal(err, 'Not Found');
    equal(spade.loader.requests, 1, 'loader should have been called');

    raises(function() {
      spade.require('imaginary/bar');
    });
  });
  
});

})();
