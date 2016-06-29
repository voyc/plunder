
/**
	class Plunder
	singleton
	The prime mover.  Loads resources, creates objects, starts action.
	@constructor
*/
voyc.Plunder = function() {
	this.elem = null;
	this.ctx = null;
	this.w = 0;
	this.h = 0;
    this.previousElapsed = 0;
	
	// object model
	this.asset = {};
	this.sound = {};
	this.game = {};
	this.keyboard = {};
	this.effects = [];
	this.world = {};
	this.texture = {};
	this.hero = {};
	this.hud = {};

	this.loadnum = 2;
	this.loadmax = 19;
	this.loaded = {};
	this.options = {};
	this.score = 0;

	// time
	this.timesliding = false;
	this.starttime = 0;
	this.nowtime = 0;
	this.startyear = -3500;
	this.lastyear = (new Date().getFullYear());
	this.nowyear = this.startyear;
	this.speedoftime = 10; // years per second	
	
	// alias to external data
	this.treasure = window['voyc']['data']['treasure'];
}

/** @enum */
voyc.option = {
	HIRES:0,
	CHEAT:1,
	GRATICULE:2,
	PRESENTDAY:3
}
voyc.Plunder.defaultOptions = {};
voyc.Plunder.defaultOptions[voyc.option.HIRES] = false;
voyc.Plunder.defaultOptions[voyc.option.CHEAT] = true;
voyc.Plunder.defaultOptions[voyc.option.GRATICULE] =  true;
voyc.Plunder.defaultOptions[voyc.option.PRESENTDAY] = false;

voyc.Plunder.storageKey = 'plunderoptions';

voyc.Plunder.prototype.toString = function () {
	return 'Plunder';
}

voyc.Plunder.prototype.load = function () {
	log&&console.log(voyc.timer()+'windows load event');

	var self = this;
	voyc.str = new voyc.Str();
	voyc.dispatcher = new voyc.Dispatcher();
	voyc.dispatcher.subscribe(voyc.Event.FileLoaded, this, function(note) {
		self.loadnum++;
		var msg = 'File ' + self.loadnum + ' of ' + self.loadmax;
		var ldr = document.getElementById('loadermsg');
		if (ldr) {
			ldr.innerHTML = msg;
		}
	});
	voyc.dispatcher.publish(voyc.Event.FileLoaded, this, {note:'plunder.js'});

	this.options = this.initOptions();

	this.sprites = {
		hero:    {rows:5, cols:4, w:22, h:16},
		explode: {rows:1, cols:16},
	}
	
	var path = 'assets/';
	var list = [
		{key:'hero'    ,path:path+'sprites/survivor-walk-16.png'},
		{key:'explode' ,path:path+'sprites/explosion-1.png'},
		{key:'tileset' ,path:path+'images/tiles.png'},
		{key:'reddot'  ,path:path+'images/reddot.png'},
		{key:'redxbox' ,path:path+'images/red-xbox.png'},
		{key:'bluebox' ,path:path+'images/blue-xbox.png'},
		{key:'treasure',path:path+'images/chest32.png'},
		{key:'himtn'   ,path:path+'images/highmountains.png'},
		{key:'desert'  ,path:path+'images/desert.png'},
	];

	this.asset = new voyc.Asset();
	var self = this;
	log&&console.log(voyc.timer()+'visual load start');
	this.asset.load(list, function(success, key) {
		if (!key) {
			self.sync('visual', success);	
		}
	});

	this.sound = new voyc.Sound();
	var urlpattern = 'assets/sounds/%sound%.mp3';
	var fxfiles = [
		'explode',
	];
	log&&console.log(voyc.timer()+'audio load start');
	this.sound.loadSounds(urlpattern, fxfiles, function(isSuccess) { self.sync('audio', isSuccess); });

	var scripts = [
		'topojson/topojson.min.js',
		'data/treasure.js',
		'data/deserts.js',
		'data/highmountains.js',
		'data/worldtopo.js',
		'data/empire.js',
	];
	this.scriptLoader = new voyc.ScriptLoader();
	this.scriptLoader.load(scripts, function(isSuccess) { self.sync('scripts', isSuccess); });
	log&&console.log(voyc.timer()+'script load start');
	
	this.game = new voyc.Game();
	this.game.onRender = function(elapsed,timestamp) {self.render(elapsed,timestamp)};

	this.keyboard = new voyc.Keyboard();
	this.keyboard.listenForEvents([
		voyc.Key.LEFT, 
		voyc.Key.RIGHT, 
		voyc.Key.UP, 
		voyc.Key.DOWN,
	]);
	
	this.world = new voyc.World();
	this.world.setup( 
		document.getElementById('world'), 
		[80,20,0],  // start position: india 80E 20N
		document.body.clientWidth,
		document.body.clientHeight
	 );

	this.texture = new voyc.Texture();
	var elem = document.getElementById('texture');
	var filename = 'assets/images/NE2_50M_SR_W.png';
	var w = 10800;
	var h = 5400;
	var scale = 1720; // determined through trial and error.  scale is supposed to be equal to width
	if (this.getOption(voyc.option.HIRES)) {
		this.texture.setup(elem, filename, w, h, scale);
		log&&console.log(voyc.timer()+'texture load start');
//		this.texture.loadTiles('initial', function(isSuccess) {self.sync('texture', isSuccess)});
	}

	this.hero = new voyc.Hero();
	this.hero.setLocation([80,20]);
	this.hero.setSprite(this.sprites.hero);

	// set static class variables in the Effect object
	voyc.Effect.asset = this.asset;
	voyc.Effect.sound = this.sound;

	this.hud = new voyc.Hud();
	this.hud.setup(this.world.getLayer(voyc.layer.HUD).div);
	this.hud.attach();
	this.hud.setTime(this.nowyear);
	this.hud.setWhereami(this.hero.co, '', '');

	this.world.setScale(this.world.scale.now);
	
	// setup UI
	var w = document.getElementById('world');
	w.removeAttribute('hidden');
	var w = document.getElementById('loader');
	w.classList.add('visible');
}

