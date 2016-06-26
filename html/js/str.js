// अथ योगानुशासनम्॥१॥
/**@constructor*/
voyc.Str = function () {
	this.lang = 'en';
	this.strings = {};
	this.strings[this.lang] = {
		// user authentication states
		1     :'FileLoaded'                         ,
	};
}

/**
	@param {string|number} id
	@param {Array|null} [a=null]
*/
voyc.Str.prototype.get = function(id, a) {
	var target = this.strings[this.lang][id];
	if (typeof(a) != 'undefined') {
		for (var i=0; i<a.length; i++) {
			target = target.replace('$'+(i+1), a[i]);
		}
	}
	return target;
}
