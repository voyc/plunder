# build icon

# compile the js files with google closure compiler
python compilejs.py $1 >html/min.js

# compress css file with yui
cat html/css/plunder.css html/css/hud.css >html/min.css
java -jar ~/bin/yuicompressor/yuicompressor-2.4.2.jar html/min.css -o html/min.css --charset utf-8

# prepare index.php for production use
cp html/index.html html/index.php
sed -i -e 's/<!--<remove>//g' html/index.php
sed -i -e 's/<remove>-->//g' html/index.php
