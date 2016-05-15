/**
	Server Communication
	creates one Xhr object for each server request.
	one public method: comm.request()
**/
Comm = function(baseUrl, name, retries, consolidated) {
	this.baseUrl = baseUrl;
	this.name = name || '';
	this.seq = 1;
	this.maxretries = retries || 3;
	this.consolidated = consolidated || false;  // if true, svcname is passed as post parameter
}

Comm.prototype = {
	/**
		svc - string name of the service
		data - javascript object, key-value pairs, all strings
			This data will be the $_POST object in the service.
		callback - a function with prototype (ok, payload, xhr) where
			ok is a boolean
			payload is a javascript object with results from the server
				the payload will always include at least one member:
					status, with a value of 'ok' or some error message string
			xhr is the Xhr object, usually not used except for debugging
	**/
	request: function(svc, data, callback) {
		var xhr = new Xhr();
		xhr.base = this.baseUrl;
		xhr.name = this.name;
		xhr.svc = svc;
		xhr.data = data;
		xhr.callback = callback;
		xhr.seq = this.seq++;
		xhr.maxretries = this.maxretries;
		xhr.consolidated = this.consolidated;
		xhr.callServer();
	}
}


/**
 * Wraps XMLHttpRequest object
 */
Xhr = function() {
	this.req = null;
	this.base = "http://guru.hagstrand.com/svc/";
	this.svc = "echo";
	this.data = "";
	this.method = "POST";   // GET, PUT, POST, DELETE
	this.callback = null;
	this.retries = 0;
	this.maxretries = 3;
	this.seq = 0;
	this.start = 0;
	this.end = 0;
	this.elapsed = 0;
	this.ok = true;
	this.consolidated = false;
}

Xhr.prototype = {
	callServer :function() {
		if (!this.retries) {
			this.start = Date.now();
		}

		this.req = new XMLHttpRequest();

		var self = this;
		this.req.onreadystatechange = function() { self._callback() };

		var url = this.base + this.svc;
		var data = this.data;
		if (this.consolidated) {
			url = this.base;
			data['svc'] = this.svc;
		}

		this.req.open(this.method, url, true);

		this.req.onabort = function() {
			console.log(self.log('in onabort'));
		};

		this.req.onerror = function() {
			console.log(self.log('in onerror'));
		};

		// note: Chrome has its own timeout processing.
		// When Chrome times out, xhr returns status 0 and this callback is not called.
		this.req.ontimeout = function() {
			console.log(this.log('in ontimeout'));
		};
		//this.req.timeout = 5000;

		this.req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
		//this.req.setRequestHeader('Content-Type', 'multipart/form-data');

		// 1. this.data = an object one-level deep
		// 2. http_build_query() converts this object to a string of key/value pairs
		// 3. XmlHttpRequest posts this string
		// 4. php parses this string into $_POST via parse_str()
		var strdata = http_build_query(data);
		this.req.send(strdata);
		console.log(this.log('request ' + this.svc + ' sent'));
	},
	/**
	 * Called on return from the server.
	 * @private
	 */
	_callback : function() {
		if (this.req.readyState != 4) {
			return;
		}
		
		// check results: ok or not
		this.ok = true;
		try {
			if (this.req.status != 200 && this.req.status != 0) {
				console.log(this.log('callback status='+this.req.status));
				this.ok = false;
			}
			else if (!this.req.responseText) {
				console.log(this.log('callback responseText is empty'));
				this.ok = false;
			}
		}
		catch(error) {
			console.log(this.log('caught callback error='+error));
			this.ok = false;
		}
	
		// retry if appropriate
		if (!this.ok && this.retries < this.maxretries) {
			console.log(this.log('retrying'));
			this.retries++;
			delete this.req;  // delete the request with all its callbacks
			this.callServer();  // this will create a new req
			return;
		}

		// finished
		this.end = Date.now();
		this.elapsed = this.end - this.start;
		var response = {};
		if (!this.ok) {
			console.log(this.log('failed'));
		}
		else {
			console.log(this.log('response received'));
			try {
				response = JSON.parse(this.req.responseText);
			}
			catch(err) {
				console.log(this.log('error thrown while parsing response'));
				this.ok = false;
			}
		}

		// call the user's callback
		if (this.callback) {
			this.callback(this.ok, response, this);
		}
	},

	// compose log message	
	log: function(msg) {
		var name = 'xhr.'+this.name;
		return name+' '+this.seq+'.'+this.retries+': ' + msg;
	}
}

/**
 * Compose a query string from a javascript object
 * This string will be undone by php parse_str().
 */
http_build_query = function(params) {
	var s = '';
	var a = '';
	for (i in params) {
		s += i + '=' + encodeURIComponent(params[i]) + '&';
	}
	return s;
}
