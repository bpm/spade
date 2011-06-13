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

  s.files = `git ls-files`.split("\n")
  s.test_files = `git ls-files -- {test,spec,features}/*`.split("\n")

  s.require_paths      = ["lib"]
end


