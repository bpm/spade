BPM_PLUGIN.compileTransport = function(code, context, filename) {
  var ret = '',
      packageName = context['package'].name,
      id = packageName+'/'+context.moduleId;

  // Register package, probably a better way to do this
  if (id.match(/^[^\/]+\/main$/)) {
    ret += 'spade.register("'+packageName+'", '+JSON.stringify(context['package'])+');\n\n';
  }

  // TOOD: We can also pass a string here, maybe we should instead
  ret += 'spade.register("'+id+'", function(require, exports, __module, ARGV, ENV, __filename){\n'+code+'\n});';

  return ret;
};

