/**
	class Asset
	singleton
	@constructor
*/
voyc.Asset = function() {
	this.paths = {};
	this.images = {};
};

// load all the assets
voyc.Asset.prototype.load = function (paths, cb) {
	this.paths = paths;
	var cbload = cb;

	var promises = [];
	for (var key in this.paths) {
		var path = this.paths[key];
		var p = this.loadImage(key, path);
		promises.push(p);
	}

	Promise.all(promises).then(
		function(reason) {
			console.log('success:' + reason);
			cbload(true);
		},
		function(reason) {
			console.log('failed:' + reason);
			cbload(false);
		}
	);
}

// function getImage returns a promise.  (Therefore, getImage IS a promise.)
voyc.Asset.prototype.loadImage = function(key, path) {
	var self = this;
	var p = new Promise(function(resolve, reject) {
		var img = new Image();
		img.onload = function() {
			self.images[key] = img;
			resolve(key);
		}
		img.onerror = function() {
			reject(key);
		}
		img.onabort = function() {
			reject(key);
		}
		img.src = path;
	})
	return p;
}

voyc.Asset.prototype.get = function(name) {
	return this.images[name];
}
