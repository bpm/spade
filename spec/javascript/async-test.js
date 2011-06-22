// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2010 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================
/*globals Ct */

require('core-test');

var Spade = require('spade').Spade;

// ..........................................................
// BASIC REQUIRE
// 

Ct.module('spade: async require');

Ct.setup(function(t, done) {
  t.spade = new Spade(); 
  
  // preload a module
  t.spade.register('foo/baz', function(require,e) { 
    e.id = 'foo/baz'; 
    e.async = require.async; // export for testing
  });
  
  // dummy loader loads only foo/bar on demand after delay
  t.spade.loader = {
    
    requests: 0, 
    
    loadFactory: function(spade, id, formats, done) {
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
  
  done();
});

Ct.teardown(function(t, done) { 
  delete t.spade;
  done();
});

Ct.test('should not talk to loader if registered', function(t, done) {
  var spade = t.spade;

  t.timeout(1000);
  
  spade.async('foo/baz', function(err) {
    t.equal(err, null);
    t.equal(spade.loader.requests, 0, 'loader should not have been called');
    t.equal(spade.require('foo/baz').id, 'foo/baz', 'should find foo');
    done();
  });
  
});

Ct.test('should let loader register', function(t, done) {
  var spade = t.spade;
  t.timeout(1000);
  spade.async('foo/bar', function(err) {
    t.equal(err, null);
    t.equal(spade.loader.requests, 1, 'loader should have been called');
    t.equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
    done();
  });
});


Ct.test('should normalize id', function(t, done) {
  var spade = t.spade;
  t.timeout(1000);
  spade.async('/./foo/baz/../bar', function(err) {
    t.equal(err, null);
    t.equal(spade.loader.requests, 1, 'loader should have been called');
    t.equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
    done();
  });
});


Ct.test('should expose async inside of module', function(t, done) {
  var spade = t.spade;
  t.timeout(1000);

  var async = spade.require('foo/baz').async;
  t.ok(async, 'should have an async function');
  
  // normalize relative to async
  async('./bar', function(err) {
    t.equal(err, null);
    t.equal(spade.loader.requests, 1, 'loader should have been called');
    t.equal(spade.require('foo/bar').id, 'foo/bar', 'should find foo');
    done();
  });
});


Ct.test('should return err if loader does not register', function(t, done) {
  var spade = t.spade;
  t.timeout(1000);
  spade.async('imaginary/bar', function(err) {
    t.equal(err, 'Not Found');
    t.equal(spade.loader.requests, 1, 'loader should have been called');

    t.throws(function() {
      spade.require('imaginary/bar');
    });
    done();
  });
  
});

