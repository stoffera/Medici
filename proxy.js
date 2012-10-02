var n = {
	http : require('http')
};

var server = n.http.createServer(function(req, res){
	var pReq = null;
	if (req.headers.host == 'video.trik.dk') {
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
