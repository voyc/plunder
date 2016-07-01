﻿/**
	class Hud
	singleton
	manages the Hud as the top layer of the map
	@constructor
*/

voyc.Hud = function() {
	// singleton
	if (voyc.Hud._instance) return voyc.Hud._instance;
	else voyc.Hud._instance = this;

	this.elem = {};
	this.keyIsDown = false;
	this.mapzoomer = {};
	this.mapzoomerIsHot = false;
	this.timeslider = {};
	this.timesliderIsHot = false;
	this.dragging = false;
	this.dragOrigin = false;
	this.dragCenter = false;
	this.menuIsOpen = false;
	this.scoreboxIsOpen = false;
}

voyc.Hud.html = '';
voyc.Hud.html += "<div class='full'>";
voyc.Hud.html += "	<div class='hud visible hidden' id='announce'>";
voyc.Hud.html += "		<div id='announcemsg'>announcements</div>";
voyc.Hud.html += "		<button id='announcedone'>OK</button>";
voyc.Hud.html += "	</div>";
voyc.Hud.html += "	<div class='hud visible' id='whereami'>";
voyc.Hud.html += "		<div><span id='hudlatlng'></span><span id='hudspeed'></span></div>";
voyc.Hud.html += "		<div id='hudgeo'></div>";
voyc.Hud.html += "		<div id='hudpresentday'></div>";
voyc.Hud.html += "	</div>";
voyc.Hud.html += "	<div class='hud visible hidden' id='refglobe'>refglobe</div>";
voyc.Hud.html += "	<div class='hud visible' id='score'>";
voyc.Hud.html += "		<div id='hudscore'>0</div>";
voyc.Hud.html += "		<div id='huduser'><a href='#'>Login</a></div>";
voyc.Hud.html += "	</div>";
voyc.Hud.html += "	<div class='hud visible hidden' id='scorebox'>";
voyc.Hud.html += "		<div id='scorename'>name</div>";
voyc.Hud.html += "		<div id='scoremsg'>msg</div>";
voyc.Hud.html += "	</div>";
voyc.Hud.html += "	<div class='hud visible hidden' id='menu'>Preferences:";
voyc.Hud.html += "		<div><label for='menucheat'><input id='menucheat' type='checkbox' />Cheat (Alt-C)</label></div>";
voyc.Hud.html += "		<div><label for='menugraticule'><input id='menugraticule' type='checkbox' />Show Meridians</label></div>";
voyc.Hud.html += "		<div><label for='menupresentday'><input id='menupresentday' type='checkbox' />Show Present-Day Borders</label></div>";
voyc.Hud.html += "		<div><label for='menuhires'><input id='menuhires' type='checkbox' />Hi-Res (90MB Download)</label></div>";
voyc.Hud.html += "		<div class='tcenter'><button id='menudone'>Done</button></div>";
voyc.Hud.html += "	</div>";
voyc.Hud.html += "	<div class='hud visible' id='menubtn'></div>";
voyc.Hud.html += "	<div class='hud visible' id='time'>1300 BCE</div>";
voyc.Hud.html += "	<div class='hud visible hidden' id='mapzoom'><input id='mapzoomer' type='range' min='1' max='100' step='1' value='1' /></div>";
voyc.Hud.html += "	<div class='hud visible hidden' id='timeslide'><input id='timeslider' type='range' /></div>";
voyc.Hud.html += "</div>";

voyc.Hud.prototype.setup = function(elem) {
	this.elem = elem;
	this.elem.innerHTML = voyc.Hud.html;
	this.menuIsOpen = false;
}

