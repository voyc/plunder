/** @enum */
voyc.Key = {
	LEFT: 37,
	RIGHT: 39,
	UP: 38,
	DOWN: 40,
	ESC: 27,
	RETURN: 13
}

/** @constructor */
voyc.Keyboard = function() {
	this.keys = {};
	this.shift = false;
}

voyc.Keyboard.prototype.listenForEvents = function (keys) {
    window.addEventListener('keydown', this._onKeyDown.bind(this));
    window.addEventListener('keyup', this._onKeyUp.bind(this));

    keys.forEach(function (key) {
        this.keys[key] = false;
    }.bind(this));
}

voyc.Keyboard.prototype._onKeyDown = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this.keys) {
        event.preventDefault();
        this.keys[keyCode] = true;
    }
	this.shift = event.shiftKey;
};

voyc.Keyboard.prototype._onKeyUp = function (event) {
    var keyCode = event.keyCode;
    if (keyCode in this.keys) {
        event.preventDefault();
        this.keys[keyCode] = false;
    }
	this.shift = event.shiftKey;
};

voyc.Keyboard.prototype.isDown = function (keyCode) {
    if (!keyCode in this.keys) {
        throw new Error('Keycode ' + keyCode + ' is not being listened to');
    }
    return this.keys[keyCode];
};

voyc.Keyboard.prototype.isShift = function () {
    return this.shift;
};
