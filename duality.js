/**
* Duality Web Server
* Copyright (c) 2012 Kristoffer Andersen, stoffera <a>. gmail.com
* All rights reserved.
* 
* This library is free software; you can redistribute it and/or
* modify it under the terms of the GNU Lesser General Public
* License as published by the Free Software Foundation; either
* version 2.1 of the License, or (at your option) any later version.
* 
* This library is distributed in the hope that it will be useful,
* but WITHOUT ANY WARRANTY; without even the implied warranty of
* MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
* Lesser General Public License for more details.
* 
* You should have received a copy of the GNU Lesser General Public
* License along with this library; if not, write to the Free Software
* Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301  USA
*/

/**
* This is a simple node.js HTTP server.
* It can only serve content in twp ways, hence the name duality.
* 1. It can serve static files from a root dir, just as any other conventional server.
* 2. It can map URL's to specific functions and pass specific arguments.
* These two ways of serving content is very powerful. Serve your HTML, JS, CSS 
* etc through method no. 1. When use method no. 2 to provide you WebApp with
* specific data.
*/

/**
* Initialize and return a new duality server object
* This can not be called directly. From you application 
* use the createServer() function.
* 
* @constructor
* @param {string} serve_directory the path to the folder where the static files are shared from
* @param {Object=} opt_routes_table A dictionary of regex string and corrosponding functions.
* @param {Object=} opt_options a dictionary of extra options to the server
* @author Kristoffer Andersen
*/
var duality = function(serve_directory, opt_routes_table, opt_options) {
	this.serveDirectory = serve_directory;
	
	//Assign empty routing table or the provided one
	this.routes = !opt_routes_table ? {} : opt_routes_table;
	
	//Assign any options provided
	if (opt_options) {
		this.serverPort = opt_options['serverPort'] || this.serverPort;
		this.useSessions = opt_options['useSessions'] || this.useSessions;
		this.sessionIdentifier = opt_options['sessionIdentifier'] || this.sessionIdentifier;
		this.serverString = opt_options['serverString'] || this.serverString;
		this.useAccessLog = opt_options['useAccessLog'] || this.useAccessLog;
		this.useAccessControl = opt_options['useAccessControl'] || this.useAccessControl;
		this.accessLoginUrl = opt_options['accessLoginUrl'] || this.accessLoginUrl;
		this.accessResourceCallback = opt_options['accessResourceCallback'] || this.accessResourceCallback;
		this.httpAuthRealm = opt_options['httpAuthRealm'] || this.httpAuthRealm;
		this.httpAuthUserLookupCallback = opt_options['httpAuthUserLookupCallback'] || this.httpAuthUserLookupCallback;
		this.httpAuthLoginSuccessCallback = opt_options['httpAuthLoginSuccessCallback'] || this.httpAuthLoginSuccessCallback;
		this.httpAuthLoginFailedCallback = opt_options['httpAuthLoginFailedCallback'] || this.httpAuthLoginFailedCallback;
	}
	
	//Initialize a sessions array
	this.sessions = {};
	
	//Setup a closure to preserve context of callback
	var context = this;
	this.http = d.http.createServer( function(req,res){context.incomeRequest.call(context,req,res);} );
	this.http.listen(this.serverPort);
	
	console.log(this.serverString+" server listening on port "+this.serverPort+"...");
};

/**
* Libraries used by the duality server
* @private
* @type {Object}
*/
var d = {
	http: require('http'),
	fs: require('fs'),
	url: require('url'),
	path: require('path'),
	crypt: require('crypto')
};

/**
* The list of routes, that mappes URLs to functions.
* @protected
* @type {Object}
*/
duality.prototype.routes = null;

/**
* The path to the servers root serving directory
* @protected
* @type {string}
*/
duality.prototype.serveDirectory = "";

/**
* Server listening port (normally 80)
* @protected
* @type {number}
*/
duality.prototype.serverPort = 8080;

/**
* Set this to true to keep set a session cookie for every client
* @public
* @type {boolean} 
*/
duality.prototype.useSessions = true;

