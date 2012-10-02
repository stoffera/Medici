Medici 0.2 BETA
======

HTML5 Media Browser
This application will run a node.js server to serve a WebApp where you can browse your media files.

At this moment only video files in MP4 container can be played, as these are supported by the HTML h.264 standard.

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

Installing
==========
When the medici files are located in a folder (eg. `medici`), open the file node.js file `server.js`:

1. Edit the variable `serverPort` to change the listening port. Default is 8080.
2. Edit the variable `browseDir` to the path of the directory where your media files are located
3. Edit the dictionary object `users` to add allowed users. Passwords are stored in clear text (subject to change in future versions)

Save the changes and run `node server.js` from you terminal.