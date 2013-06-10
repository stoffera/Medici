Medici
======

###HTML5 Media Library Browser and video player
Browse you collection of videos through  nice HTML5 interface. View cover art and metadata extracted from the media files.
This application will run a node.js server to serve a WebApp where you can browse your media files.

At this moment only video files in MP4 container format can be played, as these are the supported format by the HTML video standard.

Features
========
* HTTP Hashed Authentication
  * Protect your media with user credentials. 
  * The data is not encrypted but sent in clear text. Credentials are hashed though.
* Cover art and meta data is extracted from the MP4 video files
* Playback on iPhone, iPad etc. With support for AppleTV via AirPlay
* Navigate through sub-folders with additional content
* Intelligent sorting of television shows and films.

Requirements
============
The following applications and libraries are required:

* [node.js](http://nodejs.org), Aptitude: `apt-get install node`
* MP4Box, Aptitude: `apt-get install gpac`
* ImageMagick, Aptitude: `apt-get install imagemagick`
* ImageMagick for node.js, NPM: `npm install imagemagick`

#### Ubuntu or likewise
Use Aptitude (`apt-get`) to install all the dependencies: node, npm, MP4Box and imagemagick.

####Mac OS X
To run Medici on Mac OS X you will need to obtain MP4Box and imageMagick from package managers like [Homebrew](http://mxcl.github.com/homebrew/) or [Ports](http://www.macports.org). Or you download the source code and compile the app yourself.

#### Windows
Honesty I don't know to run node and install the dependencies. I guess Windows is not supported...

Installing
==========
When the medici files are located in a folder (eg. `medici`), open the file node.js file `server.js`:

1. Edit the variable `serverPort` to change the listening port. Default is 8080.
2. Edit the variable `browseDir` to the path of the directory where your media files are located
3. Edit the dictionary object `users` to add allowed users. Passwords are stored in clear text (subject to change in future versions)

Save the changes and run `node server.js` from you terminal.

Supported Browsers
==================
Browsers that can playback MP4 files (either h.264, MPEG4 or likewise) are supported. Medici is only tested on WebKit browsers (Safari & Chrome).  
In theory these browsers should work:
* Safari
* Chrome
* Opera
* Internet Explorer 9 and 10

Run as daemon
=============
Should you get tired of running the node server process in the terminal or in a screen, you can easily install it as a daemon. The newest Ubuntu include the new [Upstart](http://upstart.ubuntu.com) daemon initialization system. Here it is fairly easy to run a script as a daemon.

Create a new file `medici.conf` in `/etc/init` and paste this text into it:

	description "node.js Medici server"
	author      "Kristoffer Andersen - http://github.com/stoffera"
 
	# used to be: start on startup
	# until we found some mounts weren't ready yet while booting:
	start on started mountall
	stop on shutdown
 
	# Automatically Respawn:
	respawn
	respawn limit 99 5
 
	script
	    chdir /home/www/medici
	    exec /usr/bin/node /home/www/medici/server.js >> /var/log/medici.log 2>&1
	end script
 
	post-start script
	   # Optionally put a script here that will notifiy you node has (re)started
	   # /root/bin/hoptoad.sh "node.js has started!"
	end script

Now you can start and stop the daemon with `sudo service medici start` and `sudo service medici stop`.

--------
Medici  
Copyright (c) 2012 Kristoffer Andersen
