exports.compileTransport = function(code, pkg, id, filename) {
  var ret = '',
      id = pkg.name+'/'+id;

  // Register package, probably a better way to do this
  if (id.match(/^[^\/]+\/main$/)) {
    ret += 'spade.register("'+pkg.name+'", '+JSON.stringify(pkg)+');\n\n';
  }

  // TOOD: We can also pass a string here, maybe we should instead
  ret += 'spade.register("'+id+'", function(require, exports, __module, ARGV, ENV, __filename){\n'+code+'\n});';

  return ret;
};

