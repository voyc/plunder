/**
	class Plunder
	singleton
	Loads resources and then executes the animation loop.
	@constructor
*/
voyc.Plunder = function() {
	this.elem = null;
	this.ctx = null;
	this.w = 0;
	this.h = 0;
    this.previousElapsed = 0;
	
	this.game = null;
	this.keyboard = null;
	this.treasure = {};
	this.score = 0;
	this.effects = [];
	this.loaded = {};
}

voyc.Plunder.prototype.start = function () {
	// build list of image pathnames
	var path = 'assets/';
	var list = {
		hero:    path+'sprites/survivor-walk-16.png',
		explode: path+'sprites/explosion-1.png',
		tileset: path+'images/tiles.png',
		reddot:  path+'images/reddot.png',
		//redxbox:   path+'images/red-xbox.png',
		//bluebox:  path+'images/blue-xbox.png',
	};
	for (var y=12; y<=14; y++) {
		for (var x=21; x<=25; x++) {
			fname = 'kh_y' + y + '_x' + x + '_z5.jpg';
			tpath = path + 'tiles/' + fname;
			key = y + '_' + x;
			list[key] = tpath;
		}
	}

	// start loading images
	log&&console.log('loading');
	this.asset = new voyc.Asset();
	var self = this;
	this.asset.load(list, function(success) {
		if (success) {
			self.onload('visual');
		}
		else {
			alert('Images failed to load.  Try again.')
		}
	});

	// start loading sounds
	var urlpattern = 'assets/sounds/%sound%.mp3';
	var fxfiles = [
		'explode',
	];
	this.sound = new voyc.Sound();
	this.sound.loadSounds(urlpattern, fxfiles, function(isSuccess) {
		if (isSuccess) {
			self.onload('audio');
		}
		else {
			console.log('audio files failed to load');
			alert('Some audio files failed to load.  Try again.');
		}
	});

	this.elem = document.getElementById('world');
	this.ctx = this.elem.getContext('2d');
	this.w = this.elem.offsetWidth;
	this.h = this.elem.offsetHeight;
	this.elem.width = this.w;
	this.elem.height = this.h;

	this.game = new voyc.Game();
	this.game.onRender = function(elapsed) {self.render(elapsed)};

	this.keyboard = new voyc.Keyboard();
	this.keyboard.listenForEvents([
		voyc.Key.LEFT, 
		voyc.Key.RIGHT, 
		voyc.Key.UP, 
		voyc.Key.DOWN,
	]);
	
	this.hero = {};
	this.world = {};
	this.camera = {};
	this.tile = {};
	
	// hero is the protagonist's position in the world
	this.hero.frame = 0;
	this.hero.rows = 5;
	this.hero.cols = 4;
	this.hero.x = 600;
	this.hero.y = 300;
	this.hero.w = 22;  // sprite w
	this.hero.h = 16;  // sprite h
	this.hero.xprev = 600;
	this.hero.yprev = 300;
	this.hero.xdiff = 0;
	this.hero.ydiff = 0;
	this.hero.lat = 0;
	this.hero.lng = 0;

	this.tilesize = 256;

	this.tile.x = 0;
	this.tile.y = 0;
	this.tile.w = this.tilesize;
	this.tile.h = this.tilesize;
	
	// world is the rectangle of the totality of what we have
	this.world.rows = 3;
	this.world.cols = 5;
	this.world.x = 0;
	this.world.y = 0;
	this.world.w = this.world.cols * this.tilesize;   // 5 * 256 = 1280
	this.world.h = this.world.rows * this.tilesize;   // 3 * 256 = 768
	this.world.gn = 40.8969036908;
	this.world.gs = 11.3076785449;
	this.world.gw = 56.42578125;
	this.world.ge = 112.390136719;

	// camera is the rectangle shown on screen
	this.camera.x = 100;
	this.camera.y = 100;
	this.camera.w = this.w;
	this.camera.h = this.h;

	this.treasure = {
		1: { b:-2500, e:-1900, lat: 27.3243  , lng: 68.1357  , pts: 1000, cap:0, id:1, name:'Mohenjo Daro'},
        2: { b:-2600, e:-1900, lat: 30.6312  , lng: 72.8683  , pts: 1000, cap:0, id:2, name:'Harappa'},
	}
	this.plotTreasure();

	this.plotRivers();

	voyc.Effect.asset = this.asset;
	voyc.Effect.sound = this.sound;
}

