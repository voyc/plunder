/** 
	class World
	singleton
	represents the output canvas
	@constructor 
*/
voyc.World = function() {
	this.elem = {};
	this.co = [];
	this.gamma = 0;
	this.w = 0;
	this.h = 0;
	this.scale = {
		now:0,
		min:0,
		max:0,
		game:0
	}
	this.diameter = 0;
	this.radius = 0;
	this.radiusKm = 6371;
	this.projection = function(){};
	this.path = function(){};
	this.globe = {};
	this.layer = [];
	this.moved = true;
	this.dragging = false;
	
	this.option = {
		scaleStep: .14,  // percentage of scale
		spinStep: 6  // degrees
	}

	this.iterator = {};
	this.iterateeLand = {};
	this.iterateeCountries = {};
	this.iterateeEmpire = {};
	this.iterateeGrid = {};
	this.iterateeFeature = {};
	this.iterateeHitTest = {};
}

/** @const */
voyc.World.radiusKm = 6371; // earth radius in kilometers

voyc.World.prototype.setup = function(elem, co, w, h) {
	this.elem = elem;
	this.co = co;
	this.w = w;
	this.h = h;

	// scale in pixels
	this.diameter = Math.min(this.w, this.h);
	this.radius = Math.round(this.diameter / 2);
	this.scale.min = this.radius * .1;
	this.scale.max = this.diameter * 3;
	this.scale.game = this.diameter * 2;
	this.scale.now = this.scale.game;
	
	this.projection = new voyc.OrthographicProjection();
	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.co[2]]);
	this.projection.scale(this.scale.now);                  // size of the circle in pixels
	this.projection.translate([this.w/2, this.h/2]);  // position the circle within the canvas (centered) in pixels
	
	//this.pathsvg = d3.geo.path();
	//this.pathsvg.projection(this.projection);

	// these are the map layers
	this.layer[voyc.layer.FASTBACK] = this.createLayer(false, 'fastback');
	this.layer[voyc.layer.FEATURES] = this.createLayer(false, 'features');
	this.layer[voyc.layer.SLOWBACKA] = this.createLayer(true, 'slowbacka');
	this.layer[voyc.layer.RIVERS] = this.createLayerSVG();
	this.layer[voyc.layer.REFERENCE] = this.createLayer(false, 'reference');
	this.layer[voyc.layer.EMPIRE] = this.createLayer(false, 'empire');
	this.layer[voyc.layer.FOREGROUND] = this.createLayer(false, 'foreground');
	this.layer[voyc.layer.HUD] = this.createLayerDiv('hud');

	// setup interator objects
	this.iterator = new voyc.GeoIterate();
	
	this.iterateeLand = new voyc.GeoIterate.iterateePolygonClipping();
	this.iterateeLand.projection = this.projection;
	this.iterateeLand.ctx = this.getLayer(voyc.layer.FASTBACK).ctx;

	this.iterateeCountries = new voyc.GeoIterate.iterateePolygonClipping();
	this.iterateeCountries.projection = this.projection;
	this.iterateeCountries.ctx = this.getLayer(voyc.layer.REFERENCE).ctx;

	this.iterateeEmpire = new voyc.GeoIterate.iterateePolygonClipping();
	voyc.merge(this.iterateeEmpire, new voyc.GeoIterate.iterateeDrawPerGeometry);
	this.iterateeEmpire.projection = this.projection;
	this.iterateeEmpire.ctx = this.getLayer(voyc.layer.EMPIRE).ctx;
	this.iterateeEmpire.colorstack = voyc.empireColors;
	this.iterateeEmpire.geometryStart = function(geometry) {
		geometry['q'] = geometry['b'] < voyc.plunder.nowyear && voyc.plunder.nowyear < geometry['e'];
		if (geometry['q']) {
			this.ctx.beginPath();
		}
		return geometry.q;
	};
	this.iterateeEmpire.collectionStart = function(collection) {
		this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);
	};

	this.iterateeGrid = new voyc.GeoIterate.iterateeLine();
	this.iterateeGrid.projection = this.projection;
	this.iterateeGrid.ctx = this.getLayer(voyc.layer.REFERENCE).ctx;

	this.iterateeFeature = new voyc.GeoIterate.iterateePolygonClipping();
	this.iterateeFeature.projection = this.projection;
	this.iterateeFeature.ctx = this.getLayer(voyc.layer.FEATURES).ctx;

	this.iterateeHitTest = new voyc.GeoIterate.iterateeHitTest();
	this.iterateeHitTest.projection = this.projection;
}

