/*globals BPM_PLUGIN */

BPM_PLUGIN.compileTransport = function(code, context, filename) {
  var ret = '',
      packageName = context['package'].name,
      id = packageName+'/'+context.moduleId;

  // Register package, probably a better way to do this
  if (id.match(/^[^\/]+\/main$/)) {
    
    var ctx = context['package'],
        pkg = { name: ctx.name, 
                version: ctx.version, 
                dependencies: ctx.dependencies };
                
    ret += 'spade.register("'+packageName+'", '+JSON.stringify(pkg)+');\n\n';
  }

  if (context.settings['spade:format'] === 'function') {
    code = 'function(require, exports, __module, ARGV, ENV, __filename){\n'+code+'\n}';
  } else {
    code = context.minify("(function(require, exports, __module, ARGV, ENV, __filename){\n"+code+"\n//@ sourceURL="+id+"\n})()");
    
    var lines = code.split("\n");
    lines[0] = lines[0].replace(/^\(function\([^\)]+\)\{/, '');
    lines[lines.length-1] = lines[lines.length-1].replace(/\}\)\(\)$/, '');
    code = lines.join("\n");
    code = JSON.stringify(code);
  }

  ret += 'spade.register("'+id+'", '+code+');';

  return ret;
};

