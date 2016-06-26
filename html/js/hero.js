/** @enum */
voyc.speed = {
	WALK:200, // KM per decade (kmpd)
	RUN:400,
	SWIM:800,
	FLY:3000,
};

/**
	@constructor
*/
voyc.Hero = function() {
	this.sprite = {};
	this.co = [0,0];
	this.pt = [0,0];
	this.ptPrev = [0,0];
	this.ptDiff = [0,0];
	this.frame = 0;
	this.image = {};
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
	this.speedBase = voyc.speed.WALK;
	this.speedBest = this.speedBase;
	this.speedNow = 0;
}

voyc.Hero.prototype.setLocation = function(co) {
	this.co = co;
	this.pt = voyc.plunder.world.projection.invert(this.co);
}

voyc.Hero.prototype.setSprite = function(sprite) {
	this.sprite = sprite;
}

voyc.Hero.prototype.setImage = function(image) {
	this.image = image;
}

// called by mouse click handler and checkKeyboard()
voyc.Hero.prototype.createDestination = function(pt, isKeyboard) {
	this.dest.ptEnd = pt;
	this.dest.moving = true;
	this.dest.isKeyboard = isKeyboard || false;
	this.dest.starttime = 0;
	this.dest.ptStart = this.pt;
	this.dest.angle = voyc.Geo.calcAngle(this.dest.ptStart, this.dest.ptEnd);
	this.dest.coStart = this.co;
	this.dest.coEnd = voyc.plunder.world.projection.invert(this.dest.ptEnd);   // co = geocode(pt)
	var rads = voyc.Geo.distance(this.dest.coStart,this.dest.coEnd);
	this.dest.distance = rads * voyc.plunder.world.radiusKm;
}

voyc.Hero.prototype.stepDestination = function(speed, deltatime, timestamp) {
	if (!this.dest.starttime) {
		this.dest.starttime = timestamp - deltatime;
	}
	this.dest.stepDistance = speed * ((timestamp - this.dest.starttime) / 1000);
	var t = this.dest.stepDistance / this.dest.distance;
	if (t >= 1) {
		this.dest.moving = false;
		t = 1;
	}
	this.dest.coStep = voyc.Geo.interpolate(this.dest.coStart, this.dest.coEnd, t);
	this.dest.ptStep = voyc.plunder.world.projection.project(this.dest.coStep);

	this.ptPrev = this.pt;
	this.pt = this.dest.ptStep;
	this.co = this.dest.coStep;
}

voyc.Hero.prototype.stop = function() {
	this.dest.moving = false;
}

voyc.Hero.prototype.isMoving = function() {
	return this.dest.moving;
}

// called by onrender.  if we have a destination, move towards it.
voyc.Hero.prototype.move = function (deltatime, timestamp, keyed) {
	if (!keyed && this.dest.isKeyboard) {
		this.stop();
	}

	if (this.isMoving()) {
		var pt = this.stepDestination(this.speedNow,deltatime, timestamp);
	}
	
	return this.isMoving();
}
	
voyc.Hero.prototype.draw = function (ctx) {
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

	var r = this.dest.angle	* (Math.PI / 180);  // degrees to radians

	// temporarily shift the output canvas to the hero's location
	ctx.save();
	var tx = this.pt[0]; // + (this.w/2);
	var ty = this.pt[1]; // + (this.h/2);
	ctx.translate(tx,ty);

	// rotate in the direction of travel
	ctx.rotate(r);
	
	ctx.drawImage(
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
	ctx.restore();
};