voyc.World.prototype.resize = function(w, h) {
	this.w = w;
	this.h = h;
	this.diameter = Math.min(this.w, this.h);
	this.projection.translate([this.w/2, this.h/2]);  // position the circle within the canvas (centered) in pixels

	var a = {};
	for (var i in voyc.layer) {
		a = this.getLayer(voyc.layer[i]);
		if (a.type == 'canvas') {
			a.canvas.width  = this.w;
			a.canvas.height = this.h;
			a.canvas.style.width =  this.w + 'px';
			a.canvas.style.height = this.h + 'px';
		}
		else if (a.type == 'svg') {
			a.svg.width  = this.w + 'px';
			a.svg.height = this.h + 'px';
			a.svg.style.width =  this.w + 'px';
			a.svg.style.height = this.h + 'px';
		}
		else if (a.type == 'div') {
			a.div.style.width =  this.w + 'px';
			a.div.style.height = this.h + 'px';
		}
	}
	
	//if (useImageData) {
	//	a.imageData = a.ctx.createImageData(this.w, this.h);
	//}
}

voyc.World.prototype.setupData = function() {
	// setup the river svg layer
	this.createRiverPaths();

	this.data = [];
	this.data.countries = topojson.object(worldtopo, worldtopo['objects']['countries']);
	this.data.land = {
		'type':'GeometryCollection',
		'geometries':[topojson.object(worldtopo, worldtopo['objects']['land'])]
	};
	window['voyc']['data']['grid'] = {
		'type': 'GeometryCollection',
		'geometries': [
			{
				'type': "MultiLine", 
				'coordinates': voyc.Geo.graticule(),
			}
		]
	}
}

voyc.World.prototype.spin = function(dir) {
	switch(dir) {
		case voyc.Spin.LEFT : this.co[0] -= this.option.spinStep; break;
		case voyc.Spin.RIGHT: this.co[0] += this.option.spinStep; break;
		case voyc.Spin.UP   : this.co[1] -= this.option.spinStep; break;
		case voyc.Spin.DOWN : this.co[1] += this.option.spinStep; break;
		case voyc.Spin.CW   : this.co[2] += this.option.spinStep; break;
		case voyc.Spin.CCW  : this.co[2] -= this.option.spinStep; break;
	}
	this.moved = true;
	this.projection.rotate([0-this.co[0], 0-this.co[1], 0-this.co[2]]);
}

voyc.World.prototype.zoomStart = function() {
	this.zooming = true;
}

voyc.World.prototype.zoomPct = function(pct) {
	var diff = this.scale.max - this.scale.min;
	var delta = Math.round(diff * (pct/100));
	this.setScale(this.scale.min + delta);
	this.drawFast();
}
voyc.World.prototype.zoomStop = function() {
	this.zooming = false;
	this.draw();
}

voyc.World.prototype.zoom = function(dir) {
	var x = 0;
	switch(dir) {
		case voyc.Spin.IN: x = -1; break;
		case voyc.Spin.OUT: x = 1; break;
	}
	this.setScale(this.scale.now + (x * this.option.scaleStep * this.scale.now));
}

voyc.World.prototype.setScale = function(newscale) {
	function range(x,min,max) {
		return Math.round(Math.min(max, Math.max(min, x)));
	}
	this.scale.now = range(newscale, this.scale.min, this.scale.max);
	this.projection.scale(this.scale.now);
	this.moved = true;
	var diff = this.scale.max - this.scale.min;
	var zoompct = Math.round((this.scale.now / diff) * 100);
	voyc.plunder.hud.setZoom(zoompct);
	//console.log('scale:'+this.scale.now);
}

voyc.World.prototype.createLayer = function(useImageData, id) {
	var a = {};
	a.type = 'canvas';
	a.canvas = document.createElement('canvas');
	a.canvas.id = id;
	a.canvas.classList.add('layer');
	a.canvas.classList.add('visible');
	a.canvas.classList.add('hidden');
	a.canvas.width  = this.w;
	a.canvas.height = this.h;
	a.canvas.style.width =  this.w + 'px';
	a.canvas.style.height = this.h + 'px';
	this.elem.appendChild(a.canvas);
	a.ctx = a.canvas.getContext("2d");
	if (useImageData) {
		a.imageData = a.ctx.createImageData(this.w, this.h);
	}
	return a;
}

voyc.World.prototype.createLayerSVG = function() {
	var a = {};
	a.type = 'svg';
	//a.svg = document.createElement('svg');
	a.svg = document.createElementNS("http://www.w3.org/2000/svg", 'svg');
	a.svg.classList.add('layer');
	a.svg.classList.add('visible');
	a.svg.classList.add('hidden');
	a.svg.width  = this.w + 'px';
	a.svg.height = this.h + 'px';
	a.svg.style.width =  this.w + 'px';
	a.svg.style.height = this.h + 'px';
	this.elem.appendChild(a.svg);
	return a;
}