/**
* Name identifier of the cookie string that holds the session
* @protected
* @type {string}
*/
duality.prototype.sessionIdentifier = "duality-session";

/**
* Server identification string header
* @protected
* @type {string}
*/
duality.prototype.serverString = "duality";

/**
* Turn on / off the access log to stdout
* @public
* @type {boolean}
*/
duality.prototype.useAccessLog = true;

/**
* Turn on / off the access control system
* @public
* @type {boolean}
*/
duality.prototype.useAccessControl = false;

/** 
* URL to a login page or a function to display the login page.
* If NULL and access control system is activated - HTTP Auth is used.
* @public
* @type {?string}
*/
duality.prototype.accessLoginUrl = null;

/**
* Resource access control callback function 
* If the access control system is activated, on every incoming 
* request, this function will be called. This function should return TRUE
* if it is allowed to access the URL. FALSE otherwise. The callback function
* is passed a session object, unique for the current client.
* If the callback is NULL, the access control system is effectually OFF.
* @public
* @type {?function(Object):boolean}
*/
duality.prototype.accessResourceCallback = null;

/**
* Accociative array of current sessions
* @protected
* These will never timeout.
*/
duality.prototype.sessions = null;


/**
* The standard node http server
* @protected
* @type {http.createServer}
*/
duality.prototype.http = null;

/**
* The http authetication realm. This will be hashed along with password and usernames.
* Any user table relying on hashed passwords, should retain a fixed realm.
* @protected
* @type {string} 
*/
duality.prototype.httpAuthRealm = "Login";

/**
* Callback function you must define to check the HTTP Auth login credentials.
* The function gets passed the username, and must check the users table for that entry.
* If the entry exists, the function must return the HTTP Auth login hash, as returned
* by this.httpAuthHash();
* @public
* @type {function(string):?string}
*/
duality.prototype.httpAuthUserLookupCallback = null;

/**
* Callback to tell a HTTP Auth login succeeded.
* @public
* @type {function(string)}
*/
duality.prototype.httpAuthLoginSuccessCallback = null;

/**
* Callback to tell a HTTP Auth login failed
* @public
* @type {function(string)}
*/
duality.prototype.httpAuthLoginFailedCallback = null;

/**
* The handles every new incoming request to the server
* @protected
* @param {http.Request} req A incoming HTTP request
* @param {http.Response} res The HTTP response for the current request
*/
duality.prototype.incomeRequest = function(req, res) {
	var url = d.url.parse(req.url, true);
	
	//Set the server header
	res.setHeader('Server',this.serverString);
	
	//create a session if activated
	if (this.useSessions) this.initSession(req,res);
	
	//log the access
	if (this.useAccessLog) this.logRequest(req);
	
	//check access if system is activated
	if (this.useSessions && this.useAccessControl && this.accessResourceCallback) {
		if (!this.checkLogin(req,res)) {
			//client not logged in
			//redirect or present http auth screen
			if (this.accessLoginUrl == null) {
				//Present HTTP Auth
				var nonce = req.currentSession.id;
				var opaque = req.currentSession.id+"abcdef";
				res.setHeader("WWW-Authenticate","Digest realm=\"Login\",qop=\"auth,auth-int\",nonce=\""+nonce+"\",opaque=\""+opaque+"\"");
				res.writeHead(401,{'Content-Type':'text/html'});
				res.end("<h1>Access Denied</h1><p>You do not have access to the requested page.</p>");
				return;
			}
			else {
				//Redirect to login url
				res.writeHead(302,{'Location': this.accessLoginUrl});
				res.end();
				return;
			}
		}
		//User is logged in if we get here
	}
	
	//Try to match a route from the URL
	var matched = false;
	for (var route in this.routes) {
		var match = req.url.match(route);
		if (match != null) {
			this.routes[route].call(this, match, req, res);
			matched = true;
			break;
		}
	}
	
	//No route matched, look for file on disk to serve
	if (!matched)
		this.staticServe(url,req,res);
};

