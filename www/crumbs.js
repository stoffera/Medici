/**
* Medici
* Copyright (c) 2012 Kristoffer Andersen
* All right reserved
*/

crumbManager = function(crumbsListEl) {
	this.crumbEl = crumbsListEl;
};

crumbManager.prototype.crumbEl = null;
crumbManager.prototype.crumbList = null;

crumbManager.prototype.parseList = function() {
	
};


crumb = function(opt_element) {
	if (opt_element)
	this.element = opt_element;
};

crumb.prototype.element = null;
crumb.prototype.url = null;
crumb.prototype.name = null;

