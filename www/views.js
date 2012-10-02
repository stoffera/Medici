/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

/**
* Thumb list / grid views
* Manages the list of thumbnails
*/
var ThumbListView = Backbone.View.extend({
	tagName: 'ul',
	className: 'thumbnails',
	
	initialize: function() {
		this.model.on('add remove',this.render,this);
	},
	
	render: function() {
		//console.log("view render");
		this.$el.empty();
		
		if (!this.model.isLoaded) {
			this.renderSpinner();
			return this.$el;
		}
		
		this.model.sort();
		var model;
		var row = $('<div></div>').addClass('row-fluid');
		for (var m=0; m<this.model.length; m++) {
			model = this.model.at(m);
			if (!model.attachedThumbView) {
				model.attachedThumbView = new ThumbView({model: model});
			}
			
			if (m > 0 && m % 4 == 0) {
				this.$el.append(row);
				row = $('<div></div>').addClass('row-fluid');
			}
			
			row.append(model.attachedThumbView.el);
		}
		//Apped any remaining row
		if (this.model.length-1 % 4 != 0) this.$el.append(row);
		
		return this.$el;
	},
	
	renderSpinner : function() {
		var spin = new Image();
		spin.src = "img/spinner_large.gif";
		$(spin).addClass('spinner');
		this.$el.append(spin);
	},
	
	setModel : function(model) {
		this.model.off('add remove',this.render,this);
		this.model = model;
		this.model.on('add remove',this.render,this);
		this.render();
	}
});

/**
* Single Thumb view
* A single thumbnail related to a video
*/
var ThumbView = Backbone.View.extend({
	tagName: 'li',
	className: 'span3',
	
	initialize: function() {
		this.model.on('change',this.render,this);
	},
	
	render: function() {
		//console.log("Render "+this.model.get('filename'));
		this.$el.empty();
		var link = $('<a></a>').attr({href:'javascript:void(0)', title: this.model.get('title')+"\n"+this.model.get('filename')});
		var div = $('<div></div>');
		div.addClass('thumbnail');
		
		if (this.model.hasCoverArt()) {
			var img = new Image();
			img.src = this.model.getCoverArtUrl();
			//img.height = 180;
			$(img).addClass('cover');
			div.append(img);
		}
		else {
			var noimg = $('<div></div>').addClass('nocover');
			div.append(noimg);
		}
		
		if (this.model.get('album') == null) this.renderFilm(div);
		else this.renderSeries(div);
		
		link.append(div);
		this.$el.append(link);
		
		var self = this;
		div.click(function(evnt){self.play();});
		
		return this.$el;
	},
	
	renderSeries : function(container) {
		var title = $('<p></p>').text(this.model.get('title'));
		var series = $('<small></small>').text(this.model.get('album'));
		if (this.model.get('track')){
			var track = $('<span></span>').addClass('badge badge-info').text(this.model.get('track'));
			title.empty();
			title.append(track);
			title.append(" "+this.model.get('title'));
		}
		var dur = $('<small></small>').addClass('label').text(this.model.get('duration'));
		container.append(series,title,dur);
	},
	
	renderFilm : function(container) {
		var title = this.model.get('title');
		if (title == null) title = this.model.get('filename');
		
		var header = $('<p></p>').text(title);
		container.append(header);
		
		var dur = this.model.get('duration');
		if (dur != null) {
			var durationEl = $('<small class="label"></small>').text(dur);
			container.append(durationEl);
		}

	},
	
	play: function() {
		var link = this.model.get('path')+'/'+this.model.get("filename");
		if (!link) {
			console.error("no video link!");
			return;
		}
		var title = this.model.get("title");
		if (title) playFile(link, title);
		else playFile(link,link);
	}
	
});

/**
* Folder List menu view
* Manages the folders present at the active location
* Also does the loading of view folders by changing the models of the
* thumb list view.
* Breadcrumbs are also managed from this class
*/
var FolderListView = Backbone.View.extend({
	tagName: 'ul',
	dirStack: null,
	thumbs: null,
	
	initialize: function() {
		this.dirStack = new Array();
		this.dirStack.push(this.model);
		
		this.model.on('add', this.render, this);
	},
	
	render: function() {
		this.$el.empty();
		this.$el.append($("<li></li>").addClass("list-header").text("Folders"));
		
		for (var f in this.model.subFolders) {
			var link = $("<a></a>").attr('href','javascript:void(0);').text(this.model.subFolders[f].folderName);
			link.click( bind(this.openFolder,this,this.model.subFolders[f]) );
			var li = $("<li></li>").append(link);
			this.$el.append(li);
		}
		
		this.renderCrumbs();
		
		return this.$el;
	},
	
	openFolder : function(folder) {
		if (folder.length == 0) {
			console.log("Fetching folder content from server ("+folder.folderName+")...");
			folder.fetch();
		}
		this.dirStack.push(folder);
		this.model.off('add', this.render);
		this.model = folder;
		this.model.on('add',this.render,this);
		if (this.thumbs) this.thumbs.setModel(folder);
		this.render();
	},
	
	goBack: function() {
		if (this.dirStack.length > 1) {
			this.dirStack.pop();
			var cur = this.dirStack[this.dirStack.length-1];
			this.model.off('add',this.render);
			this.model = cur;
			this.model.on('add',this.render, this);
			if (this.thumbs) this.thumbs.setModel(cur);
			this.render();
		}
	},
	
	getDirPath: function() {
		var path = "";
		for (var f=this.dirStack.length; f>=0; f--) {
			path += this.dirStack[f].folderName;
		}
		return path;
	},
	
	renderCrumbs: function() {
		var bc = $('#breadcrumbs');
		if (!bc) return;
		
		bc.empty();
		for (var f in this.dirStack) {
			var li = $('<li></li>');
			var name = this.dirStack[f].folderName == '' ? "Film" : this.dirStack[f].folderName;
			if (f == this.dirStack.length-1) {
				li.text(name+" ");
			}
			else {
				var link = $('<a></a>').attr('href',"javascript:void(0);").text(name+" ");
				link.click( bind(this.goBack, this) );
				li.append(link);
			}
			li.append($("<span></span>").addClass('divider').text("/"));
			bc.append(li);
		}
	}
});