voyc.Hud.prototype.attach = function() {
	var self = this;
	document.getElementById('menubtn').addEventListener('click', function(evt) {
		evt.stopPropagation();
		self.populateMenu();
		self.hide(document.getElementById('menubtn'));
		self.show(document.getElementById('menu'));
		self.menuIsOpen = true;
	}, false);
	document.getElementById('menu').addEventListener('click', function(evt) {
		if (self.menuIsOpen) {
			evt.stopPropagation();
		}
	}, false);
	document.getElementById('menudone').addEventListener('click', function(evt) {
		console.log('menu closed');
		evt.stopPropagation();
		self.hide(document.getElementById('menu'));
		self.show(document.getElementById('menubtn'));
		self.menuIsOpen = false;
	}, false);
	document.getElementById('menuhires').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.plunder.setOption(voyc.option.HIRES, evt.target.checked);
	}, false);
	document.getElementById('menucheat').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.plunder.setOption(voyc.option.CHEAT, evt.target.checked);
	}, false);
	document.getElementById('menugraticule').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.plunder.setOption(voyc.option.GRATICULE, evt.target.checked);
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			voyc.plunder.render(0);
		}
	}, false);
	document.getElementById('menupresentday').addEventListener('click', function(evt) {
		evt.stopPropagation();
		voyc.plunder.setOption(voyc.option.PRESENTDAY, evt.target.checked);
	}, false);
	document.getElementById('announcedone').addEventListener('click', function(evt) {
		evt.stopPropagation();
		self.closeAnnouncement();
	}, false);
	
	// map zoomer
	document.getElementById('mapzoom').addEventListener('click', function(evt) {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			evt.stopPropagation();
		}
	}, false);
	this.mapzoomer = document.getElementById('mapzoomer');
	this.mapzoomer.min = voyc.plunder.world.scale.min;
	this.mapzoomer.max = voyc.plunder.world.scale.max;
	this.mapzoomer.addEventListener('mousedown', function(evt) {self.mapZoomerDown(evt)}, false);
	this.mapzoomer.addEventListener('touchstart', function(evt) {self.mapZoomerDown(evt)}, false);
	this.mapzoomer.addEventListener('input', function(evt) {self.mapZoomerMove(evt)}, false);
	this.mapzoomer.addEventListener('touchend', function(evt) {self.mapZoomerUp(evt)}, false);
	this.mapzoomer.addEventListener('mouseup', function(evt) {self.mapZoomerUp(evt)}, false);

	// time slider
	document.getElementById('timeslide').addEventListener('click', function(evt) {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			evt.stopPropagation();
		}
	}, false);
	this.timeslider = document.getElementById('timeslider');
	this.timeslider.min = voyc.plunder.time.begin;
	this.timeslider.max = voyc.plunder.time.end;
	this.timeslider.addEventListener('mousedown', function(evt) {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			self.timesliderIsHot = true;
			evt.stopPropagation();
			voyc.plunder.timeslideStart();
		}
	}, false);
	this.timeslider.addEventListener('input', function(evt) {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			voyc.plunder.timeslideValue(parseInt(this.value,10));
			evt.stopPropagation();
		}
	}, false);
	this.timeslider.addEventListener('mouseup', function(evt) {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			//voyc.plunder.timeslideValue(this.value);
			evt.stopPropagation();
			voyc.plunder.timeslideStop();
			self.timesliderIsHot = false;
		}
	}, false);

	// enable map drag
	this.elem.addEventListener('touchstart', voyc.Hud.dgrab, false);
	this.elem.addEventListener('mousedown',  voyc.Hud.dgrab, false);

    window.addEventListener('keydown', function(evt) {
		if (evt.keyCode == voyc.Key.C && evt.altKey) {
			voyc.plunder.setOption(voyc.option.CHEAT, !voyc.plunder.getOption(voyc.option.CHEAT));
			return;
		}
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			if (evt.ctrlKey) {
				switch (evt.keyCode) {
					case 39: voyc.plunder.timeForward(); break;
					case 37: voyc.plunder.timeBackward(); break;
					default: return;
				}
			}
			else if (evt.shiftKey) {
				switch (evt.keyCode) {
					case 39: voyc.plunder.world.spin(voyc.Spin.CW); break;
					case 37: voyc.plunder.world.spin(voyc.Spin.CCW); break;
					case 38: voyc.plunder.world.zoom(voyc.Spin.IN); break;
					case 40: voyc.plunder.world.zoom(voyc.Spin.OUT); break;
					default: return;
				}
			}
			else {
				switch (evt.keyCode) {
					case 39: voyc.plunder.world.spin(voyc.Spin.LEFT); break;
					case 37: voyc.plunder.world.spin(voyc.Spin.RIGHT); break;
					case 38: voyc.plunder.world.spin(voyc.Spin.UP); break;
					case 40: voyc.plunder.world.spin(voyc.Spin.DOWN); break;
					default: return;
				}
			}
			evt.preventDefault();
			this.keyIsDown = true;
		}
	}, false);
    window.addEventListener('keyup', function(evt) {
		if (this.keyIsDown) {
			this.keyIsDown = false;
			evt.preventDefault();
			voyc.plunder.world.zoomStop();
		}
	}, false);
}