voyc.Plunder.prototype.setOption = function (option,value) {
	this.options[option] = value;
	localStorage.setItem(voyc.Plunder.storageKey, JSON.stringify(this.options));
	if (option == voyc.option.CHEAT) {
		this.hud.showCheat(value);
	}
	if (option == voyc.option.HIRES) {
		this.world.showHiRes(value);
	}
	this.world.moved = true;
}

voyc.Plunder.prototype.getOption = function (option) {
	return (this.options[option]);
}

voyc.Plunder.prototype.initOptions = function () {
	var options = JSON.parse(localStorage.getItem(voyc.Plunder.storageKey)) || {};
	var replace = false;
	for (var k in voyc.Plunder.defaultOptions) {
		if (!(k in options)) {
			options[k] = voyc.Plunder.defaultOptions[k];
			replace = true;
		}
	}
	if (replace) {
		localStorage.setItem(voyc.Plunder.storageKey, JSON.stringify(this.options));
	}
	return (options);
}

voyc.Plunder.prototype.sync = function (name, success) {
	if (!success) {
		log&&console.log(voyc.timer()+name+' load failed. abort.');
		this.alert('Failed to load '+name+' assets.  Try again.')
		return;
	}
	log&&console.log(voyc.timer()+name+' load complete');
	this.loaded[name] = true;
	if (this.loaded['scripts'] && this.loaded['audio'] && this.loaded['visual'] && (!this.options.hires || this.loaded['texture'])) {
		console.log('sync proceeding');

		this.world.setupData();
		this.hero.setImage(this.asset.get('hero'));

		var img = this.asset.get('treasure');
		this.world.iterateeTreasure.draw = {
			image:img,
			w:img.width,
			h:img.height
		};

		this.world.show();
		document.getElementById('loader').classList.add('hidden');
		setTimeout(function() {
			var loader = document.getElementById('loader');
			loader.parentElement.removeChild(loader);
		}, 1000);

		log&&console.log(voyc.timer()+'start game engine');
		if (this.getOption(voyc.option.CHEAT)) {
			this.render(0,0);
			this.hud.showCheat(true);
		}
		else {
			this.game.start();
		}

		// this is hanging up the game engine	
		// try webworker
		if (this.options.hires) {
			var self = this;
			setTimeout(function() {
					log&&console.log(voyc.timer()+'texture remainder load start');
					self.texture.loadTiles('remainder', function(isSuccess) {
						log&&console.log(voyc.timer()+'texture remainder load '+((isSuccess) ? 'complete' : 'failed'));
					});
			}, 3000);
		}
	}
}

