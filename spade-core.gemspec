# -*- encoding: utf-8 -*-
lib = File.expand_path('../lib/', __FILE__)
$:.unshift lib unless $:.include?(lib)

require 'spade/core/version'

Gem::Specification.new do |s|
  s.name        = "spade-core"
  s.version     = Spade::Core::VERSION
  s.platform    = Gem::Platform::RUBY
  s.authors     = ["Charles Jolley", "Peter Wagenet"]
  s.email       = ["charles@sproutcore.com", "peterw@strobecorp.com"]
  s.homepage    = "http://github.com/strobecorp/spade-runtime"
  s.summary = s.description = "Core Libraries for Spade Package Manager and Runtime"

  s.add_development_dependency "rspec"

  #paths = `git submodule`.split("\n").map do |line|
  #  path = line.gsub(/^ \w+ ([^\s]+) .+$/,'\1')
  #  `cd #{path}; git ls-files`.split("\n").map { |p| File.join(path, p) }
  #end
  #paths << `git ls-files`.split("\n")
  #s.files      = paths.flatten
  #s.test_files = `git ls-files -- {test,spec,features}/*`.split("\n")

  s.files = Dir.glob("lib/**/*.rb")
  s.test_files = Dir.glob("spec/**/*.rb")

  # s.executables        = ['spade']
  s.require_paths      = ["lib"]
end