voyc.Plunder.prototype.onload = function (name) {
	this.loaded[name] = true;
	if (this.loaded['audio'] && this.loaded['visual']) {
		this.run();
	}
}
	
voyc.Plunder.prototype.geocode = function (x,y) {
	var l = this.world.x;
	var r = this.world.w;
	var t = this.world.y;
	var b = this.world.h;

	n = this.world.gn;
	s = this.world.gs;
	e = this.world.ge;
	w = this.world.gw;

	// (x-l)/(r-l) = (lng-w)/(e-w)   solve for lng
	// (x-l)*(e-w)/r-l = (lng-w)*(e-w)/(e-w)
	// (x-l)*(e-w)/r-l = (lng-w)
	// ((x-l)*(e-w)/r-l)+w = (lng-w)+w
	// ((x-l)*(e-w)/r-l)+w = (lng)

	var lng = ((x-l)*(e-w)/r-l)+w;
	var lat = ((y-t)*(s-n)/b-t)+n;
	return {lat:lat, lng:lng};
}

voyc.Plunder.prototype.reverseGeocode = function (lat,lng) {
	var l = this.world.x;
	var r = this.world.w;
	var t = this.world.y;
	var b = this.world.h;

	var n = this.world.gn;
	var s = this.world.gs;
	var e = this.world.ge;
	var w = this.world.gw;

	// (x-l)/(r-l) = (lng-w)/(e-w)   solve for x
	// (x-l)*(r-l)/(r-l) = (lng-w)*(r-l)/(e-w)
	// (x-l) = (lng-w)*(r-l)/(e-w)
	// (x-l)+l = (lng-w)*(r-l)/(e-w)+l
	// (x = (lng-w)*(r-l)/(e-w)+l

	var x = (lng-w)*(r-l)/(e-w)+l;
	var y = (lat-n)*(b-t)/(s-n)+t;
	return {x:x, y:y};
}

voyc.Plunder.prototype.run = function () {
	log&&console.log('start');
	this.game.start();
}

voyc.Plunder.prototype.render = function (delta) {
	// update
	this.moveHero(delta);
	this.moveCamera();

	// draw
	this.drawBackground();
	this.drawTreasure();
	this.drawRivers();
	this.drawHero();
	this.drawEffects();
}

voyc.Plunder.prototype.drawBackground = function () {
    var startCol = 21;
    var endCol = 25;
    var startRow = 12;
    var endRow = 14;

    for (var c = startCol; c <= endCol; c++) {
        for (var r = startRow; r <= endRow; r++) {
			var name = r + '_' + c;
			this.ctx.drawImage(
				this.asset.get(name), // image

				this.tile.x, // source x
				this.tile.y, // source y
				this.tile.w, // source width
				this.tile.h, // source height

				0-this.camera.x + ((c-startCol)*this.tilesize),  // target x
				0-this.camera.y + ((r-startRow)*this.tilesize), // target y
				this.tile.w, // target width
				this.tile.h // target height
			);
		}
	}
};

