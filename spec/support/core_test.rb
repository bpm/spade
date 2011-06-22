require 'spade/runtime/context'

RSpec::Matchers.define :be_ct_success do
  match do |actual|
    actual.first == 'passed'
  end

  failure_message_for_should do |actual|
    actual.last
  end

  failure_message_for_should_not do |actual|
    "expected not to be a success"
  end

  description do
    "be a success"
  end
end

module RSpecCoreTest
  def run_core_tests(path, &block)
    describe "#{path}" do
      rootdir = File.expand_path(File.join(__FILE__, '/../../../'));
      context = Spade::Runtime::MainContext.new(:rootdir => rootdir) do |ctx|
        ctx['checkRSpec'] = lambda do |status, test_info, message|
          it "#{test_info.module.name}: #{test_info.name}" do
            if status == 'warnings' && message == "Not Yet Implemented"
              pending
            else
              [status.to_s, message.to_s].should be_ct_success
            end
          end
        end

        ctx.eval <<END
var Ct;
try {
  Ct = require('core-test');
} catch (e) { }

if (Ct) {
  RubyLogger = require('core-test/utils').extend(Ct.DefaultLogger, {
    add: function(status, testInfo, message){
      checkRSpec(status, testInfo, message);
    }
  });
  Ct.defaultLogger = new RubyLogger('ruby');

  require('file:#{path}');

  Ct.run();
} else {
  console.log("CoreTest is not installed. Use `spade install core-test`.");
}
END
      end
    end
  end
end
RSpec::Core::ExampleGroup.extend(RSpecCoreTest)