/**
	render.  Main loop.  Called by Game animation engine.
*/
voyc.Plunder.prototype.render = function (delta, timestamp) {
	if (timestamp) {
		this.calcTime(timestamp);
	}
	
	// update
	var keyed = this.hud.checkKeyboard();
	var heroMoved = this.hero.move(delta, timestamp, keyed);

	// draw background
	if (this.world.moved) {
		this.world.draw();
	}

	// draw foreground
	var ctx = this.world.getLayer(voyc.layer.FOREGROUND).ctx;
    ctx.clearRect(0, 0, voyc.plunder.world.w, voyc.plunder.world.h);
	this.drawTreasure(ctx);
	this.drawEmpire(ctx);
	this.hero.draw(ctx);

	if (heroMoved) {
		this.hitTest();
		this.whereami();
		this.hero.speedNow = this.hero.speedBest;
	}
	else {
		this.hero.speedNow = 0;
	}
	this.hud.setSpeed(this.hero.speedNow);
	this.drawEffects(ctx);
}

voyc.Plunder.prototype.calcTime = function (timestamp) {
	if (!this.starttime) {
		this.starttime = timestamp;
	}
	this.nowtime = timestamp;
	var ms = this.nowtime - this.starttime;
	var year = Math.round(this.startyear + ((ms / 1000) * this.speedoftime));
	this.setTime(year);
}

voyc.Plunder.prototype.setTime = function (year) {
	this.nowyear = year;
	
	// gameover
	if (!this.getOption(voyc.option.CHEAT) && this.nowyear >= this.lastyear) {
		this.nowyear = this.lastyear;
		this.game.stop();
		this.hud.announce('Game Over', false);
	}

	this.hud.setTime(this.nowyear);
}

voyc.Plunder.prototype.timeslideStart = function() {
	this.timesliding = true;
}

voyc.Plunder.prototype.timeslideValue = function(value) {
//	var diff = this.lastyear - this.startyear;
//	var delta = Math.round(diff * (pct/100));
//	this.setTime(this.startyear + delta);
	this.setTime(value);
	this.drawEmpire();
	this.drawTreasure();
}
voyc.Plunder.prototype.timeslideStop = function() {
	this.timesliding = false;
}

