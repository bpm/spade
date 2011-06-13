module Spade
  module Core
  end

  JSPATH = File.expand_path("../js/spade.js", __FILE__)
  SPADE_DIR = '.spade'

  # find the current path with a package.json or .packages or cur_path
  def self.discover_root(cur_path)
    ret = File.expand_path(cur_path)
    while ret != '/' && ret != '.'
      return ret if File.exists?(File.join(ret,'package.json')) || File.exists?(File.join(ret,'.spade'))
      ret = File.dirname ret
    end

    return cur_path
  end

  # The next 5 methods should maybe be in Runtime

  def self.current_context
    @current_context
  end

  def self.current_context=(ctx)
    @current_context = ctx
  end

  def self.exports=(klass)
    exports(klass, nil)
  end

  def self.exports(klass, path = nil)
    path = @current_path if path.nil?
    @exports ||= {}
    @exports[path] = klass
  end

  def self.exports_for(path)
    @current_path = path
    require path
    @current_path = nil

    @exports ||= {}
    @exports[path]
  end
end