/**
* Try to find a file matching the URL and serve it. If the file is not found give 404 error.
* URL to "/" will be rewritten to "/index.htm".
* @public
* @param {string} url The URL for the request
* @param {http.request} req the current http request
* @param {http.response} res the response for the current http request
*/
duality.prototype.staticServe = function(url, req, res) {
	if (url.pathname == '/')
		url.pathname = 'index.htm';
	
	var self = this;
	d.fs.exists(d.path.join(this.serveDirectory,url.pathname),function(exists){
		if (!exists) {
			res.writeHead(404,{'Content-Type':'text/html'});
			res.end("<h1>File not found</h1><p>The requested file was not found on the server.</p>");
			return;
		}
		else {
			self.serveFile(d.path.join(self.serveDirectory,url.pathname), req , res);
		}
	});
};

/**
* Check if the user is logged in. And has access to the requested resource
* @protected
* @param {http.request} req the current http request
* @param {http.response} res the response for the current http request
*/
duality.prototype.checkLogin = function(req, res) {
	//Ask the resource access callback if the current user has access
	var access = this.accessResourceCallback(req.currentSession, req, res);
	
	if (access) {
		return true;
	}
	//Access was denied, check for any HTTP Auth header
	else if (this.accessLoginUrl == null && req.headers['authorization']) {
		if (req.headers['authorization'].indexOf('Digest') != -1) {
			var digest = this.parseDigest(req,res);
			console.log("Querying user: "+digest.username);
			
			var hash = null;
			if (this.httpAuthUserLookupCallback) hash = this.httpAuthUserLookupCallback(digest.username, req, res);
			else {
				console.error("Cannot authenticate HTTP Auth login, no callback function defined.\nDefine callback for: httpAuthUserLookupCallback");
				return false;
			}
			if (hash == null) {
				console.log("No such user: "+digest.username);
				if (this.httpAuthLoginFailedCallback) this.httpAuthLoginFailedCallback(digest.username, req, res);
				return false;
			}
			// var ha1 = n.crypt.createHash('md5');
			// ha1.update(digest.username+":"+this.httpAuthRealm+":"+users[digest.username]['pass']);
			var ha2 = d.crypt.createHash('md5');
			ha2.update(req.method+":"+digest.uri);
			var resp = d.crypt.createHash('md5');
			resp.update(hash+":"+digest.nonce+":"+digest.nc+":"+digest.cnonce+":"+digest.qop+":"+ha2.digest('hex'));
			var servResp = resp.digest('hex');
			
			if (servResp == digest.response){
				console.log("LOGIN SUCCESS: "+digest.username);
				if (this.httpAuthLoginSuccessCallback) this.httpAuthLoginSuccessCallback(digest.username, req, res);
				return true;
			}
			else {
				console.log("LOGIN: wrong credentials!");
				if (this.httpAuthLoginFailedCallback) this.httpAuthLoginFailedCallback(digest.username, req, res);
				return false;
			}
			
		}
		else if (req.headers['authorization'].indexOf('Basic') != -1)
			console.log("no basic auth support!");
		else
			console.log("auth method not supported!");
	}
	
	return false;
};

/**
* Create a HASH to use with the HTTP AUth for this server. A list of allowed users for 
* this server, can store the hashed value, instead of the passwords in clear text.
* @public
* @param {string} username The username is part of the hash in HTTP Auth Digest
* @param {string} password The password in clear text
* @return {string} The hashed value as a HEX string
*/
duality.prototype.httpAuthHash = function(username, password) {
	return exports.getHttpAuthUserDigest(username, this.httpAuthRealm, password);
};