/*
voyc.Plunder.prototype.plotRivers = function () {
	log&&console.log(voyc.timer()+'plotRivers start');
	var geom = [];
	var line = [];
	var co = [];
	var pt = [];
	var newline = [];
	var cntFeatures = 0;
	var cntLines = 0;
	var cntPoints = 0;
	var m = 0;
	var t = [];
	t[0] = '';
	t[1] = '';
	t[2] = '';
	t[3] = '';
	t[4] = '';
	t[5] = '';
	t[6] = '';
	var scalerank = 0;
	for (var i=0; i<window['voyc']['data'].rivers.features.length; i++) {
		// geom is an object that includes type, coordinates, properties.  we add points.
		geom = voyc.data.rivers.features[i].geometry;
		scalerank = voyc.data.rivers.features[i].properties.scalerank;
		geom.points = [];

		// geom.coordinates is an array of linestrings
		for (var j=0; j<geom.coordinates.length; j++) {
			line = geom.coordinates[j];

			// line is an array of coords
			newline = [];
			m = 0;
			for (var n=0; n<line.length; n++) {
				co = line[n];
				pt = this.world.projection(co);  // pt = reverseGeocode(co);
				if (pt[0] > 0 && pt[0] < this.world.w && pt[1] > 0 && pt[1] < this.world.h) {
					newline.push(pt);
					cntPoints++;
					t[scalerank] += ((m) ? 'L' : 'M' ) + pt[0].toFixed(1) + ' ' + pt[1].toFixed(1) + ' ';
					m++;
				}
			}
			if (newline.length > 0) {
				geom.points.push(newline);
				cntLines++;
			}
		}
		if (geom.points.length > 0) {
			cntFeatures++;
		}
	}
	log&&console.log(voyc.timer()+'plotRivers complete, '+cntFeatures+','+cntLines+','+cntPoints);
	// 121ms plotRivers complete, 348,661,24036
	// 90ms plotRivers complete, 28,58,1799
	return t;
}
		
voyc.Plunder.prototype.drawRiversCanvas = function (ctx) {
	log&&console.log(voyc.timer()+'drawRivers start');
	ctx.strokeStyle = '#00f';
	var geom = [];
	var line = [];
	var pt = [];
	for (var i=0; i<voyc.data.rivers.features.length; i++) {
		// geom is an object that includes type, coordinates, properties.  we add points.
		geom = voyc.data.rivers.features[i].geometry;

		// geom.points is an array of linestrings
		for (var j=0; j<geom.points.length; j++) {
			line = geom.points[j];

			// line is an array of coords
			pt = line[0];
			ctx.moveTo(pt[0], pt[1]);
			for (var n=1; n<line.length; n++) {
				pt = line[n];
				ctx.lineTo(pt[0], pt[1]);
			}
			ctx.stroke();
		}
	}
	log&&console.log(voyc.timer()+'drawRivers complete');
}

voyc.Plunder.prototype.drawRiversCanvasAnimated = function (ctx) {
	log&&console.log(voyc.timer()+'drawRiversAnimated start');

	var color = ['#3cf','#09f','#03c'];
	var i = 0;
	var r = 0;
	var getColor = function() {
		r = (this.i++) % 3;
		return color[r];
	}

	var geom = [];
	var line = [];
	var pt = [];
	var ptPrev = [];
	for (var i=0; i<voyc.data.rivers.features.length; i++) {
		// geom is an object that includes type, coordinates, properties.  we add points.
		geom = voyc.data.rivers.features[i].geometry;

		// geom.points is an array of linestrings
		for (var j=0; j<geom.points.length; j++) {
			line = geom.points[j];

			// line is an array of coords
			ctx.strokeStyle = '#0f0'; //getColor();
			ptPrev = line[0];
			ctx.moveTo(ptPrev[0], ptPrev[1]);
			for (var n=1; n<line.length; n++) {
				pt = line[n];
				ctx.lineTo(pt[0], pt[1]);
				ctx.stroke();
				ptPrev = pt;
			}
		}
	}
	log&&console.log(voyc.timer()+'drawRiversAnimated complete');
}
*/

// in what polygons is the hero
voyc.Plunder.prototype.whereami = function () {
	var co = this.hero.co;
	var geoco = {coordinates:co};
	var whereami = '';
	var speed = this.hero.speedBase;

	// features by name
	var featurefactors = {
		'deserts': {speedfactor: .22},
		//'lowmountains': {speedfactor: .18},
		//'mediummountains': {speedfactor: .24},
		'highmountains': {speedfactor: .30},
		//'plateaux': {speedfactor: 0},
		//'plains': {speedfactor: 0},
		//'swamps': {speedfactor: .15},
		//'tundras': {speedfactor: .05},
		//'foothills': {speedfactor: .07},
		//'valleys': {speedfactor: .02},
	};

	//var featurenames = [
	//	'deserts',
	//	//'lowmountains',
	//	'highmountains',
	//	//'mediummountains',
	//	//'plateaux',
	//	//'plains',
	//	//'swamps',
	//	//'tundras',
	//	//'foothills',
	//	//'valleys',
	//];
	//for (var n=0; n<featurenames.length; n++) {
//	for (var ff in featurefactors) {
//		var features = voyc.data[ff].features;
//		for (var i=0; i<features.length; i++) {
//			if (gju.pointInMultiPolygon(geoco, features[i].geometry)) {
//				if (whereami.length) {
//					whereami += '<br/>';
//				}
//				whereami += features[i].properties.name;
//				speed -= (speed * featurefactors[ff].speedfactor);
//			}
//		}
//	}

	var presentday = '';
//	var features = voyc.data.countries.geometries;
//	for (var i=0; i<features.length; i++) {
//		if (gju.pointInMultiPolygon(geoco, features[i].geometry)) {
//			presentday = features[i].properties.name;
//			break;
//		}
//	}

	this.hero.speedBest = speed;
	this.hud.setWhereami(co, whereami, presentday);
}

