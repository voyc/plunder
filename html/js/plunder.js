
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
	this.savedGame = {};
	
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
	this.loadmax = 20;
	this.loaded = {};
	this.options = {};
	this.score = 0;

	this.option = {
		timeStepPct: .05,
	}
	this.gamestart = {
		cohero: [80,20],
		time: -3500
	}
	
	this.timestamp = {
		start:0,
		now: 0
	}

	this.time = {
		begin: 0,
		end: 0,
		now: 0,
		step: 0,
		moved: false,
		sliding: false,
		speed: 10 // years per second	
	}
	
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

	this.time.begin = this.gamestart.time;
	this.time.end = (new Date().getFullYear());
	this.time.now = this.gamestart.time;
	this.time.step = Math.round((this.time.end - this.time.begin) * this.option.timeStepPct);

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
		{key:'crosshair',path:path+'images/crosshair.png'},
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
	this.game.onRender = function(timestamp) {self.render(timestamp)};

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
	this.hero.setLocation(this.gamestart.cohero);
	this.hero.setSprite(this.sprites.hero);
	this.hero.ctx = this.world.getLayer(voyc.layer.HERO).ctx;

	// set static class variables in the Effect object
	voyc.Effect.asset = this.asset;
	voyc.Effect.sound = this.sound;

	this.hud = new voyc.Hud();
	this.hud.setup(this.world.getLayer(voyc.layer.HUD).div);
	this.hud.attach();
	this.hud.setTime(this.time.now);
	this.hud.setWhereami(this.hero.co, '', '');

	this.world.setScale(this.world.scale.now);
	
	// setup UI
	var w = document.getElementById('world');
	w.removeAttribute('hidden');
	w = document.getElementById('loader');
	w.classList.add('visible');
}

voyc.Plunder.prototype.saveGame = function() {
	var sgame = {};
	sgame.worldco = this.world.co;
	sgame.heroco  = this.hero.co;
	sgame.time    = this.time.now;
	sgame.score   = this.score;
	this.savedGame = sgame;
}
voyc.Plunder.prototype.restoreGame = function() {
	var sgame = this.savedGame;
	//this.world.co = sgame.worldco;
	//this.hero.co  = sgame.heroco ;
	//this.time.now = sgame.time   ;
	//this.score    = sgame.score  ;

	this.hero.co  = this.world.co ;
}

voyc.Plunder.prototype.cheat = function(boo) {
	if (boo) {
		this.saveGame();
	}
	else {
		this.restoreGame();
	}
	this.hud.showCheat(boo);
	this.hero.showCheat(boo);
}

