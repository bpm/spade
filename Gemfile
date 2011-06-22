source 'http://rubygems.org'

if ENV["BPM_PATH"]
  gem 'bpm', :path => ENV["BPM_PATH"]
else
  gem 'bpm', :git => "git://github.com/strobecorp/spade-packager", :branch => 'bpm'
end

if ENV["SPADERUN_PATH"]
  gem 'spade-runtime', :path => ENV["SPADERUN_PATH"]
else
  gem 'spade-runtime', :git => "git://github.com/strobecorp/spade-runtime", :branch => 'compiler'
end

gemspec
