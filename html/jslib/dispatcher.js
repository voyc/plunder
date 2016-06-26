/**
	Dispatcher 
	Passes Note objects from publishers to subscribers.
	@constructor
*/
voyc.Dispatcher = function() {
	this.stack = [];
}

voyc.Dispatcher.prototype = {
	subscribe: function(event, subscriber, callback) {
		//console.log('note '+event+' subscribed to by '+subscriber);
	
		// first time subscribed, create the callback-array
		if (!this.stack[event]) {
			this.stack[event] = [];
		}

		// add this callback to the callback-array for this event
		this.stack[event].push( {subscriber:subscriber, callback:callback});
	},

	publish: function(event, publisher, payload) {
		var note = new voyc.Note(event, publisher, payload);

		// if no one has subscribed to this event, exit now
		if (!this.stack[note.event]) {
		   	console.log('note '+voyc.str.get(note.event)+' published by '+note.publisher.toString()+' but unsubscribed');
			return;
		}
		
		// call each callback in the callback-array
		console.log('note '+voyc.str.get(note.event)+' published by '+note.publisher.toString());
		var callbackarray = this.stack[note.event];
		var cb,msg;
		var passing = [];
		passing.push(note);
		var self = this;
		setTimeout(function() {
			for (var i=0; i<callbackarray.length; i++) {
				cb = callbackarray[i];
				console.log('note '+voyc.str.get(note.event)+' published to handler '+cb.subscriber.toString());
				cb.callback.apply(self, passing);
			}
		}, 0);
	}
}


/**
	class Note, as in Notification.
	@constructor
	A Note is passed from publisher to subscribers 
	by the Dispatcher.
*/
voyc.Note = function(event, publisher, payload) {
	this.event = event,
	this.publisher = publisher,
	this.payload = payload,
	this.start = Date.now(),
	this.end = 0;
	this.elapsed = 0;
}

voyc.Note.prototype = {
	finish: function() {
		this.end = Date.now();
		this.elapsed = this.end - this.start;
	},
	toString: function() {
		var s = event
		return s;
	}
}
