source 'http://rubygems.org'

gem "rspec"

if ENV["BPM_PATH"]
  gem 'bpm', :path => ENV["BPM_PATH"]
else
  gem 'bpm', :git => "git://github.com/sproutcore/bpm.git"
end

if ENV["SPADE_PATH"]
  gem 'spade', :path => ENV["SPADE_PATH"]
else
  gem 'spade', :git => "git://github.com/sproutcore/spade-ruby.git"
end
