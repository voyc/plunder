/**
	class ScriptLoader
	@constructor
*/
voyc.ScriptLoader = function() {
	this.scripts = [];
	this.cb = function() {};
	this.numLoaded = 0;
}

voyc.ScriptLoader.prototype.toString = function () {
	return 'ScriptLoader';
}
voyc.ScriptLoader.prototype.load = function (list, callback) {
	this.scripts = list;
	this.cb = callback;
	for (var i=0; i<this.scripts.length; i++) {
		voyc.appendScript(this.scripts[i]);
	}
}

voyc.ScriptLoader.prototype.onScriptLoaded = function(filename) {
	voyc.dispatcher.publish(voyc.Event.FileLoaded, this, {name:filename});
	this.numLoaded++;
	if (this.numLoaded >= this.scripts.length) {
		this.cb(true);
	}
}

window['voyc']['onScriptLoaded'] = function(filename) {
	voyc.plunder.scriptLoader.onScriptLoaded(filename);
}