// is hero touching a treasure
voyc.Plunder.prototype.hitTest = function () {
	var t = {};
	for (var key in this.treasure) {
		t = this.treasure[key];
		if (t['q'] && !t['cap']) {
			var boo = this.isCollision(t);
			if (boo) {
				log&&console.log('collision');
				this.onTreasureCaptured(t);
				break;
			}
		}
	}
}

voyc.Plunder.prototype.isCollision = function (treasure) {
	var rect = {x:this.hero.pt[0], y:this.hero.pt[1], w:this.hero.sprite.w, h:this.hero.sprite.h};
	return this.isPtInRect(treasure, rect);
}

voyc.Plunder.prototype.isPtInRect = function (pt, rect) {
	return ((rect.x < pt.x) && (pt.x < rect.x + rect.w)
		 && (rect.y < pt.y) && (pt.y < rect.y + rect.h));
}

voyc.Plunder.prototype.onTreasureCaptured = function (t) {
	t['cap'] = 1;
	this.score += t['score'];
	this.explode(t[x], t['y']);
	this.hud.setScore(this.score, t['name'], t['msg']);
}

voyc.Plunder.prototype.explode = function (x,y) {
	var rows = this.sprites.explode.rows;
	var cols = this.sprites.explode.cols;
	var ex = new voyc.Effect(x, y, 'explode', rows, cols, 'explode');
	this.effects.push(ex);
}

voyc.Plunder.prototype.drawEffects = function (ctx) {
	for (var i=0; i<this.effects.length; i++) {
		var ef = this.effects[i];
		var b = ef.draw(ctx);
		if (!b) {
			this.effects.splice(i,1);  // finished
		}
	}
}
	
voyc.Plunder.prototype.drawTreasure = function (ctx) {
	this.world.iterator.iterateCollection(window['voyc']['data']['treasure'], this.world.iterateeTreasure);
	return;
	
	for (var key in this.treasure) {
		var t = this.treasure[key];
		if (!t['cap']) {
			t['q'] = false;
			var pt = this.world.projection.project([t['lng'], t['lat']]);
			if (pt 
					&& (pt[0] > 0) && (pt[0]<this.world.w) && (pt[1] > 0) && (pt[1]<this.world.h)
					&& (t['b'] < this.nowyear) && (t['e'] > this.nowyear)
				) {
				t['q'] = true;  // is qualified
				t['x'] = pt[0];
				t['y'] = pt[1];
				
				t['image'] = this.asset.get('treasure');
				t['w'] = t.image.width;
				t['h'] = t.image.height;
				
				ctx.drawImage(
					t['image'], // image

					0, // source x
					0, // source y
					t['w'], // source width
					t['h'], // source height

					t['x'] - (t['w']/2),  // target x
					t['y'] - (t['h']/2), // target y
					t['w'],   // target width
					t['h']    // target height
				);
			}
			else {
				t['q'] = false;
			}
//			console.log([t.q,t.lng,t.lat,t.x,t.y, t.b, t.e, t.name]);
		}
	}
	var i = 2;
};

voyc.Plunder.prototype.drawEmpire = function (ctx) {
	
	// qualify by time
	// when drawing, draw only qualified features, use the color for that feature
	// within the drawing function, access the feature object
	// feature = geometry

	this.world.iterator.iterateCollection(window['voyc']['data']['empire'], this.world.iterateeEmpire);
}

