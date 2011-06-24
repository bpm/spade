exports.compileWrapper = function(code, spade, filename, pkg, id) {
  var ret = ''

  // Register package, probably a better way to do this
  if (id.match(/^[^\/]+\/main$/)) {
    ret += 'spade.register("'+pkg.name+'", '+JSON.stringify(pkg)+');\n\n';
  }

  // TODO: This probably isn't quite right
  // TOOD: We can also pass a string here, maybe we should instead
  ret += 'spade.register("'+id+'", function(){\n'+code+'\n});';

  return ret;
};