// mapzoomer
voyc.Hud.prototype.mapZoomerDown = function (evt) {
	if (voyc.plunder.getOption(voyc.option.CHEAT)) {
		evt.stopPropagation();
		this.mapzoomerIsHot = true;
		voyc.plunder.world.zoomStart();
	}
}
voyc.Hud.prototype.mapZoomerMove = function (evt) {
	if (voyc.plunder.getOption(voyc.option.CHEAT)) {
		evt.stopPropagation();
		voyc.plunder.world.zoomValue(parseInt(evt.target.value,10));
	}
}
voyc.Hud.prototype.mapZoomerUp = function (evt) {
	if (voyc.plunder.getOption(voyc.option.CHEAT)) {
		evt.stopPropagation();
		voyc.plunder.world.zoomStop();
		this.mapzoomerIsHot = false;
	}
}

// if keyboard is in use, set a destination coordinate
voyc.Hud.prototype.checkKeyboard = function () {
	var keybd = voyc.plunder.keyboard;
	var left  = (keybd.isDown(voyc.Key.LEFT)) ? -1 : 0;
	var right = (keybd.isDown(voyc.Key.RIGHT)) ? 1 : 0;
	var up    = (keybd.isDown(voyc.Key.UP)) ? -1 : 0;
	var down  = (keybd.isDown(voyc.Key.DOWN)) ? 1 : 0;
	var arbitrary = 20; // pixels
	var keyed = left || right || up || down;

	if ((up || down) && keybd.isShift()) {
		voyc.plunder.world.zoom(up || down); // plus or minus 1
	}
	else if (keyed) {
		var pt = [];
		pt[0] = voyc.plunder.hero.pt[0] + ((left + right) * arbitrary);
		pt[1] = voyc.plunder.hero.pt[1] + ((up + down) * arbitrary);
		voyc.plunder.hero.createDestination(pt, true);
	}
	return keyed;
}
	
voyc.Hud.prototype.show = function(elem) {
	elem.classList.remove('hidden');
}
voyc.Hud.prototype.hide = function(elem) {
	elem.classList.add('hidden');
}

voyc.Hud.prototype.showCheat = function(boo) {
	if (boo) {
		voyc.plunder.game.stop();
		this.show(document.getElementById('mapzoom'));
		this.show(document.getElementById('timeslide'));
		document.getElementById('hudscore').innerHTML = 'CHEAT';
	}
	else {
		voyc.plunder.game.start();
		this.hide(document.getElementById('mapzoom'));
		this.hide(document.getElementById('timeslide'));
		document.getElementById('hudscore').innerHTML = voyc.plunder.score;
	}
}
	
voyc.Hud.prototype.populateMenu = function() {
	document.getElementById('menuhires').checked = voyc.plunder.getOption(voyc.option.HIRES);
	document.getElementById('menucheat').checked = voyc.plunder.getOption(voyc.option.CHEAT);
	document.getElementById('menugraticule').checked = voyc.plunder.getOption(voyc.option.GRATICULE);
	document.getElementById('menupresentday').checked = voyc.plunder.getOption(voyc.option.PRESENTDAY);
}

voyc.Hud.prototype.announce = function(msg,duration) {
	document.getElementById('announcemsg').innerHTML = msg;
	this.show(document.getElementById('announce'));
	if (duration) {
		var self = this;
		setTimeout(function() {
			self.closeAnnouncement();
		}, duration);
	}
}

voyc.Hud.prototype.closeAnnouncement = function() {
	this.hide(document.getElementById('announce'));
}

voyc.Hud.prototype.setWhereami = function(location, geo, presentday) {
	var lng = location[0];
	var lat = location[1];
	var loc = Math.abs(lat).toFixed(0) + '&#x00B0; ' + ((lng<0) ? 'S' : 'N') + ', ';
	loc += Math.abs(lng).toFixed(0) + '&#x00B0; ' + ((lng<0) ? 'W' : 'E');
	
	document.getElementById('hudlatlng').innerHTML = loc;
	document.getElementById('hudgeo').innerHTML = geo;
	document.getElementById('hudpresentday').innerHTML = presentday;
}

voyc.Hud.prototype.setSpeed = function(speed) {
	document.getElementById('hudspeed').innerHTML = speed + ' kmpd';
}

voyc.Hud.prototype.setTime = function(time) {
	document.getElementById('time').innerHTML = Math.abs(time) + ' ' + ((time < 0) ? 'BCE' : 'CE');
	if (!this.timesliderIsHot) {
		this.timeslider.value = time;
	}
}

voyc.Hud.prototype.setScore = function(score, name, msg) {
	document.getElementById('hudscore').innerHTML = score;
	document.getElementById('scorename').innerHTML = name;
	document.getElementById('scoremsg').innerHTML = msg;
	this.show(document.getElementById('scorebox'));
	this.scoreboxIsOpen = true;
	var scoreboxduration = 2000;
	var self = this;
	setTimeout(function() {
		self.closeScoreBox();
	}, scoreboxduration);
}
voyc.Hud.prototype.closeScoreBox = function() {
	this.hide(document.getElementById('scorebox'));
	this.scoreboxIsOpen = false;
}

