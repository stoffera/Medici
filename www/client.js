/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

/**
* Copied from node.js source
*/
var pathJoin = function() {
	var paths = Array.prototype.slice.call(arguments, 0);
	return normalize(paths.filter(function(p, index) {
		return p && typeof p === 'string';
	}).join('/'));
};

/**
* Copied from node.js source
*/
var normalize = function(path) {
	var isAbsolute = path.charAt(0) === '/',
    	trailingSlash = path.substr(-1) === '/';

	// Normalize the path
	path = normalizeArray(path.split('/').filter(function(p) {
		return !!p;
	}), !isAbsolute).join('/');

	if (!path && !isAbsolute) {
		path = '.';
	}
	if (path && trailingSlash) {
		path += '/';
	}

	return (isAbsolute ? '/' : '') + path;
};

/**
* Copied from node.js
*/
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

var bind = function(func, context, param) {
	return function(){func.call(context, param);};
};

var rootFolder = null;
var currentVideoUrl = null;
var currentPlayerModel = null;

var initVideoPlayer = function() {
	var player = $("#videoPlayer");
	player.on("timeupdate", function(evnt){
		if (currentPlayerModel != null) {
			var seen = (player[0].currentTime / player[0].duration) * 100;
			currentPlayerModel.set({
				seen: seen > 98 ? true : false,
				lastPosition: player[0].currentTime
			});
		}
	});
};

var playFile = function(filepath, name, model) {
	var player = $('#videoPlayer');
	currentPlayerModel = model;
	var startPos = currentPlayerModel.get("lastPosition");
	
	//if more than 1 minute has been watched
	var continuePlay = false;
	if (startPos > 60 && !model.get("seen")) {
		 continuePlay = window.confirm("Genoptag afspilningen fra sidst ?");
	}
	
	var c_match = document.cookie.match(/(medici-session=\d+)/);
	if (currentVideoUrl != filepath+"?"+c_match[1]) {
		$('#nowPlaying').text(name);
		player.attr('src',pathJoin('/video/',filepath+"?"+c_match[1]));
		currentVideoUrl = pathJoin('/video/',filepath+"?"+c_match[1]);
	}
	$('#player').addClass('active');
	$('#backdrop').addClass('active');
	player[0].play();
	if (continuePlay) {
		player.one("loadedmetadata",function(){
			player[0].currentTime = startPos-5; //jump last known pos minus 5 secs
		});
		
	}
};

var hideVideo = function() {
	var player = $('#videoPlayer');
	player[0].pause();
	$('#player').removeClass('active');
	$('#backdrop').removeClass('active');
};

// DEPRECATED CODE

var currentDir = "";
var activeLi = null;

var createLi = function(filename) {
	console.error("createLi is deprecated");
	var m = filename.toLowerCase().match(/\.(mp4|m4v|mov)$/);
	var m2 = filename.toLowerCase().match(/\.(avi|flv|mkv)$/);
	var icon = "";
	var name = $('<span>'+filename+'</span>');
	var time = $("<span class='label'></span>");
	if (m && m[1]) {
		icon = "icon-film";
		getMetadata(pathJoin(currentDir,filename), name, time);
	}
	else if (m2 && m2[1]) {
		icon = "icon-lock";
		time = null;
	}
	else {
		icon = "icon-folder-close";
		time = null;
	}
	var a = $("<a href='javascript:void(0);'><i class="+icon+"></i> </a>");
	a.append(name,time);
	a.attr('title',filename);
	a[0].filename = filename;
	a.click(clickHandler);
	var li = $("<li></li>");
	li.append(a);
	return li;
};

var getMetadata = function(file, titleDom, durationDom) {
	console.error("getMetadata is deprecated");
	$.getJSON("/metadata/"+file, function(data){
		if (data['title'] != null) {
			titleDom.empty();
			if (data['album'] != null) {
				titleDom.text(data.album + "-" + data.track + ": " + data.title);
			}
			else
				titleDom.text(data.title);
			
		}
		if (data['duration'] != null) {
			durationDom.text(data['duration']);
		}
		
	});
};

var clickHandler = function(evnt) {
	console.error("clickHandler is deprecated");
	if (activeLi != null)
		activeLi.removeClass('active');
	var link = evnt.currentTarget;
	
	var m = link.filename.toLowerCase().match(/\.(mp4|m4v|mov)$/);
	var m2 = link.filename.toLowerCase().match(/\.(avi|flv|mkv)$/);
	
	if (m && m[1]) {
		
		activeLi = $(link.parentNode).addClass('active');
		var name = $(link.children[1]).text();
		
		playFile(link.filename,name);
	}
	else if (m2 && m2[1]) {
		window.alert("Video format is not HTML5 compatible. It can not be played!");
	}
	else {
		currentDir = pathJoin(currentDir, link.filename);
		console.log(currentDir);
		fetchCurDir();
	}
};

var goBack = function() {
	console.error("goBack is deprecated");
	if (currentDir == '')
		return;
	
	var dirs = currentDir.split('/');
	if (dirs.length>0) {
		dirs.splice(dirs.length-1,1);
		currentDir = dirs.join('/');
		fetchCurDir();
	}
};

var fetchCurDir = function() {
	console.error("fetchCurDir is deprecated");
	$('#list').empty();
	$.getJSON('/?path=/'+currentDir,function(data){
		parseDir(data);
	});
};

var parseDir = function(data) {
	console.error("parseDir is deprecated");
	if (data.length>0) {
		data.sort();
		var list = $('#list').empty();
		for (var i=0;i<data.length; i++) {
			var li = createLi(data[i]);
			list.append(li);
		}
	}	
};