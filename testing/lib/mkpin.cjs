const c=require("crypto");const D=require("../../node_modules/better-sqlite3-multiple-ciphers");const d=new D(process.argv[2]+"/firearms.db");
const salt=c.randomBytes(16).toString("hex");const hash=c.scryptSync("1234",salt,32).toString("hex");
d.prepare("insert or replace into app_settings(key,value) values ('pin_hash',?)").run(JSON.stringify({salt,hash}));d.close();console.log("ok");
