/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

/** Server listen port */
var serverPort = 8080;

/** Media Directory to serve: */
var browseDir = "/home/public/Film";

/** List of allowed users */
var users = {
	'admin' : {'pass':'admin', 'loggedIn':false}
};

/**  List of known MIME types */
var mimeTypes = {
	'htm' : 'text/html',
	'js' : 'application/x-javascript',
	'html': 'text/html',
	'm4v': 'video/mp4',
	'mp4': 'video/mp4',
	'txt' : 'text/plain',
	'css': 'text/css',
	'png': 'image/png',
	'gif': 'image/gif',
	'jpg': 'image/jpeg'
};

/**  Here begins the real server app */
var n = {};
n.http = require('http');
n.fs = require('fs');
n.url = require('url');
n.path = require('path');
n.util = require('util');
n.crypt = require('crypto');
n.proc = require("child_process");
n.querystring = require('querystring');
n.metadata = require('./metadata');
n.im = require('imagemagick');

var login = false;

var sessions = {};

var staticServe = function(url,req,res) {
	if (url.pathname == '/')
		url.pathname = 'index.htm';
	
	n.fs.exists(n.path.join('www',url.pathname),function(exists){
		if (!exists) {
			res.writeHead(404);
			res.end("File not found!");
			return;
		}
		else {
			serveFile(n.path.join('www',url.pathname), req , res);
		}
	});
};

var scanDir = function(match, req, res) {
	var path = n.querystring.unescape(match[1]);
	//n.fs.exists(n.path.join(browseDir,path),function(exists){
		n.fs.stat(n.path.join(browseDir,path),function(err,stats){
			if (stats && stats.isDirectory()) {
				n.fs.readdir(n.path.join(browseDir,path),function(err,files){
					var modelArray = new Array();
					for (var i=0; i<files.length; i++) {
						if (files[i].match(/^\..*/) != null) {
							files.splice(i,1);
							i--;
						}
						else {
							modelArray.push({filename: files[i]});
						}
					}
					var jsonStr = JSON.stringify(modelArray);
					res.writeHead(200,{
						'Content-Type':'application/json'
					});
					//console.log("Listing dir: "+path);
					
					res.write(jsonStr);
					res.end();
				});
			}
			else {
				res.writeHead(500,{'Content-Type':'text/plain'});
				console.log("Invalid dir path: "+path);
				res.write("No such path!");
				res.end();
			}
		});
	//});
};

var serveVideo = function(urlmatch, req, res) {
	var file = n.url.parse(urlmatch[1]);
	file = n.querystring.unescape(file.pathname);
	var filePath = n.path.join(browseDir, file);
	serveFile(filePath, req, res);
};

