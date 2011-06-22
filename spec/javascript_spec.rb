require "spec_helper"

describe "Javascript Tests" do
  Dir["#{File.dirname(__FILE__)}/javascript/**/*.js"].each do |path|
    run_core_tests(path)
  end
end