voyc.Plunder.prototype.setOption = function (option,value) {
	this.options[option] = value;
	localStorage.setItem(voyc.Plunder.storageKey, JSON.stringify(this.options));
	if (option == voyc.option.CHEAT) {
		this.cheat(value);
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
		this.hero.setCrosshair(this.asset.get('crosshair'));

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
			this.cheat(true);
			this.render(0);
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
	render.  Main loop.  
		Called by Game animation engine.
		Called manually when in Cheat mode.
*/
voyc.Plunder.prototype.render = function (timestamp) {
	if (timestamp) {
		this.calcTime(timestamp);
	}

	// update
	if (!this.getOption(voyc.option.CHEAT)) {
		var keyed = this.hud.checkKeyboard();
		this.hero.move(keyed, timestamp);
	}

	if (this.world.moved) {
		this.hero.updateDestination();
	}

	// draw world		
	if (this.world.moved || this.time.moved) {
		var ctx = this.world.getLayer(voyc.layer.FOREGROUND).ctx;
		ctx.clearRect(0, 0, voyc.plunder.world.w, voyc.plunder.world.h);
		var ctx = this.world.getLayer(voyc.layer.EMPIRE).ctx;
		ctx.clearRect(0, 0, voyc.plunder.world.w, voyc.plunder.world.h);
	}
	if (this.world.moved) {
		this.world.drawOceansAndLand();
		this.world.drawGrid();
	}	
	if (this.world.moved && !this.world.dragging && !this.world.zooming) {
		this.world.drawFeatures();
		this.world.drawRivers();
	}
	if ((this.world.moved || this.time.moved) && !this.world.dragging && !this.world.zooming) {
		var ctx = this.world.getLayer(voyc.layer.EMPIRE).ctx;
		this.drawEmpire(ctx);
		ctx = this.world.getLayer(voyc.layer.FOREGROUND).ctx;
		this.drawTreasure(ctx);
	}
	if ((this.world.moved || this.hero.moved) && !this.getOption(voyc.option.CHEAT)) {
		this.hero.draw();
	}

	if ((this.getOption(voyc.option.CHEAT) && !this.world.dragging && !this.world.zooming)
			|| (!this.getOption(voyc.option.CHEAT) && (this.hero.moved))) {
		this.hitTestFeatures();
	}

	if ((this.time.moved || this.hero.moved) && !this.getOption(voyc.option.CHEAT)) {
		this.hitTestTreasure();
	}

	this.hero.speed.now = (this.hero.moved) ? this.hero.speed.best : 0;
	this.hud.setSpeed(this.hero.speed.now);
	//console.log('set speed: ' + this.hero.speed.now);

	this.drawEffects(ctx);
	
	this.world.moved = false;
	this.time.moved = false;
	this.hero.moved = false;
	this.previousTimestamp = timestamp;
	return;
}

voyc.Plunder.prototype.calcTime = function (timestamp) {
	if (!this.timestamp.start) {
		this.timestamp.start = timestamp;
	}
	this.timestamp.now = timestamp;
	var ms = this.timestamp.now - this.timestamp.start;
	var year = Math.round(this.time.begin + ((ms / 1000) * this.time.speed));
	this.setTime(year);
}

voyc.Plunder.prototype.setTime = function (year) {
	this.time.now = year;
	this.time.moved = true;
	
	// gameover
	if (!this.getOption(voyc.option.CHEAT) && this.time.now >= this.time.end) {
		this.time.now = this.time.end;
		this.game.stop();
		this.hud.announce('Game Over', false);
	}

	this.hud.setTime(this.time.now);
}

// called on timeslider 
voyc.Plunder.prototype.timeslideStart = function() {
	this.time.sliding = true;
}
voyc.Plunder.prototype.timeslideValue = function(value) {
	this.setTime(value);
	this.render(0);
}
voyc.Plunder.prototype.timeslideStop = function() {
	this.time.sliding = false;
}

// called on keystrokes
voyc.Plunder.prototype.timeForward = function() {
	function range(x,min,max) {
		return Math.round(Math.min(max, Math.max(min, x)));
	}
	var time = range(this.time.now + this.time.step, this.time.begin, this.time.end);
	this.setTime(time);
	this.time.sliding = true;
}
voyc.Plunder.prototype.timeBackward = function() {
	function range(x,min,max) {
		return Math.round(Math.min(max, Math.max(min, x)));
	}
	var time = range(this.time.now - this.time.step, this.time.begin, this.time.end);
	this.setTime(time);
	this.time.sliding = true;
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

// on hit, set whereami string and speed
voyc.Plunder.prototype.hitTestFeatures = function () {
	var hitString = '';
	var speed = this.hero.speed.base;
	this.world.iterateeHitTest.name = '';
	this.world.iterateeHitTest.targetCoord = 
		(this.getOption(voyc.option.CHEAT)) ? this.world.co : this.hero.co;
	this.world.iterateeHitTest.suffix = ' Desert';
	this.world.iterator.iterateCollection(window['voyc']['data']['deserts'], this.world.iterateeHitTest);
	if (this.world.iterateeHitTest.name) {
		hitString += this.world.iterateeHitTest.name + '<br/>';
		speed *= voyc.SpeedFactor.deserts;
	}

	this.world.iterateeHitTest.name = '';
	this.world.iterateeHitTest.suffix = '';
	this.world.iterator.iterateCollection(window['voyc']['data']['highmountains'], this.world.iterateeHitTest);
	if (this.world.iterateeHitTest.name) {
		hitString += this.world.iterateeHitTest.name + '<br/>';
		speed *= voyc.SpeedFactor.highmountains;
	}

	this.hud.setWhereami(this.world.iterateeHitTest.targetCoord, hitString, '');
	this.hero.speed.best = speed;
}

voyc.Plunder.prototype.hitTestTreasure = function () {
	this.world.iterateeHitTestTreasure.targetRect = {
		l:this.hero.pt[0] - this.hero.sprite.w,
		t:this.hero.pt[1] - this.hero.sprite.h,
		r:this.hero.pt[0] + this.hero.sprite.w,
		b:this.hero.pt[1] + this.hero.sprite.h
	};
	this.world.iterator.iterateCollection(window['voyc']['data']['treasure'], this.world.iterateeHitTestTreasure);
	if (this.world.iterateeHitTestTreasure.geom) {
		this.onTreasureCaptured(this.world.iterateeHitTestTreasure.geom);
	}
}

voyc.Plunder.prototype.onTreasureCaptured = function (t) {
	t['cap'] = 1;
	this.score += t['score'];
	this.explode(t['pt'][0], t['pt'][1]);
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

voyc.Plunder.prototype.resize = function (evt) {
	this.world.resize(document.body.clientWidth, document.body.clientHeight);
	this.world.moved = true;
	if (this.getOption(voyc.option.CHEAT)) {
		this.render(0);
	}
}

window.addEventListener('resize', function(evt) {
	voyc.plunder.resize(evt);
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

/** @enum */
voyc.SpeedFactor = {
	deserts: .22,
	highmountains: .30,
	mediummountains: .24,
	lowmountains: .18,
	plateaux: 0,
	plains: 0,
	swamps: .15,
	tundras: .05,
	foothills: .07,
	valleys: .02,
};