var serveFile = function(filePath, req, res, opt_attachment) {
	if (!opt_attachment) opt_attachment = false;
	
	//Get the file details
	n.fs.stat(filePath, function(err,stat){
		
		//abort if error
		if (err) {
			console.error("Could not get file stat: "+err);
			res.writeHead(500);
			res.end("FS err");
			return;
		}
		
		//Async we have file details, setup response headers
		var start = 0;
		var partial = false;
		var end = parseInt(stat.size,10)-1;
		var fileType = n.path.extname(filePath).substr(1);
	
		//Setup header
		var header = {
			'Cache-Control': 'public',
			Connection: 'keep-alive',
			'Last-Modified': stat.mtime,
			'Content-Type': mimeTypes[fileType],
			'Content-Disposition': (opt_attachment?'attachment':'inline')+'; filename='+n.path.basename(filePath)
		};
	
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
		var stream = n.fs.createReadStream(filePath,{
			flags: 'r',
			encoding: null,
			fd: null,
			start: start,
			end: end,
			bufferSize:64*1064
		});
		if (stream) {
			//console.log("Starting streaming: "+file+", offset at: "+start+" until: "+end+", length: "+length);
		
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

var getMetadata = function(match, req, res) {
	var file = n.querystring.unescape(match[1]);
	var output;
	var absFile = n.path.join(browseDir,file);
	
	//Check meta cache
	n.fs.exists(n.path.join("meta-cache",n.path.basename(absFile)),function(ext){
		if (ext) {
			serveFile(n.path.join("meta-cache",n.path.basename(absFile)), req, res);
		}
		else {
			extractMetadata(absFile, req, res);
		}
	});
};

var extractMetadata = function(absFile, req, res) {
	n.metadata.getTitle(absFile, function(title){
		output = {title: title};
		
		n.metadata.getDuration(absFile, function(dur){
			output['duration'] = dur;
			
			n.metadata.getAlbum(absFile, function(album){
				
				output['album'] = album;
				
				n.metadata.getTrackNo(absFile, function(track){
					output['track'] = track;
					
					n.metadata.hasCoverArt(absFile,function(cover){
						output['cover'] = cover;
						//Cache the metadata in a file
						var jsonStr = JSON.stringify(output);
						n.fs.writeFile( n.path.join("meta-cache/",n.path.basename(absFile)), jsonStr );
						
						//return the data
						res.writeHead(200, {'Content-Type':'application/json'});
						res.end(jsonStr);
					});
				});
			});
		});
	});
};

var coverart = function(match, req, res) {
	var cacheDir = "cover-cache";
	var file = n.querystring.unescape(match[1]);
	var ext = n.path.extname(file);
	var cachefile = n.path.join(cacheDir,n.path.basename(file,ext))+".png";
	var absFile = n.path.join(browseDir,file);
	n.fs.exists(cachefile, function(exists){
		if (exists) {
			console.log("cover art served from cache");
			serveFile(cachefile, req, res);
		}
		else {
			n.metadata.getCover(absFile, function(success) {
				//check for error
				if (!success) {
					res.writeHead(500,{'Content-Type':'text/plain'});
					res.end("Coverart could be extracted, an error occured.");
					return;
				}
				
				var m = absFile.match(/^(.+)\.[\w\d]+$/);
				n.proc.exec("mv \""+m[1]+".png\" \""+cachefile+"\"",function(err,stdout,stderr){
					//Upon error abort
					if (err!=null) {
						console.log("Cover could not be moved to cache location: "+cachefile);
						res.writeHead(500,{'Content-Type':'text/plain'});
						res.end("Coverart could not be moved to cache location");
						return;
					}
					
					//resize the image
					n.im.resize({
						srcPath: cachefile,
						dstPath: cachefile,
						height: 170
					},function(err,stdout,stderr){
						//Upon error abort
						if (err!=null) {
							console.log("error on resize: "+stdout+stderr);
							res.end();
							return;
						}
						
						//Send resized image to client
						serveFile(cachefile, req, res);
					});
				});
			});
		}
	});
};

var initSession = function(req, res) {
	//look for existing session
	if (req.headers['cookie'] != undefined) {
		var c_array = req.headers['cookie'].split('; ');
		var cookies = {};
		for (var i=0; i<c_array.length; i++) {
			var c = c_array[i].split('=');
			cookies[c[0]] = c[1];
		}
		if (cookies['medici-session'] != undefined && sessions[cookies['medici-session']] != undefined) {
			req.currentSession = sessions[cookies['medici-session']];
			return;
		}
	}
	var url = n.url.parse(req.url, true);
	if (url.query && url.query['medici-session'] && sessions[url.query['medici-session']] != undefined) {
		req.currentSession = sessions[url.query['medici-session']];
		return;
	}
	
	//setup a new session
	var newSesUID = Math.random().toString().substring(2);
	res.setHeader('Set-Cookie','medici-session='+newSesUID);
	sessions[newSesUID] = {'id':newSesUID, 'cnt':1};
	req.currentSession = sessions[newSesUID];
};

var parseDigest = function(req, res) {
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

var logRequest = function(req) {
	var d = new Date();
	var log = d.toUTCString()+" - "+req.method+" "+req.url+" ("+req.headers['user-agent']+")";
	if (req.currentSession && req.currentSession.login)
		log = log + " session: "+req.currentSession.login;
	
	console.log(log);
};

var checkLogin = function(req, res) {
	if (req.currentSession.login != undefined) {
		if (users[req.currentSession.login] != undefined) {
			//console.log("returned user: "+req.currentSession.login);
			return users[req.currentSession.login];
		}
		else {
			req.currentSession.login = undefined;
			console.log("incorrect user in session!");
			return null;
		}
	}
	else if (req.headers['authorization']) {
		if (req.headers['authorization'].indexOf('Digest') != -1) {
			var digest = parseDigest(req,res);
			console.log("Querying user: "+digest.username);
			if (users[digest.username] != undefined) {
				var ha1 = n.crypt.createHash('md5');
				ha1.update(digest.username+":Login:"+users[digest.username]['pass']);
				var ha2 = n.crypt.createHash('md5');
				ha2.update(req.method+":"+digest.uri);
				var resp = n.crypt.createHash('md5');
				resp.update(ha1.digest('hex')+":"+digest.nonce+":"+digest.nc+":"+digest.cnonce+":"+digest.qop+":"+ha2.digest('hex'));
				var servResp = resp.digest('hex');
				if (servResp == digest.response){
					console.log("LOGIN SUCCESS: "+digest.username);
					req.currentSession.login = digest.username;
					return users[digest.username];
				}
				else {
					console.log("LOGIN: wrong credentials!");
					return null;
				}
			}
			else {
				console.log("no such user: "+digest.username);
				return null;
			}
		}
		else if (req.headers['authorization'].indexOf('Basic') != -1)
			console.log("no basic auth support!");
		else
			console.log("auth method not supported!");
	}
	
	return null;
};

var requestListener = function(req, res) {
	var url = n.url.parse(req.url, true);
	res.setHeader('Server','medici_0.2B');
	
	initSession(req,res);
	logRequest(req);
	
	if (checkLogin(req,res) == null) {
		var nonce = req.currentSession.id;
		var opaque = req.currentSession.id+"abcdef";
		res.setHeader("WWW-Authenticate","Digest realm=\"Login\",qop=\"auth,auth-int\",nonce=\""+nonce+"\",opaque=\""+opaque+"\"");
		res.writeHead(401);
		res.end();
		return;
	}
	
	var matched = false;
	for (var route in routes) {
		var match = req.url.match(route);
		if (match != null) {
			routes[route].call(this, match, req, res);
			matched = true;
			break;
		}
	}
	
	if (!matched)
		staticServe(url,req,res);
};

var routes = {
	"^\\/\\?path=(.+)" : scanDir,
	"^\\/video(.+)" : serveVideo,
	"^\\/metadata\\/(.+)" : getMetadata,
	"^\\/get_cover\\/(.+)" : coverart
};

var server = n.http.createServer(requestListener);
server.listen(serverPort);
console.log("Medici server started...");
