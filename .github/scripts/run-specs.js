// Headless runner for CSSOM's Jasmine 1.x suite. Loads exactly the scripts
// spec/index.html loads, in the same order, into one VM context, with the
// library supplied by lib/index.js (what src/loader.js assembles in the
// browser), and reports every spec plus a pass/fail summary to stdout.
var fs = require("fs");
var path = require("path");
var vm = require("vm");

var root = path.join(__dirname, "..", "..");
var specDir = path.join(root, "spec");
var html = fs.readFileSync(path.join(specDir, "index.html"), "utf8");
var scripts = [];
html.replace(/<script src="([^"]+)"><\/script>/g, function(_, src) { scripts.push(src); });
// index.html omits CSSImportRule.spec.js and CSSProperty.spec.js. Run the former too;
// CSSProperty.spec.js exercises CSSOM.CSSProperty, a class lib/ no longer defines.
if (scripts.indexOf("CSSImportRule.spec.js") === -1) scripts.push("CSSImportRule.spec.js");

var filter = process.argv[2] || "";
var sandbox = { console: console, setTimeout: setTimeout, clearTimeout: clearTimeout,
	setInterval: setInterval, clearInterval: clearInterval };
sandbox.window = sandbox;
// objectDiff's matcher builds its failure message as a <pre> element; give it
// a minimal element so the diff text can be printed instead of a ReferenceError.
sandbox.document = { createElement: function(tag) { return { tagName: tag, innerHTML: "" }; } };
vm.createContext(sandbox);

scripts.forEach(function(src) {
	if (/HtmlReporter\.js$/.test(src)) return; // DOM-only reporter
	if (src === "../src/loader.js") {
		sandbox.CSSOM = require(path.join(root, "lib", "index.js"));
		return;
	}
	var file = path.join(specDir, src);
	vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: file });
});

var jasmine = sandbox.jasmine;
var env = jasmine.getEnv();
env.updateInterval = 0;
if (filter) {
	env.specFilter = function(spec) { return spec.getFullName().indexOf(filter) !== -1; };
}
var passed = 0, failed = 0, skipped = 0;
env.addReporter({
	reportRunnerStarting: function() { console.log("Jasmine " + jasmine.version_.major + "." + jasmine.version_.minor + "." + jasmine.version_.build + " — running " + scripts.filter(function(s) { return /\.spec\.js$/.test(s); }).join(", ")); },
	reportSpecStarting: function() {},
	reportSuiteResults: function() {},
	log: function(m) { console.log(m); },
	reportSpecResults: function(spec) {
		var r = spec.results();
		if (r.skipped) { skipped++; return; }
		if (r.passed()) { passed++; console.log("PASS " + spec.getFullName()); }
		else {
			failed++;
			console.log("FAIL " + spec.getFullName());
			r.getItems().forEach(function(item) {
				if (item.passed && !item.passed()) {
					var msg = item.message;
					if (msg && typeof msg === "object" && "innerHTML" in msg) msg = msg.innerHTML.replace(/<[^>]+>/g, "");
					console.log("    " + msg);
				}
			});
		}
	},
	reportRunnerResults: function() {
		console.log("\n" + (passed + failed) + " specs, " + passed + " passed, " + failed + " failed, " + skipped + " skipped");
		process.exitCode = failed === 0 && passed > 0 ? 0 : 1;
	}
});
env.execute();
