/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

/** Server listen port */
var serverPort = 8080;

/** Media Directory to serve: */
var browseDir = "/home/public/Film";

/** Static files dir */
var staticFiles = "www";

/** List of allowed users */
var users = {
	'admin' : {'hash': '3ed8dc676aa48a46bc0b1a31c4a045c3'},
	'stoffer' : {'hash': '3f17e0e8c3939da8529695838963bab6'}
};

var m = {};
m.duality = require('./duality');
m.fs = require('fs');
m.url = require('url');
m.path = require('path');
m.proc = require("child_process");
m.querystring = require('querystring');
m.metadata = require('./metadata');
m.im = require('imagemagick');

var getMetadata = function(match, req, res) {
	var file = m.querystring.unescape(match[1]);
	var output;
	var absFile = m.path.join(browseDir,file);
	
	//Check meta cache
	m.fs.exists(m.path.join("meta-cache",m.path.basename(absFile)),function(ext){
		if (ext) {
			res.setHeader('Content-Type','application/json');
			server.serveFile(m.path.join("meta-cache",m.path.basename(absFile)), req, res, true);
		}
		else {
			extractMetadata(absFile, req, res);
		}
	});
};

var extractMetadata = function(absFile, req, res) {
	m.metadata.getTitle(absFile, function(title){
		output = {title: title};
		
		m.metadata.getDuration(absFile, function(dur){
			output['duration'] = dur;
			
			m.metadata.getAlbum(absFile, function(album){
				
				output['album'] = album;
				if (album) {
					var sm = album.match(/Season (\d+)$/);
					output['type'] = "tvshow";
					if (sm) 
						output['season'] = parseInt(sm[1],10);
				}
				else
					output['type'] = "movie";
				
				m.metadata.getTrackNo(absFile, function(track){
					output['track'] = track;
					
					m.metadata.hasCoverArt(absFile,function(cover){
						output['cover'] = cover;
						//Cache the metadata in a file
						var jsonStr = JSON.stringify(output);
						var cacheFile =  m.path.join("meta-cache/",m.path.basename(absFile));
						m.fs.writeFile( cacheFile, jsonStr , function(err){
							if (err) {
								console.error("Could bot create metadata cache file: "+cacheFile+": "+err);
							}
						});
						
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
	var file = m.querystring.unescape(match[1]);
	var ext = m.path.extname(file);
	var cachefile = m.path.join(cacheDir,m.path.basename(file,ext))+".png";
	var absFile = m.path.join(browseDir,file);
	m.fs.exists(cachefile, function(exists){
		if (exists) {
			server.serveFile(cachefile, req, res);
		}
		else {
			m.metadata.getCover(absFile, function(success) {
				//check for error
				if (!success) {
					res.writeHead(500,{'Content-Type':'text/plain'});
					res.end("Coverart could be extracted, an error occured.");
					return;
				}
				
				var match = absFile.match(/^(.+)\.[\w\d]+$/);
				m.proc.exec("mv \""+match[1]+".png\" \""+cachefile+"\"",function(err,stdout,stderr){
					//Upon error abort
					if (err!=null) {
						console.log("Cover could not be moved to cache location: "+cachefile);
						res.writeHead(500,{'Content-Type':'text/plain'});
						res.end("Coverart could not be moved to cache location");
						return;
					}
					
					//resize the image
					m.im.resize({
						srcPath: cachefile,
						dstPath: cachefile,
						height: 170
					},function(err,stdout,stderr){
						//Upon error abort
						if (err!=null) {
							console.log("error on resize: "+stdout+stderr);
							res.writeHead(500,{'Content-Type':'text/plain'});
							res.end();
							return;
						}
						
						//Send resized image to client
						server.serveFile(cachefile, req, res);
					});
				});
			});
		}
	});
};

var serveVideo = function(urlmatch, req, res) {
	var file = m.url.parse(urlmatch[1]);
	file = m.querystring.unescape(file.pathname);
	var filePath = m.path.join(browseDir, file);
	server.serveFile(filePath, req, res);
};

var scanDir = function(match, req, res) {
	var path = m.querystring.unescape(match[1]);
	m.fs.stat(m.path.join(browseDir,path),function(err,stats){
		if (stats && stats.isDirectory()) {
			m.fs.readdir(m.path.join(browseDir,path),function(err,files){
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
};

var checkAccess = function(session, req, res) {
	if (session.login && session.login == true) {
		session.cnt++;
		return true;
	}
	else 
		return false;
};

var httpAuth = function(username, req, res) {
	if (!users[username]) return null;
	return users[username]['hash'];
};

var httpLoginSuccess = function(username, req, res) {
	req.currentSession.login = true;
};

var routes = {
	"^\\/\\?path=(.+)" : scanDir,
	"^\\/video(.+)" : serveVideo,
	"^\\/metadata\\/(.+)" : getMetadata,
	"^\\/get_cover\\/(.+)" : coverart
};

var server = m.duality.createServer(staticFiles,routes,{
	serverString: "medici",
	sessionIdentifier: "medici-session",
	serverPort: serverPort,
	useAccessControl: true,
	accessResourceCallback: checkAccess,
	httpAuthUserLookupCallback: httpAuth,
	httpAuthLoginSuccessCallback: httpLoginSuccess
});