voyc.World.prototype.createLayerDiv = function(eid) {
	var a = {};
	a.type = 'div';
	a.div = document.createElement('div');
	a.div.id = eid;
	a.div.classList.add('layer');
	a.div.classList.add('visible');
	a.div.classList.add('hidden');
	a.div.style.width =  this.w + 'px';
	a.div.style.height = this.h + 'px';
	this.elem.appendChild(a.div);
	return a;
}

voyc.World.prototype.createRiverPaths = function() {
	var svg = this.getLayer(voyc.layer.RIVERS).svg;
	for (var i=1; i<=6; i++) {
		var pathStill = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		pathStill.id = 'riverpathstill'+i;
		pathStill.classList.add('river');
		pathStill.classList.add('wid'+i);
		pathStill['__data__'] = window['voyc']['data']['river'][i];
		svg.appendChild(pathStill);
        
		var pathAnim = document.createElementNS("http://www.w3.org/2000/svg", 'path');
		pathAnim.id = 'riverpathanim'+i;
		pathAnim.classList.add('river');
		pathAnim.classList.add('ariver');
		pathAnim.classList.add('wid'+i);
		pathAnim['__data__'] = window['voyc']['data']['river'][i];
		svg.appendChild(pathAnim);
	}
}

voyc.World.prototype.getLayer = function(layer) {
	return this.layer[layer];
}

// this is only called once during setup
voyc.World.prototype.show = function() {

	// first time
	this.getLayer(voyc.layer.FASTBACK).canvas.classList.remove('hidden');
	this.getLayer(voyc.layer.FEATURES).canvas.classList.remove('hidden');

	this.showHiRes(voyc.plunder.getOption(voyc.option.HIRES));
	this.getLayer(voyc.layer.RIVERS).svg.classList.remove('hidden');
	this.getLayer(voyc.layer.REFERENCE).canvas.classList.remove('hidden');
	this.getLayer(voyc.layer.EMPIRE).canvas.classList.remove('hidden');
	this.getLayer(voyc.layer.FOREGROUND).canvas.classList.remove('hidden');
	this.getLayer(voyc.layer.HUD).div.classList.remove('hidden');
}

voyc.World.prototype.drag = function(pt) {
	if (pt) {
		if (!this.dragging) {
			this.dragProjection = voyc.clone(this.projection);
		}
		this.dragging = true;
		var co = this.dragProjection.invert(pt);
		this.co[0] = co[0];
		this.co[1] = co[1];
		this.projection.center(this.co);
		this.moved = true;
		this.drawFast();
	}
	else {
		this.dragging = false;
		this.draw();
	}
}

voyc.World.prototype.setCenterPoint = function(pt) {
	var co = this.projection.invert(pt);
	this.co[0] = co[0];
	this.co[1] = co[1];
	this.projection.center(this.co);
	this.moved = true;
	this.draw();
}
voyc.World.prototype.getCenterPoint = function() {
	return ([Math.round(this.w/2), Math.round(this.h/2)]);
}

voyc.World.prototype.showHiRes = function(boo) {
	if (boo) {
		this.getLayer(voyc.layer.SLOWBACKA).canvas.classList.remove('hidden');
//		this.getLayer(voyc.layer.FASTBACK).canvas.classList.add('hidden');
//		this.getLayer(voyc.layer.FEATURES).canvas.classList.add('hidden');
	}
	else {
		this.getLayer(voyc.layer.SLOWBACKA).canvas.classList.add('hidden');
//		this.getLayer(voyc.layer.FASTBACK).canvas.classList.remove('hidden');
//		this.getLayer(voyc.layer.FEATURES).canvas.classList.remove('hidden');
	}
}

voyc.World.prototype.drawFast = function() {
	var ctx = this.getLayer(voyc.layer.FEATURES).ctx;
	ctx.clearRect(0, 0, this.w, this.h);

	ctx = this.getLayer(voyc.layer.FASTBACK).ctx;
	ctx.clearRect(0, 0, this.w, this.h);
	
	// sphere, oceans
	ctx.fillStyle = voyc.color.water;
	ctx.beginPath();
	ctx.arc(this.w/2, this.h/2, this.projection.k, 0*Math.PI, 2*Math.PI);
	ctx.fill();

	// land
	var land = this.data.land;
	ctx.fillStyle = voyc.color.land;
	ctx.beginPath();
	this.iterator.iterateCollection(this.data.land, this.iterateeLand);
	ctx.fill();

	var ctx = this.getLayer(voyc.layer.REFERENCE).ctx;
	ctx.clearRect(0, 0, this.w, this.h);
	if (voyc.plunder.getOption(voyc.option.GRATICULE)) {
		this.iterator.iterateCollection(window['voyc']['data']['grid'], this.iterateeGrid);
	}
}

