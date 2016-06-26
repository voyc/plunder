# treasure is not in voyc/plunder but in jhagstrand_voyc/fpd
# psql -t -d jhagstrand_voyc -U jhagstrand_voyc <treasure.sql >../../html/data/treasure.js
select 'voyc.data.treasure = ['
union all (select '{b:' || timebegin || ',e:' || timeend || ',lat:' || round(st_y(the_geom)::numeric,3) || ',lng:' || round(st_x(the_geom)::numeric,3) || ',score:1000,cap:0,id:' || id || ',name:"' || headline || '"},'
from fpd.fpd
where editstatus < 10
and maptype = 2
and datatype in (2,5,6,7,8,10)
and timebegin < 1900
order by timebegin, timeend)
union all select ']';