voyc.Plunder.prototype.moveHero = function (deltatime) {
	// calculate two vectors
	// deltatime = microseconds since previous frame

	var walk = 60; // pixels per second
	var run = 240;
	var speed = (this.keyboard.isShift()) ? run : walk;
	var deltapixel = (speed / 1000) * deltatime;   // distance in pixels since previous frame

	var left = (this.keyboard.isDown(voyc.Key.LEFT)) ? -1 : 0;
	var right = (this.keyboard.isDown(voyc.Key.RIGHT)) ? 1 : 0;
	var up = (this.keyboard.isDown(voyc.Key.UP)) ? -1 : 0;
	var down = (this.keyboard.isDown(voyc.Key.DOWN)) ? 1 : 0;
	var deltax = (left + right) * deltapixel;
	var deltay = (up + down) * deltapixel;
	this.hero.x += (left + right) * deltapixel;
	this.hero.y += (up + down) * deltapixel;

	// contain the hero within the world
	this.hero.x = Math.max(this.hero.x, this.world.x);
	this.hero.x = Math.min(this.hero.x, this.world.x + this.world.w - this.hero.w);
	this.hero.y = Math.max(this.hero.y, this.world.y);
	this.hero.y = Math.min(this.hero.y, this.world.y + this.world.h - this.hero.h);

	this.hero.xdiff = this.hero.x - this.hero.xprev;
	this.hero.ydiff = this.hero.y - this.hero.yprev;
	this.hero.xprev = this.hero.x;
	this.hero.yprev = this.hero.y;

	// calc hero position in geo coordinates
	var ll = this.geocode(this.hero.x, this.hero.y);
	this.hero.lat = ll.lat;
	this.hero.lng = ll.lng;
	//console.log('hero at lat:'+ll.lat+', lng:'+ll.lng);

	for (var key in this.treasure) {
		if (!this.treasure[key].cap) {
			var boo = this.isCollision(this.treasure[key]);
			if (boo) {
				console.log('collision');
				this.onTreasureCaptured(this.treasure[key].id);
				break;
			}
		}
	}
}

voyc.Plunder.prototype.isCollision = function (treasure) {
	return this.isPtInRect(treasure, this.hero);
}

voyc.Plunder.prototype.isPtInRect = function (pt, rect) {
	return ((rect.x < pt.x) && (pt.x < rect.x + rect.w)
		 && (rect.y < pt.y) && (pt.y < rect.y + rect.h));
}

voyc.Plunder.prototype.onTreasureCaptured = function (id) {
	this.treasure[id].cap = 1;
	this.score += this.treasure[id].pts;
	this.explode(this.treasure[id].x, this.treasure[id].y);
}

voyc.Plunder.prototype.explode = function (x,y) {
	var ex = new voyc.Effect(this.ctx, x, y, 'explode', 1, 16, 'explode');
	this.effects.push(ex);
}

voyc.Plunder.prototype.drawEffects = function () {
	for (var i=0; i<this.effects.length; i++) {
		var ef = this.effects[i];
		var b = ef.draw();
		if (!b) {
			this.effects.splice(i,1);  // finished
		}
	}
}
	
voyc.Plunder.prototype.moveCamera = function () {

	// 1. keep the hero inside the warning track
	var warningTrack = 32;  // pixels from the edge of the camera
	this.camera.x = Math.min(this.camera.x, this.hero.x - warningTrack);
	this.camera.x = Math.max(this.camera.x, this.hero.x + warningTrack - this.camera.w);
	this.camera.y = Math.min(this.camera.y, this.hero.y - warningTrack);
	this.camera.y = Math.max(this.camera.y, this.hero.y + warningTrack - this.camera.h);

	// 2. keep the camera inside the world
	this.camera.x = Math.max(this.camera.x, this.world.x);
	this.camera.x = Math.min(this.camera.x, (this.world.x + this.world.w - this.camera.w));
	this.camera.y = Math.max(this.camera.y, this.world.y);
	this.camera.y = Math.min(this.camera.y, (this.world.y + this.world.h - this.camera.h));
}

