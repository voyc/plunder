
#1:50m 460 rivers, scalerank 1 thru 6, 42 rows in our target geo
wget http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/physical/ne_50m_rivers_lake_centerlines.zip
unzip 
shp2pgsql -c -W LATIN1 ne_50m_rivers_lake_centerlines plunder.rivers50 >load.rivers50.sql
psql -d voyc -U jhagstrand <load.rivers50.sql

# all rivers combined, almost 1 MB
psql -t -d voyc -U jhagstrand <rivers.sql >../json/rivers.js

# rivers broken out into six sets by scalerank
psql -t -d voyc -U jhagstrand <river1.sql >../../html/data/river1.js
psql -t -d voyc -U jhagstrand <river2.sql >../../html/data/river2.js
psql -t -d voyc -U jhagstrand <river3.sql >../../html/data/river3.js
psql -t -d voyc -U jhagstrand <river4.sql >../../html/data/river4.js
psql -t -d voyc -U jhagstrand <river5.sql >../../html/data/river5.js
psql -t -d voyc -U jhagstrand <river6.sql >../../html/data/river6.js
