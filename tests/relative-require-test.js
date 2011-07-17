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

module('spade: relative require', {
  setup: function() {
    t.spade = new Spade(); 

    ['foo', 'bar'].forEach(function(id) {
      t.spade.register(id, { "name": id });
    });

    // register some dummy modules.  These will just set an 'id' prop on exports
    ['foo/bar', 'bar/main', 'foo/bar/baz'].forEach(function(id) {
      t.spade.register(id, function(r, e) { e.id = id; });
    });
  },
  
  teardown: function() {
    delete t.spade;
  }
});

test('require absolute', function() {
  var spade = t.spade;

  spade.register('blah/main', function(require, e) {
    e.found = require('foo/bar').id;
  });

  equal(spade.require('blah').found, 'foo/bar');
});

test('require relative top level', function() {
  var spade = t.spade;
  spade.register('blah/main', function(require, e) { 
    e.found = require('../bar').id; 
  });
  
  equal(spade.require('blah').found, 'bar/main');
});

test('require relative nested', function() {
  var spade = t.spade;
  spade.register('foo/blah', function(require, e) { 
    e.found = require('./bar').id; 
  });
  
  equal(spade.require('foo/blah').found, 'foo/bar');
});

test('require relative  up nested', function() {
  var spade = t.spade;
  spade.register('bar/blah', function(require, e) { 
    e.found = require('../foo/bar/baz').id; 
  });
  
  equal(spade.require('bar/blah').found, 'foo/bar/baz');
});

})();