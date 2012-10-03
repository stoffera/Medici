/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

/**
* Model representation of a single video
* Control fetching of metadata and cover art path
*/
var VideoModel = Backbone.Model.extend({
	videoRegexp : new RegExp("\\.(mp4|m4v|mov)$"),
	invalidRegexp : new RegExp("\\.(avi|flv|mkv)$"),
	iconName : "icon-film",
	isValid: null,
	
	initialize : function() {
		//Check if video format is OK
		var fn = this.get('filename');
		var m1 = fn.toLowerCase().match(this.videoRegexp);
		var m2 = fn.toLowerCase().match(this.invalidRegexp);
		
		if (m1 && m1[1]) {
			//Video is OK, fetch extended info
			this.isValid = true;
			this.loadMetadata();
		}
		else if (m2 && m2[1]) {
			//Video is not OK
			console.log(this.get("filename")+" is not a valid HTML5 video!");
			this.isValid = false;
		}
		else {
			console.error(this.get("filename")+" is an unknown type!");
			this.isValid = false;
		}
	},
	
	loadMetadata : function() {
		var cntxt = this;
		var path = this.get('path');
		$.getJSON(pathJoin("/metadata",path,this.get("filename")),function(data){
			cntxt.set(data);
		});
	},
	
	hasCoverArt: function() {
		return this.get('cover');
	},
	
	getCoverArtUrl : function() {
		if (!this.hasCoverArt) return null;
		return pathJoin("/get_cover",this.get('path'),this.get('filename'));
	}
});

/**
* Representation of a folder
* Contains models fo each video. Including refernces to sub-folders
*/
var Folder = Backbone.Collection.extend({
	model: VideoModel,
	url: "/?path=/",
	subFolders: null,
	folderName: null,
	parentFolder: null,
	isLoaded: null,
	
	comparator: function(video1, video2) {
		var t1 = video1.get('album') ? video1.get('album') : "";
		t1 += video1.get('album') && video1.get('track') ? video1.get('track') : "";
		t1 += video1.get('title') ? video1.get('title') : video1.get('filename');
		t1 = t1.toLowerCase();
		
		var t2 = video2.get('album') ? video2.get('album') : "";
		t2 += video2.get('album') && video2.get('track') ? video2.get('track') : "";
		t2 += video2.get('title') ? video2.get('title') : video2.get('filename');
		t2 = t2.toLowerCase();
		
		if (t1 < t2) return -1;
		else if (t1 > t2) return 1;
		else return 0;
	},
	
	initialize: function() {
		this.folderName = '';
		this.subFolders = new Array();
		this.isLoaded = false;
		
	},
	
	add : function(objects) {
		for (var o in objects) {
			if (objects[o].filename.toLowerCase().match(/\.(avi|flv|m4v|mov|mp4|mkv)$/)) {
				objects[o].path = this.getPath();
				
				//This collection has data ready
				this.isLoaded = true;
				var newModel = new VideoModel(objects[o]);
				
				//skip if model is not a valid video file
				if (!newModel.isValid) continue;
				Backbone.Collection.prototype.add.call(this, newModel,{silent:true});
			}
			else {
				var folder = new Folder();
				folder.url = this.url + objects[o].filename;
				folder.folderName = objects[o].filename;
				folder.parentFolder = this;
				this.subFolders.push(folder);
			}
		}
		this.trigger('add');
	},
	
	getPath: function() {
		var path = "";
		var node = this;
		while (node != null) {
			path = pathJoin("/",node.folderName,path);
			node = node.parentFolder;
		}
		return path;
	}
});