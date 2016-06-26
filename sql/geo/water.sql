
# lakes
cd /home/jhagstrand/media/data/natural_earth_data/zip
wget http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/physical/ne_50m_lakes.zip

cd ../shp
unzip ../zip/ne_50m_lakes.zip
shp2pgsql -c -W LATIN1 ne_50m_lakes plunder.lakes50 >load.lakes50.sql
psql -d voyc -U jhagstrand <load.lakes50.sql

# oceans
cd /home/jhagstrand/media/data/natural_earth_data/zip
wget http://www.naturalearthdata.com/http//www.naturalearthdata.com/download/50m/physical/ne_50m_ocean.zip

cd ../shp
unzip ../zip/ne_50m_ocean.zip
shp2pgsql -c -W LATIN1 ne_50m_ocean plunder.ocean50 >load.ocean50.sql
psql -d voyc -U jhagstrand <load.ocean50.sql

Natural Earth's Ocean file has only one polygon.

first test for co in land polygon
if not, then test for which ocean
caspian sea can be a rectangle
mediteranean can be a rectangle
arctic and southern oceans are each a circle, or just explicitly test for north of 80

3 oceans: Pacific, Atlantic, Indian
optional: Arctic, Southern
optional: North Pacific, South Pacific, North Atlantic, South Atlantic

some seas require complex shape:
Carribean vs Atlantic

other seas can be representing with rectangle
Caspian
Mediterranean
Bay of Bengal
Arabian Sea

A table on this page includes names of the major seas.
https://en.wikipedia.org/wiki/List_of_political_and_geographic_borders




hit test
feature
land
country
	can we assume every bit of land is a country?
	then if not in a country, not in land, skip the land test
ocean
poli


cd webapps/plunder_dev/plunder/sql/geo/  
 
 

