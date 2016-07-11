/**
	@constructor
*/
voyc.Hero = function() {
	this.ctx = /**@type CanvasRenderingContext2D */({});
	this.sprite = {};
	this.co = [0,0];
	this.pt = [0,0];
	this.ptPrev = [0,0];
	this.ptDiff = [0,0];
	this.moved = false;
	this.frame = 0;
	this.image = {};
	this.crosshair = {};
	this.dest = {
		moving:false,
		ptStart: [],
		ptEnd: [],
		distance:0,
		angle:0,
		coStart:[],
		coEnd:[],
		stepDistance:0,
		ptStep:[],
		coStep:[]
	}

	this.speed = {
		base:voyc.speed.WALK,
		best:voyc.speed.WALK,
		now:voyc.speed.WALK
	}
}

voyc.Hero.prototype.setLocation = function(co) {
	this.co = co;
	this.pt = voyc.plunder.world.projection.project(this.co);
	this.moved = true;
}

voyc.Hero.prototype.setSprite = function(sprite) {
	this.sprite = sprite;
}

voyc.Hero.prototype.setImage = function(image) {
	this.image = image;
}

voyc.Hero.prototype.setCrosshair = function(image) {
	this.crosshair = image;
}

// called by mouse click handler and checkKeyboard()
voyc.Hero.prototype.createDestination = function(pt, isKeyboard) {
	this.dest.ptEnd = pt;
	this.dest.moving = true;
	this.dest.isKeyboard = isKeyboard || false;
	this.dest.starttime = voyc.plunder.previousTimestamp;
	this.dest.prevtime = voyc.plunder.previousTimestamp;
	this.dest.ptStart = this.pt;
	this.dest.angle = voyc.Geo.calcAngle(this.dest.ptStart, this.dest.ptEnd);
	this.dest.coStart = this.co;
	this.dest.coEnd = voyc.plunder.world.projection.invert(this.dest.ptEnd);
	var rads = voyc.Geo.distance(this.dest.coStart,this.dest.coEnd);
	this.dest.distance = rads * voyc.plunder.world.radiusKm;
	this.dest.t = 0;
}

voyc.Hero.prototype.stepDestination = function(speed, timestamp) {
	this.dest.stepDistance = speed * ((timestamp - this.dest.prevtime) / 1000);
	this.dest.prevtime = timestamp;
	var t = this.dest.stepDistance / this.dest.distance;
	this.dest.t += t;
	if (this.dest.t >= 1) {
		this.dest.moving = false;
		this.dest.t = 1;
	}
	this.dest.coStep = voyc.Geo.interpolate(this.dest.coStart, this.dest.coEnd, this.dest.t);
	this.dest.ptStep = voyc.plunder.world.projection.project(this.dest.coStep);

	this.ptPrev = this.pt;
	this.pt = this.dest.ptStep;
	this.co = this.dest.coStep;
}

voyc.Hero.prototype.updateDestination = function() {
	if (this.dest.moving) {
		this.dest.ptStart = voyc.plunder.world.projection.project(this.dest.coStart);
		this.dest.ptEnd = voyc.plunder.world.projection.project(this.dest.coEnd);
	}
}

voyc.Hero.prototype.stop = function() {
	this.dest.moving = false;
}

voyc.Hero.prototype.isMoving = function() {
	return this.dest.moving;
}

// called by onrender.  if we have a destination, move towards it.
voyc.Hero.prototype.move = function (keyed, timestamp) {
	if (!keyed && this.dest.isKeyboard) {
		this.stop();
	}

	if (this.isMoving()) {
		this.stepDestination(this.speed.now, timestamp);
		if (this.isMarginal()) {
			voyc.plunder.world.moveToCoord(this.co);
		}
	}
	
	this.moved = this.isMoving();
}
	
voyc.Hero.prototype.isMarginal = function () {
	return !(voyc.plunder.world.marginRect.l < this.pt[0] && this.pt[0] < voyc.plunder.world.marginRect.r
		&& voyc.plunder.world.marginRect.t < this.pt[1] && this.pt[1] < voyc.plunder.world.marginRect.b);
}

voyc.Hero.prototype.draw = function () {
	// if hero is moving, increment the frame number
	if (this.isMoving()) {
		this.frame++;
	}	

	// frame is an integer between 0 and numframes
	if (this.frame >= (this.sprite.rows * this.sprite.cols)) {
		this.frame = 0;
	}
	
	// calc row and col from frame
	var i=0, row=0, col=0;
	while (i<this.frame) {
		i++;
		col++;
		if (col > this.sprite.cols) {
			col = 0;
			row++;
		}
	}

	// begin drawing
	this.ctx.clearRect(0, 0, voyc.plunder.world.w, voyc.plunder.world.h);

	// temporarily shift the output canvas to the hero's location
	this.ctx.save();
	var tx = this.pt[0]; // + (this.w/2);
	var ty = this.pt[1]; // + (this.h/2);
	this.ctx.translate(tx,ty);

	// rotate in the direction of travel
	var r = this.dest.angle	* (Math.PI / 180);  // degrees to radians
	this.ctx.rotate(r);
	
	this.ctx.drawImage(
		this.image, // image

		(col * this.sprite.w), // source x
		(row * this.sprite.h), // source y
		this.sprite.w, // source width
		this.sprite.h, // source height

		(-this.sprite.w/2), // target x     // draw at 0,0 minus the offset, translate has positioned x,y at 0,0
		(-this.sprite.h/2), // target y
		this.sprite.w,  // target width
		this.sprite.h   // target height
	);
	this.ctx.restore();
};

voyc.Hero.prototype.showCheat = function (boo) {
	if (boo) {
		this.ctx.clearRect(0, 0, voyc.plunder.world.w, voyc.plunder.world.h);
		this.ctx.drawImage(
			this.crosshair, // image

			0, // source x
			0, // source y
			this.crosshair.width, // source width
			this.crosshair.height, // source height

			voyc.plunder.world.w/2 - (this.crosshair.width/2), // target x
			voyc.plunder.world.h/2 - (this.crosshair.height/2), // target y
			this.crosshair.width,   // target width
			this.crosshair.height  // target height
		)	;
	}
	else {
	}
}

/** @enum */
voyc.speed = {
	WALK:400, // KM per decade (kmpd)
	RUN:800,
	SWIM:800,
	FLY:3000,
};