/**
* Parse the content of the HTTP Auth digest header
* @protected
* @param {http.request} req the current http request
* @param {http.response} res the response for the current http request
*/
duality.prototype.parseDigest = function(req, res) {
	if (req.headers['authorization'] == undefined) {
		console.error("parseDigest - no digest header present!",req.headers);
		return null;
	}
	var dAr = req.headers['authorization'].substring(7).replace(/ /g,"").split(",");
	var digest = {};
	for (var i=0;i<dAr.length;i++) {
		var match = dAr[i].match(/(\w+)=(".+"|[\d\w]+)/);
		digest[match[1]] = match[2].replace(/"/g,"");
	}
	
	return digest;
};

/**
* Log the request params to stdout
* @protected
* @param {http.request} req the current http request
*/
duality.prototype.logRequest = function(req) {
	var d = new Date();
	var log = d.toUTCString()+" - "+req.method+" "+req.url+" ("+req.headers['user-agent']+")";
	if (req.currentSession && req.currentSession.login)
		log = log + " session: "+req.currentSession.login;
	
	console.log(log);
};

/**
* Setup a new session for the request or attach it to an existing session
* @protected
* @param {http.request} req the current http request
* @param {http.response} res the response for the current http request
*/
duality.prototype.initSession = function(req, res) {
	//look for existing session in cookies
	if (req.headers['cookie'] != undefined) {
		var c_array = req.headers['cookie'].split('; ');
		var cookies = {};
		for (var i=0; i<c_array.length; i++) {
			var c = c_array[i].split('=');
			cookies[c[0]] = c[1];
		}
		if (cookies[this.sessionIdentifier] != undefined && this.sessions[cookies[this.sessionIdentifier]] != undefined) {
			req.currentSession = this.sessions[cookies[this.sessionIdentifier]];
			return;
		}
	}
	//look for exiting session as GET parameter
	var url = d.url.parse(req.url, true);
	if (url.query && url.query[this.sessionIdentifier] && this.sessions[url.query[this.sessionIdentifier]] != undefined) {
		req.currentSession = this.sessions[url.query[this.sessionIdentifier]];
		return;
	}
	
	//setup a new session
	var newSesUID = Math.random().toString().substring(2);
	res.setHeader('Set-Cookie',this.sessionIdentifier+'='+newSesUID);
	this.sessions[newSesUID] = {'id':newSesUID, 'cnt':1};
	req.currentSession = this.sessions[newSesUID];
};

/**
* Serve the content of any file on the disk.
* This method is used by the internal static files serving. You can also call this function from you own code
* to serve any file you like.
* Partial content ranges are supported, so only part of the file is served, if request by the client.
* @public
* @param {string} filePath path to the file that should be served
* @param {http.request} req the current http request
* @param {http.response} res the response for the current http request
* @param {boolean} opt_dont_detect_content_type Set this to true to avoid auto detection and setting of content-type header
* @param {boolean=} opt_attachment Set this to TRUE to tell the browser to serve the file as a download
*/
duality.prototype.serveFile = function(filePath, req, res, opt_dont_detect_content_type, opt_attachment) {
	if (!opt_attachment) opt_attachment = false;
	
	//Get the file details
	d.fs.stat(filePath, function(err,stat){
		
		//abort if error
		if (err) {
			console.error("Could not get file stat: "+err);
			res.writeHead(500,{'Content-Type':'text/html'});
			res.end("<h1>Internal server error</h1><p>An error occurred while server the content</p>");
			return;
		}
		
		//Async we have file details, setup response headers
		var start = 0;
		var partial = false;
		var end = parseInt(stat.size,10)-1;
		var fileType = d.path.extname(filePath).substr(1);
	
		//Setup header
		var header = {
			'Cache-Control': 'public',
			Connection: 'keep-alive',
			'Last-Modified': stat.mtime,
			'Content-Disposition': (opt_attachment?'attachment':'inline')+'; filename='+d.path.basename(filePath)
		};
		//only set content type if required
		if (!opt_dont_detect_content_type) {
			header['Content-Type'] = (exports.mimeTypes[fileType] != undefined ? exports.mimeTypes[fileType] : 'application/octet-stream');
		}
	
		//Http Cache control
		var etag = stat.size + "-" + Date.parse(stat.mtime);
		if (req.headers['if-none-match'] === etag) {
			res.writeHead(304,header);
			res.end();
			return;
		}
		else {
			header['ETag'] = etag;
		}
	
		if (req.headers['range']) {
			var match = req.headers.range.match(/bytes=(\d+)-(\d*)/);
			partial = true;
			start = parseInt(match[1],10);
			if (match[2] != undefined && match[2] != '')
				end = parseInt(match[2],10);
		}
		var length = end - start + 1;
		var stream = d.fs.createReadStream(filePath,{
			flags: 'r',
			encoding: null,
			fd: null,
			start: start,
			end: end,
			bufferSize:64*1064
		});
		if (stream) {
			if (partial) {
				header.Status = "206 Partial Content";
				header['Accept-Ranges'] = 'bytes';
				header['Content-Range'] = 'bytes '+start+"-"+end+"/"+stat.size;
			}
		
			header.Pragma = 'public';
			header['Content-Transfer-Encoding'] = 'binary';
			header['Content-Length'] = length;
		
			res.writeHead((start==0?200:206),header);
			stream.pipe(res);
		}
	});
};

/**
* List of supported MIME types. Any file extension not present here
* will be served as application/octet-stream.
* If you need additional MIME types, just append to this object or
* overwrite it. Any changes to this will immediately effect all server instances.
* @type {Object}
*/
exports.mimeTypes = {
	'htm'	: 'text/html',
	'html'	: 'text/html',
	'txt'	: 'text/plain',
	'css'	: 'text/css',
	'xml'	: 'text/xml',
	'csv'	: 'text/csv',
	'js'	: 'application/x-javascript',
	'json'	: 'application/x-javascript',
	'pdf'	: 'application/pdf',
	'zip'	: 'application/zip',
	'gz'	: 'application/gzip',
	'tgz'	: 'application/gzip',
	'gzip'	: 'application/gzip',
	'tar'	: 'application/x-tar',
	'exe'	: 'application/octet-stream',
	'img'	: 'application/octet-stream',
	'bin'	: 'application/octet-stream',
	'swf'	: 'application/x-shockwave-flash',
	'mpg'	: 'video/mpeg',
	'mpeg'	: 'video/mpeg',
	'mov'	: 'video/quicktime',
	'm4v'	: 'video/mp4',
	'mp4'	: 'video/mp4',
	'webm'	: 'video/webm',
	'mkv'	: 'video/x-matroska',
	'avi'	: 'video/x-msvideo',
	'flv'	: 'video/x-flv',
	'm4a'	: 'audio/mp4',
	'mp3'	: 'audio/mpeg',
	'ogg'	: 'audio/ogg',
	'wav'	: 'audio/wav',
	'mid'	: 'audio/midi',
	'png'	: 'image/png',
	'gif'	: 'image/gif',
	'jpg'	: 'image/jpeg',
	'ico'	: 'image/x-icon',
	'svg'	: 'image/svg+xml',
	'tiff'	: 'image/tiff'
};

/**
* Create a new duality server object instance. This function returns
* a server object serving the provided directory and calling functions defined in the routes table.
* If you just want a static file server, then omit the routes table patameter.
* The server takes an options object. You can set additional server 
* parameters through this object.
* 
* @param {string} serve_directory the path to the folder where the static files are shared from
* @param {Object=} opt_routes_table A dictionary of regex string and corrosponding functions.
* @param {Object=} opt_options a dictionary of extra options to the server
* @return {duality} An instance of the duality server class.
*/
exports.createServer = function(serve_directory, opt_routes_table, opt_options) {
	return new duality(serve_directory, opt_routes_table, opt_options);
};

/**
* Global function to create the HTTP Auth Digest HASH of Username:Realm:password
* if you know what Realm to use, then this function can be used to create hashes
* to store in a user table. This will eliminate the need to store the password in clear text.
* @param {string} username The username, which is a part of the hash
* @param {string} realm The realm used for the HTTP Auth
* @param {string} password the password in clear text
* @return {string} The hashed value as a HEX string
*/
exports.getHttpAuthUserDigest = function(username, realm, password) {
	var ha1 = d.crypt.createHash('md5');
	ha1.update(username+":"+realm+":"+password);
	return ha1.digest('hex');
};

/**
* The vurrent release of Duality
* @type {number}
*/
exports.VERSION = 0.8;