voyc.Plunder.prototype.drawHero = function () {

	if ((this.hero.xdiff || this.hero.ydiff)) {
		this.hero.frame++;
	}	

	if (this.hero.frame >= (this.hero.rows * this.hero.cols)) {
		this.hero.frame = 0;
	}
	var i=0, row=0, col=0;
	while (i<this.hero.frame) {
		i++;
		col++;
		if (col > this.hero.cols) {
			col = 0;
			row++;
		}
	}

	// calc angle of travel in degrees
	if ((this.hero.xdiff || this.hero.ydiff)) {
		var dgrs = 0;
		var dx = this.hero.xdiff;
		var dy = this.hero.ydiff;
		if (dx == 0 && dy <  0)  dgrs = 270;  // up          
		if (dx >  0 && dy <  0)  dgrs = 315;  // up-right    
		if (dx >  0 && dy == 0)  dgrs =   0;  // right       
		if (dx >  0 && dy >  0)  dgrs =  45;  // down-right  
		if (dx == 0 && dy >  0)  dgrs =  90;  // down        
		if (dx <  0 && dy >  0)  dgrs = 135;  // down-left   
		if (dx <  0 && dy == 0)  dgrs = 180;  // left        
		if (dx <  0 && dy <  0)  dgrs = 225;  // up-left     

		// degrees to radians
		this.hero.r = dgrs * (Math.PI / 180);
	}

	this.ctx.save();

	// translate centerpoint of image within camera
	var tx = this.hero.x - this.camera.x + (this.hero.w/2);
	var ty = this.hero.y - this.camera.y + (this.hero.h/2);
	this.ctx.translate(tx,ty);

	this.ctx.rotate(this.hero.r);
	
	this.ctx.drawImage(
		this.asset.get('hero'), // image

		(col * this.hero.w), // source x
		(row * this.hero.h), // source y
		this.hero.w, // source width
		this.hero.h, // source height

		(-this.hero.w/2), // target x     // draw at 0,0 minus the offset, translate has positioned x,y at 0,0
		(-this.hero.h/2), // target y
		this.hero.w,  // target width
		this.hero.h   // target height
	);
	this.ctx.restore();
};

voyc.Plunder.prototype.plotTreasure = function () {
	for (var key in this.treasure) {
		var t = this.treasure[key];
		var lat = t.lat;
		var lng = t.lng;
		var pt = this.reverseGeocode(lat,lng);
		t.x = pt.x;
		t.y = pt.y;
	}
}

voyc.Plunder.prototype.plotRivers = function () {
	for (var i=0; i<voyc.rivers.length; i++) {
		var co = voyc.rivers[i].coords;
		voyc.rivers[i].points = [];
		for (var j=0; j<co.length; j++) {
			var seg = co[j];
			voyc.rivers[i].points[j] = [];
			for (var k=0; k<seg.length; k++) {
				var p = seg[k];
				var pt = this.reverseGeocode(p.lat,p.lng);
				var t = {};
				t.x = pt.x;
				t.y = pt.y;
				voyc.rivers[i].points[j][k] = t;
			}
		}
	}
	console.log('rivers plotted');
}

voyc.Plunder.prototype.drawRivers = function () {
	for (var i=0; i<voyc.rivers.length; i++) {
		var co = voyc.rivers[i].points;
		for (var j=0; j<co.length; j++) {
			var seg = co[j];
			this.ctx.beginPath();
			this.ctx.moveTo(seg[0].x - this.camera.x, seg[0].y - this.camera.y);
			for (var k=1; k<seg.length; k++) {
				this.ctx.lineTo(seg[k].x - this.camera.x, seg[k].y - this.camera.y);
			}
			this.ctx.stroke();
		}
	}
	console.log('rivers drawn');

/*	
			t.image = this.asset.get('reddot');
			t.w = t.image.width;
			t.h = t.image.height;
			
			this.ctx.drawImage(
				this.asset.get('reddot'), // image

				0, // source x
				0, // source y
				this.hero.w, // source width
				this.hero.h, // source height

				t.x - (t.w/2) - this.camera.x,  // target x
				t.y - (t.h/2) - this.camera.y, // target y
				this.hero.w, //this.hero.w, // target width
				this.hero.h //this.hero.h // target height
			);
		}
	}
*/
};

voyc.Plunder.prototype.drawTreasure = function () {
	for (var key in this.treasure) {
		var t = this.treasure[key];
		if (!t.cap) {
			
			t.image = this.asset.get('reddot');
			t.w = t.image.width;
			t.h = t.image.height;
			
			this.ctx.drawImage(
				this.asset.get('reddot'), // image

				0, // source x
				0, // source y
				this.hero.w, // source width
				this.hero.h, // source height

				t.x - (t.w/2) - this.camera.x,  // target x
				t.y - (t.h/2) - this.camera.y, // target y
				this.hero.w, //this.hero.w, // target width
				this.hero.h //this.hero.h // target height
			);
		}
	}
};

window.addEventListener('load', function (evt) {
	voyc.plunder = new voyc.Plunder();
	voyc.plunder.start();
}, false);

window.addEventListener('click', function (evt) {
	if (evt.keycode == voyc.Key.ESC) {
		voyc.plunder.stop();
	}
}, false);
