These tiles were used in the first version of plunder.
ImageMagick convert command.
	36 * 32 = 1152
	24 * 32 =  768
	convert indiabig.png -crop '1152x768+53+69' +repage india.png
	convert -crop 32x32 india.png tiles/tile%d.png

Use GDAL to split a big image into tiles?

24 May 2016
next version of Plunder
Now using maptilejh.php to create tiles.
Probably easier to use ImageMagick convert, except re filenames.

Warning.  
Tile Map Service (TMS), have the y coordinate going from south to north
Google Maps have the y coordinate from north to south.

Original file from Natural Earth Data
	NE2_50m_SR_W.zip
	NE2_50m_SR_W.tif
	size 10800 x 5400

Tiles
	tilesize 300 x 300
	36 columns, 18 rows
	generated by php maptilejh.php
	optimized with optipng.exe on windows

India tiles:
	cols 24-28
	rows 4-8

Image data strategy

The original large image is stored outside the webapps folders at ~/media, and is NOT stored in git.
The generated tiles are ignored from git.
The utilities used to generate, optimize, test and view the tiles are stored in git.
The php tile generator is kept in /phplib and is stored in git.
The local tile utilities are kept in /assets/tiles and are stored in git.

Utilities for generating tiles
	_drawtilegrid.html - display the large image overlaid with tile grid lines
	maptiler.php - cut the large image into tiles
	maptilerjh.php - modified to NOT use discreet zoom levels
	optipng.exe - reduce the size of each tile

Original locations
	tif 
	optipng.exe  optipng is found at http://optipng.sourceforge.net/
	maptiler.php

Project locations
	readme.txt  /assets/tiles  git:YES
	optipng.exe  /assets/tiles  git:NO
	viewtiles.html  /assets/tiles  git:YES
	drawtilegrid.html  /assets/tiles  git:YES
	maptilerjh.php  /phplib  git:YES
	
.gitignore
	*/tiles/*.png
	*/tiles/*.exe

In ~/media/natural_earth_data/zip
	wget original raster file from Natural Earth Data
	unzip 
	copy tif file to ~/media/natural_earth_data/raster/

in ~/webapps/plunder_dev/plunder/phplib
	run php maptilejh.php  
	this file is modified from the original at github 
	input is read from ~/media/natural_earth_data/...
	output is written to ../html/assets/tiles

using filezilla
	download all tile files to local folder
	run optipng on all files
	upload all tile files back again
	optipng is found at http://optipng.sourceforge.net/

to view a subset of the tiled image
	use _xlayout.html

Two local utilities kept in the tiles folder
	_xlayout.html
	optipng.exe
	
Steps to recreate tiles.
1. wget
2. unzip
3. cp

In ~/media/natural_earth_data/zip
1. 	wget original raster file from Natural Earth Data
2. 	unzip 
3.	copy tif file to ~/media/natural_earth_data/raster/

in ~/webapps/plunder_dev/plunder/phplib
4. 	run php maptilejh.php  
	this file is modified from the original at github 
	input is read from ~/media/natural_earth_data/...
	output is written to ../html/assets/tiles

using filezilla
5.	download all tile files to local folder
6.	run optipng on all files
7.	upload all tile files back again
	optipng is found at http://optipng.sourceforge.net/

to view a subset of the tiled image
8.	use _layouttiles.html
9.	to draw a grid on the original image use _drawtilegrid.html 

Two local utilities kept in the tiles folder
	_xlayout.html
	optipng.exe
	