voyc.World.prototype.draw = function() {
	this.drawFast();
	this.drawFeatures();
	return;

	//log&&console.log(voyc.timer()+'start draw');
	//this.moved = false;
	//var tmbegin = new Date();

//	if (voyc.plunder.getOption(voyc.option.HIRES)) {
//		var ctx = this.getLayer(voyc.layer.SLOWBACKA).ctx;
//		ctx.clearRect(0, 0, this.w, this.h);
//		var dst = {w:this.w, h:this.h, projection:this.projection, ctx:this.getLayer(voyc.layer.SLOWBACKA).ctx, imageData:this.getLayer(voyc.layer.SLOWBACKA).imageData};
//		voyc.Geo.drawTexture(dst, voyc.plunder.texture);
//	}


	//d3.selectAll('.river').attr('d', this.pathsvg);


//	if (voyc.plunder.getOption(voyc.option.PRESENTDAY)) {
//		ctx.strokeStyle = '#f88';
//		ctx.beginPath();
//		this.iterator.iterateCollection(this.data.countries, this.iterateeCountries);
//		ctx.stroke();
//	}

//	ctx = this.getLayer(voyc.layer.FEATURES).ctx;
//	this.drawFeatures(ctx);

//	log&&console.log(voyc.timer()+'draw complete');
//	var tmend = new Date();
//	var elapsed = tmend.getTime() - tmbegin.getTime();
//	log&&console.log('draw time: ' + elapsed + ' ms')
}

voyc.World.prototype.drawFeatures = function() {
	var ctx = this.getLayer(voyc.layer.FEATURES).ctx;
	ctx.clearRect(0, 0, this.w, this.h);

	// deserts
	var pattern = ctx.createPattern(voyc.plunder.asset.get('desert'), 'repeat');
	ctx.fillStyle = pattern;
	//ctx.fillStyle = voyc.color.desert;
	ctx.beginPath();
	this.iterator.iterateCollection(window['voyc']['data']['deserts'], this.iterateeFeature);
	ctx.fill();

	// high mountains
	var pattern = ctx.createPattern(voyc.plunder.asset.get('himtn'), 'repeat');
	ctx.fillStyle = pattern;
	ctx.beginPath();
	this.iterator.iterateCollection(window['voyc']['data']['highmountains'], this.iterateeFeature);
	ctx.fill();

	return;
/*	
	// medium mountains
	ctx.fillStyle = '#963';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.mediummountains), ctx.fill();

	// low mountains
	ctx.fillStyle = '#060';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.lowmountains), ctx.fill();

	// plateaux
	ctx.fillStyle = '#ff9';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.plateaux), ctx.fill();

	// swamps
	ctx.fillStyle = '#0f0';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.swamps), ctx.fill();

	// foothills
	ctx.fillStyle = '#3c3';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.foothills), ctx.fill();

	// valleys
	ctx.fillStyle = '#0f0';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.valleys), ctx.fill();

	// plains
	ctx.fillStyle = '#0f0';
	ctx.beginPath(), path.ctx(ctx)(voyc.data.valleys), ctx.fill();

	// tundras
	ctx.fillStyle = '#ffe6ff';
	ctx.beginPath(), path.ctx(ctx)(window['voyc']['data']['tundras']), ctx.fill();
*/
}

/** @enum */
voyc.layer = {
	SLOWBACKA:0,
	FASTBACK:2,
	FEATURES:3,
	RIVERS:4,
	REFERENCE:5,
	EMPIRE:6,
	FOREGROUND:7,
	HUD:8,
}

/** @struct */
voyc.color = {
	land: 'rgb(216,218,178)',
	water: 'rgb(111,166,207)',
	desert: 'rgb(235,220,198)',
	highmountain: 'rgb(123,139,125)',
}
/** @const */
voyc.empireColors = ['#f00', '#0f0', '#00f', '#ff0', '#0ff', '#f0f'];

/** @enum */
voyc.Spin = {
	CW:0,
	CCW:1,
	IN:2,
	OUT:3,
	RIGHT:4,
	LEFT:5,
	UP:6,
	DOWN:7,
}		
