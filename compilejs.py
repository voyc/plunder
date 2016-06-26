#!/usr/bin/python2.4

import httplib, urllib, sys

# Define the parameters for the POST request and encode them in
# a URL-safe format.

url = 'http://plunder.hagstrand.com/'

arr = [
	('code_url', url + 'js/namespace.js'),
	('code_url', url + 'js/plunder.js'),
	('code_url', url + 'js/world.js'),
	('code_url', url + 'js/texture.js'),
	('code_url', url + 'js/hero.js'),
	('code_url', url + 'js/hud.js'),
	('code_url', url + 'js/str.js'),
	('code_url', url + 'fx/asset.js'),
	('code_url', url + 'fx/game.js'),
	('code_url', url + 'fx/keyboard.js'),
	('code_url', url + 'fx/sound.js'),
	('code_url', url + 'fx/effect.js'),
	('code_url', url + 'geo/geo.js'),
	('code_url', url + 'geo/geoiterate.js'),
	('code_url', url + 'geo/orthographicprojection.js'),
	('code_url', url + 'jslib/utils.js'),
	('code_url', url + 'jslib/scriptloader.js'),
	('code_url', url + 'jslib/dispatcher.js'),
	('code_url', url + 'js/onload.js'),
	('compilation_level', 'ADVANCED_OPTIMIZATIONS'),
	('output_format', 'text'),
	('output_info', 'compiled_code'),
]

if (len(sys.argv) > 1):
	arr.append(('formatting', 'pretty_print'))

params = urllib.urlencode(arr)

# Always use the following value for the Content-type header.
headers = { "Content-type": "application/x-www-form-urlencoded" }
conn = httplib.HTTPConnection('closure-compiler.appspot.com')
conn.request('POST', '/compile', params, headers)
response = conn.getresponse()
data = response.read()
print data
conn.close()
