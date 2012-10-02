var currentDir = "";
var currentVideoUrl = null;
var activeLi = null;

var createLi = function(filename) {
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

var playFile = function(filename, name) {
	var player = $('#videoPlayer');
	var c_match = document.cookie.match(/(nbrow-session=\d+)/);
	if (currentVideoUrl != '/?video=/'+currentDir+'/'+filename+"?"+c_match[1]) {
		$('#nowPlaying').text(name);
		player.attr('src','/video/'+currentDir+'/'+filename+"?"+c_match[1]);
		currentVideoUrl = '/video/'+currentDir+'/'+filename+"?"+c_match[1];
	}
	$('#player').addClass('active');
	$('#backdrop').addClass('active');
	player[0].play();
};

var hideVideo = function() {
	var player = $('#videoPlayer');
	player[0].pause();
	$('#player').removeClass('active');
	$('#backdrop').removeClass('active');
};

var goBack = function() {
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
	$('#list').empty();
	$.getJSON('/?path=/'+currentDir,function(data){
		parseDir(data);
	});
};

var parseDir = function(data) {
	if (data.length>0) {
		data.sort();
		var list = $('#list').empty();
		for (var i=0;i<data.length; i++) {
			var li = createLi(data[i]);
			list.append(li);
		}
	}	
};

var pathJoin = function(part1, part2) {
	if (part1.match(/\/$/) == null && part2.match(/^\//) == null) {
		return part1+"/"+part2;
	}
	else {
		return part1+part2;
	}
};

var bind = function(func, context, param) {
	return function(){func.call(context, param);};
};

var rootFolder = null;

// $(document).ready(function(evnt){
// 	rootFolder = new Folder();
// 	rootFolder.fetch();
// 	
// 	$('#backBtn').click(goBack);
// 	$('#backdrop').click(hideVideo);
// });