voyc.Plunder.prototype.alert = function (s) {
	var e = document.querySelector('loader');
	if (e) {
		e.innerHTML = s;
	}
	else {
		this.hud.announce(s,false);
	}
}

voyc.Plunder.prototype.resize = function (s) {
	this.world.resize(document.body.clientWidth, document.body.clientHeight);
	this.world.moved = true;
	if (this.getOption(voyc.option.CHEAT)) {
		this.render(0,0);
	}
}

window.addEventListener('resize', function(evt) {
	voyc.plunder.resize();
}, false);

if (log) {
	voyc.timer = function() {
		var leftfill = function(s,n) {
			var t = s.toString();
			while (t.length < n) {
				t = '0'+t;
			}
			return t;
		}
		if (!voyc.plunder.starttime) {
			voyc.plunder.timestamp = new Date();
			voyc.plunder.starttime = voyc.plunder.timestamp;
		}
		var tm = new Date();
		var elapsed = tm - voyc.plunder.timestamp;
		voyc.plunder.timestamp = tm;
		return voyc.plunder.timestamp - voyc.plunder.starttime + 'ms, ' + leftfill(elapsed,4) + 'ms ';
	}
//	log&&console.log(voyc.timer()+'js loaded');
}



/* this is calculate_vector code
used at one time to draw the vector for the hero's journey
			// draw origin point
			var coOrigin = voyc.plunder.world.co;
			var ptOrigin = voyc.plunder.world.pt = voyc.plunder.world.projection(voyc.plunder.world.co);  // pt = reverseGeocode(co)
			var circlesize = .1;
			var circleOrigin = d3.geo.circle();
			circleOrigin.angle(circlesize);
			circleOrigin.origin(coOrigin);
			
			// draw destination point
			var ptDestination = [evt.offsetX, evt.offsetY];
			var coDestination = voyc.plunder.world.projection.invert(ptDestination); // co = geocode(pt);
			var circleDestination = d3.geo.circle();
			circleDestination.origin(coDestination);
			circleDestination.angle(circlesize);

			// draw line to Destination point
			var line = {
				type: "LineString",
				coordinates: [coOrigin, coDestination]
			};
			var geom = [circleOrigin(), circleDestination(), line];

			var ctx = voyc.plunder.world.getLayer().ctx;
			ctx.beginPath();
			ctx.lineWidth = .2;
			ctx.strokeStyle = "#000";
			ctx.fillStyle = "rgba(0,100,0,.5)";
			path({type: "GeometryCollection", geometries: geom});
			ctx.closePath();
			ctx.fill();
			ctx.stroke();

			// log distance and angles to Destination point
			var rads = d3.geo.distance(coOrigin, coDestination);
			var km = rads * voyc.plunder.world.radiusKm;
			var theta = voyc.calcAngle(ptOrigin, ptDestination);
			log&&console.log(voyc.timer()+'distance: ' + rads + ' radians, ' + km + ' km, angle: ' + theta);

			// calc next point
			var speed = voyc.speed.WALK;
			var secondsToNextPoint = km / speed;
			var t = speed / km;
			var coStep = d3.geo.interpolate(coOrigin, coDestination)(t);

			// draw Destination point
			var circleStep = d3.geo.circle();
			circleStep.origin(coStep);
			circleStep.angle(circlesize);
			voyc.plunder.world.ctx.beginPath();
			voyc.plunder.world.ctx.strokeStyle = "#f00";
			voyc.plunder.world.ctx.fillStyle = "#f00)";
			var geom = [circleStep()];
			voyc.plunder.world.path({type: "GeometryCollection", geometries: geom});
			voyc.plunder.world.ctx.closePath();
			voyc.plunder.world.ctx.fill();
			voyc.plunder.world.ctx.stroke();
*/

/** @enum */
voyc.Event = {
	Unused:0,
	FileLoaded:1,
}

