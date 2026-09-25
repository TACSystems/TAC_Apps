const D=require("../../node_modules/better-sqlite3-multiple-ciphers");const d=new D(process.argv[2]+"/firearms.db",{readonly:true});
const t=d.prepare("select name from sqlite_master where type='table' and name not in ('schema_migrations','app_settings') order by name").all().map(r=>r.name);
const o={}; for (const n of t) o[n]=d.prepare(`select count(*) c from "${n}"`).get().c;
o.shots=d.prepare("select sum(shots_fired) s from firearms").get().s;
o.onhand=JSON.stringify(d.prepare("select caliber,on_hand from ammo_on_hand order by caliber").all());
o.mig=t.includes("schema_migrations")?"-":(()=>{try{return d.prepare("select group_concat(id) g from schema_migrations").get().g}catch{return "none"}})();
console.log(JSON.stringify(o));
