// ==========================================================================
// Project:   Spade - CommonJS Runtime
// Copyright: ©2011 Strobe Inc. All rights reserved.
// License:   Licened under MIT license (see __preamble__.js)
// ==========================================================================

var Ct = require('core-test/sync'),
    Spade = require('spade').Spade,
    Sandbox = require('spade').Sandbox;

Ct.module('spade: Sandbox format compilation');

Ct.setup(function(t) {
  t.sandbox = new Sandbox(new Spade());

  t.sandbox.spade.register('text', {
    'name': 'text',
    'plugin:formats': {
      'txt': 'text/format'
    }
  });
  t.sandbox.spade.register('text/format',
    "exports.compileFormat = function(code, _, filename){ "+
      "return '// From '+filename+'\\nreturn \"'+code+'\";'; "+
    "};");
});

Ct.teardown(function(t) { 
  delete t.sandbox;
});

Ct.test('normal', function(t){
  var sandbox = t.sandbox,
      pkg = sandbox.spade.package('text');

  t.equal(sandbox.compileFormat('Testing', 'test_file.txt', 'txt', pkg), '// From test_file.txt\nreturn "Testing";');
});

Ct.test("checks dependencies", function(t){
  t.sandbox.spade.register('test', {
    'name': 'test',
    'dependencies': { 'text': '1.0' }
  });

  var pkg = t.sandbox.spade.package('test');

  t.equal(t.sandbox.compileFormat('Testing', 'test_file.txt', 'txt', pkg), '// From test_file.txt\nreturn "Testing";');
});

Ct.test("only checks immediate dependencies", function(t){
  t.sandbox.spade.register('intermediate', {
    'name': 'intermediate',
    'dependencies': { 'text': '1.0' }
  });
  t.sandbox.spade.register('test', {
    'name': 'test',
    'dependencies': { 'intermediate': '1.0' }
  });

  var pkg = t.sandbox.spade.package('test');

  t.equal(t.sandbox.compileFormat('Testing', 'test_file.txt', 'txt', pkg), 'Testing');
});

Ct.test("self takes priority", function(t){
  t.sandbox.spade.register('test', {
    'name': 'test',
    'dependencies': { 'text': '1.0' },
    'plugin:formats': { 'txt': 'test/text-format' }
  });
  t.sandbox.spade.register('test/text-format',
    "exports.compileFormat = function(code){ "+
      "return '// Test Formatter\\nreturn \"'+code+'\";'; "+
    "};");

  var pkg = t.sandbox.spade.package('test');

  t.equal(t.sandbox.compileFormat('Testing', 'test_file.txt', 'txt', pkg), '// Test Formatter\nreturn "Testing";');
});