voyc.Hud.prototype.setZoom = function(newvalue) {
	if (!this.mapzoomerIsHot) {
		this.mapzoomer.value = newvalue;
	}
}

/**
	Mouse and Touch
*/

voyc.Hud.prototype.onMap = function(e) { 
	return (!(
		(e.target.id == 'mapzoomer')
		|| (e.target.id == 'timeslider')
		|| (e.target.id == 'menubtn')
		|| (this.menuIsOpen && (
			(e.target.id == 'menu')
			|| (e.target.parentElement.id == 'menu')
			|| (e.target.parentElement.parentElement.id == 'menu')
			|| (e.target.parentElement.parentElement.parentElement.id == 'menu')
		))
		|| (e.target.id == 'scorebox')
		|| (e.target.parentElement.id == 'scorebox')
		|| (e.target.id == 'huduser')
		|| (e.target.parentElement.id == 'huduser')
	));
}

// Return point of mouse or touch
voyc.Hud.prototype.getMousePos = function(e) { 
	var p = false;
	if (e.targetTouches) {
		p = [e.targetTouches[0].pageX, e.targetTouches[0].pageY];
	}
	else if (e.pageX || e.pageY) {
		p = [e.pageX, e.pageY];
	}
	return p;
}
	
// Event Handler for mousedown, touchstart on a draggable element.
voyc.Hud.prototype.ongrab = function(e) {
	if (voyc.plunder.getOption(voyc.option.CHEAT) && this.onMap(e)) {
		console.log('grabbed');
		e.preventDefault();
		e.stopPropagation();

		this.dragging = false;
		this.dragOrigin = this.getMousePos(e);
		this.dragCenter = voyc.plunder.world.getCenterPoint();
		
		this.elem.addEventListener('touchmove', voyc.Hud.ddrag, false);
		this.elem.addEventListener('mousemove', voyc.Hud.ddrag, false);
		this.elem.addEventListener('touchend' , voyc.Hud.ddrop, false);
		this.elem.addEventListener('mouseup'  , voyc.Hud.ddrop, false);
	}
}

// Event Handler for mousemove, touchmove while dragging
voyc.Hud.prototype.ondrag = function(e) {
	if (this.dragOrigin) {
		console.log('dragged');
		e.preventDefault();
		e.stopPropagation();
		pos = this.getMousePos(e);
		this.dragging = true;
		var delta = [pos[0] - this.dragOrigin[0], pos[1] - this.dragOrigin[1]];
		var newCenter = [this.dragCenter[0] - delta[0], this.dragCenter[1] - delta[1]];
		voyc.plunder.world.drag(newCenter);
	}
}

// Event Handler for mouseup, touchend, and touchcancel on a dragging element.
voyc.Hud.prototype.ondrop = function(e) {
	console.log('dropped');
	e.preventDefault();
	e.stopPropagation();

	voyc.plunder.world.drag(false);
	
	if (!this.dragging) {
		this.ontap(this.dragOrigin);
	}
	this.dragging = false;
	this.dragOrigin = false;

	this.elem.removeEventListener('touchmove', voyc.Hud.ddrag, false);
	this.elem.removeEventListener('mousemove', voyc.Hud.ddrag, false);
	this.elem.removeEventListener('touchend',  voyc.Hud.ddrop, false);
	this.elem.removeEventListener('mouseup',   voyc.Hud.ddrop, false);
}

// Event Handler for tap or click
voyc.Hud.prototype.ontap = function(pos) {
	console.log('tapped');
	if (event.target.id == 'menubtn') {
		this.populateMenu();
		this.hide(document.getElementById('menubtn'));
		this.show(document.getElementById('menu'));
	}
	else {
		if (voyc.plunder.getOption(voyc.option.CHEAT)) {
			voyc.plunder.world.setCenterPoint(pos);
			//voyc.plunder.hero.setLocation(voyc.plunder.world.co);
		}
		else {
			voyc.plunder.hero.createDestination(pos, false);
		}
	}
}

// global functions.  (Methods cannot be used with removeEventListener.)
voyc.Hud.dgrab = function(e) { (new voyc.Hud()).ongrab(e); }
voyc.Hud.ddrag = function(e) { (new voyc.Hud()).ondrag(e); }
voyc.Hud.ddrop = function(e) { (new voyc.Hud()).ondrop(e); }
