/**
	class Game
	singleton
	@constructor
	Provides animation loop. 
	Calls onRender callback function
*/
voyc.Game = function() {
	this.starttime = 0;
	this.previousTimestamp = 0;
	this.delta = 0;
	this.elapsed = 0;
	this.frames = 0;
	this.fps = 0;
	this.running = false;
	this.onRender = function() {};
}

voyc.Game.prototype.start = function () {
	log&&console.log('start');
	this.running = true;
	this.starttime = 0;
	this.frames = 0;
	this.previousTimestamp = 0;
	var self = this;
	window.requestAnimationFrame(function(timestamp) {self.step(timestamp)});
}

voyc.Game.prototype.stop = function () {
	log&&console.log('stop');
	this.running = false;
}

voyc.Game.prototype.step = function (timestamp) {
	if (!this.starttime) this.starttime = timestamp;
	if (!this.previousTimestamp) this.previousTimestamp = timestamp;

	this.delta = timestamp - this.previousTimestamp;
	this.elapsed = timestamp - this.starttime;
    this.previousTimestamp = timestamp;
	this.frames++;
	this.fps = (this.frames / (this.elapsed / 1000));

	this.render(this.delta);

	if (this.running) {
		var self = this;
		window.requestAnimationFrame(function(timestamp) {self.step(timestamp)});
	}
}

voyc.Game.prototype.render = function (delta) {
	log&&!(this.frames % 100)&&console.log('render ' + delta + ' ' + this.elapsed + ' ' + this.frames + ' ' + this.fps);
	this.onRender(delta);
}
