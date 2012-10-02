var VideoModel = Backbone.Model.extend({
	videoRegexp : new RegExp("\\.(mp4|m4v|mov)$"),
	invalidRegexp : new RegExp("\\.(avi|flv|mkv)$"),
	iconName : "icon-film",
	
	initialize : function() {
		//Check if video format is OK
		var fn = this.get('filename');
		var m1 = fn.toLowerCase().match(this.videoRegexp);
		var m2 = fn.toLowerCase().match(this.invalidRegexp);
		
		if (m1 && m1[1]) {
			//Video is OK, fetch extended info
			this.loadMetadata();
		}
		else if (m2 && m2[1]) {
			//Video is not OK
			console.log(this.get("filename")+" is not a valid HTML5 video!");
		}
		else {
			console.error(this.get("filename")+" is an unknown type!");
		}
	},
	
	loadMetadata : function() {
		var cntxt = this;
		var path = this.get('path');
		$.getJSON("/metadata"+path+"/"+this.get("filename"),function(data){
			cntxt.set(data);
		});
	},
	
	hasCoverArt: function() {
		return this.get('cover');
	},
	
	getCoverArtUrl : function() {
		if (!this.hasCoverArt) return null;
		return "/get_cover"+this.get('path')+'/'+this.get('filename');
	}
});

// var FolderModel = ParentModel.extend({
// 	collection: null,
// 	name: null,
// 	initialize: function() {
// 		console.log("init folder model: "+this.get('filename'));
// 		this.name = this.get('filename');
// 	},
// 	fetch : function() {
// 		if (this.collection == null) {
// 			this.collection = new Folder();
// 		}
// 	}
// });

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
				
				Backbone.Collection.prototype.add.call(this, new VideoModel(objects[o]));
			}
			else {
				var folder = new Folder();
				folder.url = this.url + objects[o].filename;
				folder.folderName = objects[o].filename;
				folder.parentFolder = this;
				this.subFolders.push(folder);
			}
		}
	},
	
	getPath: function() {
		var path = "";
		var node = this;
		while (node != null) {
			path = "/"+node.folderName + path;
			node = node.parentFolder;
		}
		return path;
	}
});