/** 
	class Texture
	singleton
	represents a hidden background canvas containing a texture map
	@constructor 
*/
voyc.Texture = function() {
	this.elem = {};
	this.filename = '';
	this.w = 0;
	this.h = 0;
	this.scale = 0;
	this.projection = function(){};
	this.canvas = {};
	this.ctx = {};
	this.image = {};
	this.tiled = true;
	this.list = {};
	this.asset = {};
}

voyc.Texture.prototype.setup = function(elem, filename, w, h, scale) {
	this.elem = elem;
	this.filename = filename;
	this.w = w;
	this.h = h;
	this.scale = scale;  // determined through trial and error.  Scale is supposed to be == width in pixels.

	this.projection = new voyc.OrthographicProjection(); // voyc.EquiRectangular();
	this.projection.translate([this.w / 2, this.h / 2]);
	this.projection.scale(this.scale);
	this.canvas = document.createElement('canvas');
	this.canvas.width = this.w;
	this.canvas.height = this.h;
	this.canvas.style.width  = this.w + 'px';
	this.canvas.style.height = this.h + 'px';
	this.ctx = this.canvas.getContext("2d");
	this.elem.appendChild(this.canvas);

	//(this.tiled) ? this.loadTiles('initial') : this.loadImage();
}

// load single image
voyc.Texture.prototype.loadImage = function() {
	this.image = new Image();
	var self = this;
	this.image.onload = function() {self.onImageLoaded()};
	log&&console.log(voyc.timer()+'texture file load start');
	this.image.src = this.filename;
}
voyc.Texture.prototype.onImageLoaded = function() {
	log&&console.log(voyc.timer()+'texture file load complete');
	this.ctx.drawImage(this.image, 0, 0);
	log&&console.log(voyc.timer()+'texture image drawn');
	this.imageData = this.ctx.getImageData(0, 0, this.w, this.h);
	log&&console.log(voyc.timer()+'texture image data got');  // 7 seconds
	this.cb('texture', true);
}

// load tiles
voyc.Texture.prototype.loadTiles = function(pass,cb) {
	this.cb = cb;
	var self = this;
	if (pass == 'initial') {
		this.list = this.makeList();
		this.asset = new voyc.Asset();
		//log&&console.log(voyc.timer()+'texture tile asset load start');
		setTimeout(function() {
			self.asset.load(self.list['initial'], function(success, key) { self.assetLoaded(success, key)});
		}, 50);
	}
	else if (pass == 'remainder') {
		//log&&console.log(voyc.timer()+'texture tile asset load start');
		setTimeout(function() {
			self.asset.load(self.list['remainder'], function(success, key) { self.assetLoaded(success, key)});
		}, 50);
	}
}

voyc.Texture.prototype.assetLoaded = function(isSuccess, key) {
	if (!isSuccess) {
		this.cb(false, key);
		return;
	}
	if (!key) {
		//log&&console.log(voyc.timer()+'texture get imagedata start');
		this.imageData = this.ctx.getImageData(0, 0, this.w, this.h);
		//log&&console.log(voyc.timer()+'texture get imagedata complete');
		//log&&console.log(voyc.timer()+'texture tile asset load complete');
		this.cb(true, '');
		return;
	}

	//this.cb(true, key);  //for counting loaded assets

	var keypattern = /c(.*)_r(.*)/;
	var a = keypattern.exec(key);
	var col = a[1];
	var row = a[2];

	var tilesize = 300;
	var x = col * tilesize;
	var y = row * tilesize;
	image = this.asset.get(key);
	this.ctx.drawImage(image, 
		0, 0, tilesize, tilesize, // source
		x, y, tilesize, tilesize  // dest
	);
}

/*
	make two lists of tiles to load, 
	in order, 
	spiraling around the starting point
*/
voyc.Texture.prototype.makeList = function() {
	// given
	var rows = 18;
	var cols = 36;
	var tilesize = 300;
	var keypattern = 'c$x_r$y';
	var pathpattern = 'assets/tiles/ne2_$key.png';
	
	var list = {      // build and return two lists
		initial: [],
		remainder: []
	};
	var whichlist = 'initial';
	var n = 0;
	var j = 0;
	var m = rows*cols;
	var keys={};

	// local function to add key/path to list
	function pokeList(col,row) {
		var key = keypattern.replace('$x', col).replace('$y', row);
		j++;
		if (!(key in keys)) {
			keys[key] = 1;
			var path = pathpattern.replace('$key', key);
			list[whichlist].push({key:key, path:path});
			n++;
		}
	}

	// calculate the four corners on screen
	var ptNW = [0,0];
	var ptSE = [voyc.plunder.world.w, voyc.plunder.world.h];
	var coNW = voyc.plunder.world.projection.invert(ptNW);
	var coSE = voyc.plunder.world.projection.invert(ptSE);
	var ptTL = this.projection.project(coNW);
	var ptBR = this.projection.project(coSE);
	var collo = Math.floor(ptTL[0] / tilesize);
	var colhi = Math.floor(ptBR[0] / tilesize);
	var rowlo = Math.floor(ptTL[1] / tilesize);
	var rowhi = Math.floor(ptBR[1] / tilesize);

	// first list, initially visible tiles
	for (var c=collo; c<=colhi; c++) {
		for (var r=rowlo; r<=rowhi; r++) {
			pokeList(c,r);
		}
	}

	// now the second list, continue spiraling outward
	whichlist = 'remainder';
	while (n < m) {
		rowlo = Math.max(rowlo-1,0);
		rowhi = Math.min(rowhi+1,rows-1);
		collo = Math.max(collo-1,0);
		colhi = Math.min(colhi+1,cols-1);

		for (var c=collo; c<=colhi; c++) {
			pokeList(c,rowlo);
			pokeList(c,rowhi);
		}
		for (var r=rowlo; r<=rowhi; r++) {
			pokeList(collo,r);
			pokeList(colhi,r);
		}
	}
	return list;
}
