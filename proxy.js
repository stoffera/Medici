/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*
* This file contains a server redirect proxy.
* It can route incomming HTTP Requests on one listening port
* to several other ports. This allows you to run a node.js server on port 8080
* and a lighttpd server on 88. This proxy will listen on port 80, and route
* requests to either based on the HOST request header. (like virtual hosts).
* Should you choose to use this application, then change this host name in
* line 22.
*/


var n = {
	http : require('http')
};

var server = n.http.createServer(function(req, res){
	var pReq = null;
	if (req.headers.host == 'subdomain.yourhost.com') {
		pReq = n.http.request({
			host: 'localhost',
			port: 8080,
			method: req.method,
			path: req.url,
			headers: req.headers
		},function(pRes){
			res.writeHead(pRes.statusCode, pRes.headers);
			pRes.pipe(res);
		});
	}
	else {
		pReq = n.http.request({
			host: 'localhost',
			port: 88,
			method: req.method,
			path: req.url,
			headers: req.headers
		},function(pRes){
			res.writeHead(pRes.statusCode, pRes.headers);
			pRes.pipe(res);
		});
	}
	var d = new Date();
	console.log(d.toString()+" proxy: "+req.method+" "+req.headers.host+req.url+" ("+req.headers['user-agent']+")");
	req.on ('close',function(){
		pReq.abort();
	});
	
	pReq.on('close',function(){req.abort();});
	req.pipe(pReq);
});
server.listen(80);
console.log("Proxy started...");
