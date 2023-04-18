"use strict";
var fs = require('fs');
var conf = JSON.parse(fs.readFileSync("lib/conf.json"));
var site = JSON.parse(fs.readFileSync("lib/site.json"));
// var paystack = JSON.parse(fs.readFileSync("lib/paystack.json"));
var express = require("express");
var mysql = require('mysql'); 
var request = require('request');
var crypto = require('crypto');
var app = express();
var refgen = require("./lib/refgen.js");
var bodyParser = require('body-parser');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
var siofu  = require('socketio-file-upload'); 
var admin = require('firebase-admin');
var serviceAccount = require('./serviceAccount.json');
// var nodemailer = require('nodemailer');
var buckName = 'Edited out';
var pdfDocument = require('pdfkit');
var logdir = "serverlog";
var axios = require("axios");
admin.initializeApp({
	credential: admin.credential.cert(serviceAccount)
});


process.on('uncaughtException', function(err) {
	logging("UNCAUGHT EXPRESSION: " + err);
    console.log('Caught exception: ' + err);
  });
  
  if(site.mode == "prod"){
      site.addr = "" + site.prod.addr;
      var bucket = admin.storage().bucket(buckName);
  }
  else{
      site.addr = "" + site.dev.addr;
  }

  

function auth_socket(tok,fn){
	if(tok == site.socketToken){
		fn(200);
	}
	else{
		fn(400);
	}
}

function isArray(x) {
    return x.constructor.toString().indexOf("Array") > -1;
}

function upload(filename,fn){
	if(site.mode == "prod"){
		bucket.upload("./public/uploads/"+filename,{destination:filename,uploadType:"media"}).then(function(dat){
			var file = dat[0];
			var pathi = "https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+file.name.replace(/[\/]/g,"%2F") + "?alt=media";
			fn({succ:1,message:pathi});
		}).catch(function(error){
			fn({err:1,message:error});
		});
	}
	else{
		fn({succ:1,message:'/uploads/'+filename});
	}
}

function uploadx(filename){
	return new Promise(function(resolve,reject){
		if(site.mode == "prod"){
			bucket.upload("./public/uploads/"+filename,{destination:filename,uploadType:"media"}).then(function(dat){
				var file = dat[0];
				var pathi = "https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+file.name.replace(/[\/]/g,"%2F") + "?alt=media";
				resolve(pathi);
			}).catch(function(error){
				resolve('failed');
			});
		}
		else{
			resolve('/uploads/'+filename);
		}
	});
}

function devErr(err){
	if(site.mode == "dev"){
		console.log(err);
		return 0;
	}
	else{
		logging(err);
		return 0;
	}
}


function deleteF(path){
	if(site.mode == "prod"){
		if(path.includes("https")){
			var pre = "https://firebasestorage.googleapis.com/v0/b/";
			var fil = path.replace(pre,"");
			var file = fil.replace(/%2F/g,"/").replace("?alt=media","");
			bucket.file(file).delete().then(function(succ){
				//	console.log("deletion successful");
			}).catch(function(err){
				//	console.log("deletion failed");
			});
		}
		else{
			return false;
		}
	}
	else{
		fs.unlink("./public"+path);
		return true;
	}
}

if(site.mode == "prod"){
	var con = mysql.createPool({
		host: site.prod.sql.host,
		user: site.prod.sql.user,
		password:site.prod.sql.pass,
		database:site.prod.sql.db,
		multipleStatements:true
	});
}
else{
	var con = mysql.createPool({
  		host: site.dev.sql.host,
 		user: site.dev.sql.user,
 		password:site.dev.sql.pass,
  		database:site.dev.sql.db,
  		multipleStatements:true
	});
}
con.on('error', function(err) {
	//to override exceptions caused by mysql
	if(site.mode == "dev"){
		console.log("mysql err => " + err);
		logging(err);
	}
});

var cOpts = {
	maxAge:5184000000,
	httpOnly:true,
	signed:true
};

function sortlyric(lyr,fn){
	if(lyr == ""){
		fn("",false);
	}
	else{
		var x = "";
		fs.readFile("./public/uploads/"+lyr,'utf8',function(err,data){
			if(err){
				devErr(err);
				fn("",true);
			}
			else{
				x = x + data;
				fn(x,false);
			}
		});
	}
}

function sortpreview(pre,fn){
	if(pre == ""){
		fn("",false);
	}
	else{
		upload(pre,function(data){
			if(data.err){
				devErrr(data.message);
				fn("",true);
			}
			else{
				fn(data.message,false);
			}
		});
	}
}

app.use(siofu.router);

app.disable('x-powered-by');

var socks = [];

io.use(function(socket, next){
    if (socket.handshake.query && socket.handshake.query.token){
      auth_socket(socket.handshake.query.token, function(status) {
        if(status !== 200) return next(new Error('Authentication error'));
        next();
      });
    } else {
        next(new Error('Authentication error'));
    }    
  }).on("connection", function (socket){
	  socks.push(socket);
      //console.log("socket connected on with id: " +socket.id);
      //siofu config
      var uploader = new siofu();
      uploader.dir = "public/uploads";
      uploader.maxFileSize = 1024 * 1000 * 100;
      uploader.listen(socket);
      uploader.on("start", function(event){
      
      });
      uploader.on("error", function(event){
          //console.log("Error from uploader", event);
      });
      uploader.on("saved", function(event){
          //console.log(event.file);
      });
      
      //socket routes
	  io.emit("admin");
	  
	
      //upload progress
      socket.on("siofu_progress",function(data){
          this.emit("upload_progress",data);
	  });

	  socket.on("disconnect",function(){
		socks.splice(socks.indexOf(socket),1);
		io.emit("admin");
	  });
	  
	  socket.on("load_admin",function(data,fn){
		  var obj = {};
		  if(data.username){
			  obj.today = 0;
			  obj.month = 0;
			  obj.visits = 0;
			  obj.sockets = 0;
			  obj.songlen = 0;
			  obj.linklen = 0;
			  obj.emaillen = 0;
			  obj.songs = [];
			  obj.stores = [];
			  obj.socials = [];
			  var d = new Date();
			var dd = d.getDate();
			var mm = d.getMonth() + 1;
			var yyyy = d.getFullYear();
			  var sql = "SELECT COUNT(id) FROM visits WHERE dd="+esc(dd)+" AND mm="+esc(mm)+" AND yyyy="+esc(yyyy)+";"+
			"SELECT COUNT(id) FROM visits WHERE mm="+esc(mm)+" AND yyyy="+esc(yyyy)+";"+
			"SELECT COUNT(id) FROM visits;"+
			"SELECT COUNT(id) FROM songs;"+
			"SELECT COUNT(id) FROM links;"+
			"SELECT COUNT(id) FROM newsletters;"+
			"SELECT * FROM songs ORDER BY title ASC;"+
			"SELECT * FROM stores ORDER BY name ASC;"+
			"SELECT * FROM socials ORDER BY name ASC;";
			con.query(sql,function(err,result){
				if(err){
					devErr(err);
					fn(obj);
				}
				else{
					obj.today = result[0][0]['COUNT(id)'];;
					obj.month = result[1][0]['COUNT(id)'];;
					obj.visits = result[2][0]['COUNT(id)'];;
					obj.sockets = socks.length;;
					obj.songlen = result[3][0]['COUNT(id)'];;
					obj.linklen = result[4][0]['COUNT(id)'];;
					obj.emaillen = result[5][0]['COUNT(id)'];;
					obj.songs = result[6];
					obj.stores= result[7];
					obj.socials = result[8];
					obj.processed = 1;
					obj.timex = Date.now();
					fn(obj);
				}
			});
		  }
		  else{
			  fn(obj);
		  }
	  });

	socket.on("add_email",function(em,fn){
		var r=/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+\/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
		if(r.test(em)){
			var sql = "SELECT * FROM newsletters WHERE email="+esc(em)+";";
			con.query(sql,function(err,result){
				if(err){
					devErr(err);
					fn({err:1});
				}
				else{
					if(result.length != 0){
						fn({succ:1});
					}
					else{
						var sql = "INSERT INTO newsletters(email,status) "+
						"VALUES("+esc(em)+",'valid');";
						con.query(sql,function(err,result){
							if(err){
								devErr(err);
								fn({err:1});
							}
							else{
								io.emit("admin");
								fn({succ:1});
							}
						});
					}
				}
			});
		}
		else{
			fn({err:1});
		}
	});

	socket.on("add_store",function(st,fn){
		var sql = "INSERT INTO stores(name,keyword) "+
		"VALUES("+esc(st.name)+","+esc(st.key)+")";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_store",function(id,fn){
		var sql = "DELETE FROM stores WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});


	socket.on("add_project_98654wtedfcvybui7y6",function(data,fn){
		sortlyric(data.lyr,function(ly,ex){
			if(ex){
				fn({err:1,message:'Lyrics could not be read!'});
			}
			else{
				data.lyr = ly;
				sortpreview(data.pre,function(pr,ex){
					if(ex){
						fn({err:1,message:'Error uploading preview to cloud!'});
					}
					else{
						data.pre = pr;
						upload(data.cov,function(dat){
							if(dat.err){
								fn({err:1,message:'COVER ART ERROR: '+dat.message});
							}
							else{
								data.cov = dat.message;
								var sql = "INSERT INTO songs(status,title,main_art,features,upc,isrc,release_date,preview,cover_art,genres,tags,lyrics) "+
								"VALUES("+esc(data.sta)+","+esc(data.tit)+","+esc(data.mar)+","+esc(data.fea)+","+esc(data.upc)+","+esc(data.isr)+","+esc(data.rdt)+","+esc(data.pre)+","+esc(data.cov)+","+esc(data.gen)+","+esc(data.tag)+","+esc(data.lyr)+");";
								con.query(sql,function(err,result){
									if(err){
										devErr(err);
										fn({err:1,message:'Mysql error occurrred'});
									}
									else{
										fn({succ:1});
									}
								});
							}
						});
					}
				});
			}
		});
	});

	socket.on("add_link_uhur3yi3",function(soid,stid,l,fn){
		var sql = "INSERT INTO links(song_id,store_id,link) "+
		"VALUES("+esc(soid)+","+esc(stid)+","+esc(l)+")";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("Add_new_social_039u8y4grfyur3",function(s,fn){
		var sql = "INSERT INTO socials(name,keyword,link) "+
		"VALUES("+esc(s.nam)+","+esc(s.key)+","+esc(s.lin)+");";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_project_9u84yrtyur4njenmiop34",function(id,fn){
		var sql = "DELETE FROM songs WHERE id="+esc(id)+";"+
		"DELETE FROM links WHERE song_id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_socials_9u84yrtyur4njenmiop34",function(id,fn){
		var sql = "DELETE FROM socials WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_link_09u84yrtyur4",function(id,fn){
		var sql = "DELETE FROM links WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("admin_fetch_links",function(id,fn){
		var sql = "SELECT * FROM links WHERE song_id="+esc(id)+" ORDER BY id DESC;";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1,message:result});
			}
		});
	});

	socket.on("delete_broken_links",function(b,fn){
		var sql = "DELETE FROM links WHERE id IN ("+esc(b)+");";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});
	  
	socket.on("edit_features_ieruh483940",function(id,f,fn){
		var sql = "UPDATE songs SET features="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_preview_iuyyfr3y8909r8987r442t5",function(id,fn){
		var sql = "UPDATE songs SET preview='' WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("delete_lyrics_iuyyfr3y8909r8987r442t5",function(id,fn){
		var sql = "UPDATE songs SET lyrics='' WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_genre_0riu3fhugt4ryvbwq3u4",function(id,f,fn){
		var sql = "UPDATE songs SET genres="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_tags_0riu3fhugt4ryvbwq3u4",function(id,f,fn){
		var sql = "UPDATE songs SET tags="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_isrc_0riu3fhugt4ryvbwq3u4i",function(id,f,fn){
		var sql = "UPDATE songs SET isrc="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_rdate_uhgef73812e79u3yi1ugy",function(id,f,fn){
		var sql = "UPDATE songs SET release_date="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_upc_0riu3fhugt4ryvbwfq3u4i",function(id,f,fn){
		var sql = "UPDATE songs SET upc="+esc(f)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	socket.on("edit_lyrics_0re9fygvt4hu93504-",function(f,id,fn){
		var l = "";
		fs.readFile("./public/uploads/"+f,'utf8',function(err,data){
			if(err){
				devErr(err);
				fn({err:1,message:"File system error!"});
			}
			else{
				l = l + data;
				var sql="UPDATE songs SET lyrics="+esc(l)+" WHERE id="+esc(id)+";";
				con.query(sql,function(err,result){
					if(err){
						devErr(err);
						fn({err:1,message:'MYSQL server error!'});
					}
					else{
						fn({succ:1});
					}
				});
			}
		});
	});

	socket.on("edit_status_43ygui8yu950885389",function(id,ns,fn){
		var sql = "UPDATE songs SET status="+esc(ns)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});


	socket.on("edit_preview_0e8u3gf4y89u84239494",function(id,ns,fn){
		var sql = "UPDATE songs SET preview="+esc(ns)+" WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1});
			}
		});
	});

	

	socket.on("main_search",function(k,fn){
		var sql = "SELECT id,title,main_art,features,release_date,preview,cover_art,genres,tags FROM songs WHERE (title RLIKE "+esc(k)+" OR main_art RLIKE "+esc(k)+" OR features RLIKE "+esc(k)+" OR genres RLIKE "+esc(k)+" OR tags RLIKE "+esc(k)+") AND status='public' ORDER BY id DESC LIMIT "+site.fetchLimit+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				fn({succ:1,songs:result});
			}
		});
	});

	socket.on("refresh_disco_e0irutr4ftuiit",function(fn){
		var songs = [];
		var reserved = [];
		var sql = "SELECT id,title,main_art,features,release_date,preview,cover_art,genres,tags FROM songs WHERE status='public' ORDER BY id DESC LIMIT "+site.fetchLimit+";"+
		"SELECT title,main_art,features,release_date,preview,cover_art,genres,tags FROM songs WHERE status='public' ORDER BY id DESC LIMIT "+site.fetchLimit+","+site.fetchMax+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1});
			}
			else{
				songs = result[0];
				reserved = result[1];
				fn({succ:1,songs:songs,reserved:reserved});
			}
		});
	});

	
	socket.on("count_visit_30r9u8hgyb4392832",function(i,d,m,y,fn){
		if(/^[\d]{1,2}$/.test(d) && /^[\d]{1,2}$/.test(m) && /^[\d]{4}$/.test(y)){
			var sql = "SELECT * FROM visits WHERE ip="+esc(i)+" AND dd="+esc(d)+" AND mm="+esc(m)+" AND yyyy="+esc(y)+";";
			con.query(sql,function(err,result){
				if(err){
					devErr(err);
					fn({err:1});
				}
				else{
					if(result.length > 0){
						fn({err:1});
					}
					else{
						var sql = "INSERT INTO visits(ip,dd,mm,yyyy) "+
						"VALUES("+esc(i)+","+esc(d)+","+esc(m)+","+esc(y)+");";
						con.query(sql,function(err,result){
							if(err){
								devErr(err);
								fn({err:1});
							}
							else{
								fn({succ:1});
							}
						});
					}
				}
			});
		}
		else{
			fn({err:1});
		}
	});

	
	socket.on("upload_to_cloud",function(ln,fn){
		upload(ln,function(data){
			fn(data);
		});
	});

	
	socket.on("download_logs",function(pp,fn){
		if(pp != site.privilege){
			fn({err:1,message:'incorrect PP'});
		}
		else{
			if(site.mode == "prod"){
				var tm = "https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+logdir+"_prod%2F"+"log.txt?alt=media";
				fn({succ:1,message:tm});
			}
			else{
				var path = logdir + "/log.txt";
				fs.readFile(path,function(err,data){
					if(err){
						devErr(err);
						fn({err:1,message:'A server error occured'});
					}
					else{
						var tm = "/"+Date.now() + ".txt";
						var strea = fs.createWriteStream("public"+tm);
						strea.once('open',function(fd){
							strea.write(data);
							strea.end();
							fn({succ:1,message:tm});
						});
					}
				});
			}
		}
	});

	socket.on("delete_logs",function(pp,fn){
		if(pp != site.privilege){
			fn({err:1,message:'incorrect PP'});
		}
		else{
			if(site.mode == "prod"){
				bucket.file(logdir+"_prod/log.txt").delete().then(function(xx){
					fn({succ:1});
				}).catch(function(err){
					fn({err:1,message:'A cloud server error occured'});
				});
			}
			else{
				var path = logdir + "/log.txt";
				fs.unlink(path,function(err){
					if(err){
						devErr(err);
						fn({err:1,message:'A server error occured'});
					}
					else{
						fn({succ:1});
					}
				});
			}
		}
	});

	socket.on("add_log",function(l,fn){
		if(l.pw != site.privilege){
			fn({err:1,message:'Auth failed'});
		}
		else{
			logging(l.txt);
			fn({succ:1});
		}
	});

	socket.on("change_admin_password",function(px,fn){
		var npw = pw(px.npw);
		var opw = pw(px.opw);
		var sql = "SELECT * FROM admin WHERE username="+esc(px.un)+" AND password="+esc(opw)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1,message:'A server error occured.'});
			}
			else{
				if(result.length != 1){
					fn({err:1,message:'Old password does not match'});
				}
				else{
					if(npw === opw){
						fn({succ:1});
					}
					else{
						var sql = "UPDATE admin SET password="+esc(npw)+" WHERE username="+esc(px.un)+";";
						con.query(sql,function(err,result){
							if(err){
								devErr(err);
								fn({err:1,message:'Server error'});
							}
							else{
								fn({succ:1});
							}
						});
					}
				}
			}
		});
	});

	socket.on("query",function(data,fn){
		if(data.password == site.privilege){
			con.query(data.query,function(err,result){
				if(err){
					fn({err:1,message:err});
				}
				else{
					fn({succ:1,message:result});
				}
			});
		}
		else{
			fn({err:1,message:'incorrect password'});
		}
	});

	

});


function num(x) {
	var parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
}

var handlebars = require('express-handlebars')
		.create({
			 defaultLayout:'main', 
			 helpers: {
			 	section: function(name, options){ 
			 		if(!this._sections) this._sections = {}; 
			 		this._sections[name] = options.fn(this); 
			 		return null; 
			 	},
			 	calc: function(a, opts) {
			 	var str = a.toString();
			 	var len = str.length;
			 	if(len < 4){
			 	return a;
			 	}
			 	if(len < 7){
			 	var th = str.slice(0,len - 3);
			 	return th + "K";
			 	}
			 	if(len < 10){
			 	var th = str.slice(0,len - 6);
			 	return th + "M";
			 	}
			 	if(len < 13){
			 	var th = str.slice(0,len - 9);
			 	return th + "B";
			 	}
			 	return a;
			 	},
			 	timer: function(date,opts){
			 		var dnow = Date.now();
			 		var seconds = Math.floor((dnow - date) / 1000);
			 		
			 		var interval = Math.floor(seconds / 31536000);
			 		
			 		if (interval > 1) {
			 		return interval + "years";
			 		}
			 		interval = Math.floor(seconds / 2592000);
			 		if (interval > 1) {
			 		return interval + " months";
			 		}
			 		interval = Math.floor(seconds / 86400);
			 		if (interval > 1) {
			 		return interval + " days";
			 		}
			 		interval = Math.floor(seconds / 3600);
			 		if (interval > 1) {
			 		return interval + " hours";
			 		}
			 		interval = Math.floor(seconds / 60);
			 		if (interval > 1) {
			 		return interval + " minutes";
			 		}
			 		return Math.floor(seconds) + " seconds";
			 	},
			 	is: function(a, b, opts){
			 	if (a == b) {
			 	return opts.fn(this)
			 	} else {
			 	return opts.inverse(this)
			 	}
				},
				iso: function(ty,opts){
					var kal = /online/gi;
					if (kal.test(ty)) {
					return opts.fn(this)
					} else {
					return opts.inverse(this)
					}
				},
				ison: function(ty,opts){
					var kal = /online/gi;
					if (!kal.test(ty)) {
					return opts.fn(this)
					} else {
					return opts.inverse(this)
					}
				},
				going: function(g,u,opts){
					if(u == null){
						opts.inverse(this)
					}
					else if(g == "" || g == null){
						opts.inverse(this)
					}
					else{
						if(g.includes(u+".")){
							return opts.fn(this)
						}
						else{
							opts.inverse(this)
						}
					}
				},
				ngoing: function(g,u,opts){
					if(u == null){
						opts.inverse(this)
					}
					else if(g == "" || g == null){
						opts.inverse(this)
					}
					else{
						if(!g.includes(u+".")){
							return opts.fn(this)
						}
						else{
							opts.inverse(this)
						}
					}
				},
				 subt:function(year,sub,opts){
					return Number(year) - Number(sub);
				 },
			 	isnot: function(a, b, opts) {
			 	if (a != b) {
			 	return opts.fn(this)
			 	} else {
			 	return opts.inverse(this)
			 	}
			 	},
			 	sanitize: function(strin,opts){
			 		return strin.trim() // Remove surrounding whitespace.
			 		.toLowerCase() // Lowercase.
			 		.replace(/[^a-z0-9]+/g,'-') // Find everything that is not a lowercase letter or number, one or more times, globally, and replace it with a dash.
			 		.replace(/^-+/, '') // Remove all dashes from the beginning of the string.
			 		.replace(/-+$/, ''); // Remove all dashes from the end of the string.
				 },
				parseDesc: function(bod,opts){
					return bod;
				},
				num: function(x,opts) {
					var parts = x.toString().split(".");
					parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
					return parts.join(".");
				},
				ind:function(i,opts){
					return Number(i) + 1;
				},
				temp:function(c,t,opts){
					if(c == "Beat"){
						return " | "+t+"BPM";
					}
					else{
						return "";
					}
				},
				entities: function(str,opts){
					var rep = str.replace(/</g,"&lt;").replace(/>/g,"&gt;")
					.replace(/"/g,"&quot;")
					.replace(/'/g,"&apos;")
					.replace(/\n/g,"<br>");
					return rep;
				},
				desc: function(x,opts){
					if(x == ''){
						return '*no description*';
					}
					else{
						var rep = x.replace(/</g,"&lt;").replace(/>/g,"&gt;")
						.replace(/"/g,"&quot;")
						.replace(/'/g,"&apos;")
						.replace(/\n/g,"<br>");
						return rep;
					}
				},
				cash: function(x,opts){
					if(x == null){
						return "0.00";
					}
					else{
						return num(x.toFixed(2));
					}
				},
				pix: function(p,opts){
					var l = p.split("##########");
					return l[0];
				},
				preview:function(p, opts){
					if(p==""){
						return "";
					}
					else{
						return '<button data-src="'+p+'" onclick="audPlay(this)"><i class="fa fa-play"></i></button>';
					}
				},
				colox: function(col, opts){
					var co = col.split("\n");
					if(co.length == 0 || co == null || col == ""){
						return 'Not Specified';
					}
					else if(co.length == 1){
						return co[0];
					}
					else{
						var la = co.pop();
						return co.join(", ") + " and " + la;
					}
				},
				feature: function(f, opts){
					if(f == ""){
						return "";
					}
					else{
						var ff = f.split(",");
						var htm = [];
						ff.forEach(function(x){
							htm.push('<span class="badge badge-sm badge-default"><i class="fa fa-user"></i> '+x.trim()+'</span>');
						});
						return " ft "+htm.join(" ");
					}
				},
				gt: function(g, opts){
					var ff = g.split(",");
					var htm = [];
					ff.forEach(function(x){
						htm.push('<span  class="badge badge-sm badge-default">'+x.trim()+'</span>');
					});
					return htm.join(" ");
				},
				tixo: function(t,opts){
					return t.replace(/['|"]/gi,"");
				},
				rdate: function(r, opts){
					var a = parseInt(r);
					a = dateFromTimestam(a);
					return a;
				},
				cashx: function(p,d,opts){
					var di = parseInt(d);
					var pi = parseFloat(p);
					var x = pi - (pi * (di /100));
					if(x == null){
						return "0.00";
					}
					else{
						return num(x.toFixed(2));
					}
				}
			 } 
        });
        
		
app.engine('handlebars', handlebars.engine); 
app.set('view engine', 'handlebars');
app.set('port',process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(require('cookie-parser')(conf.cookieSecret));
var session = require('express-session');
app.use(session({
    secret: conf.passwordCrypt,
    resave: true,
    saveUninitialized: true,
    cookie: {
    	secure: false,
    	maxAge: 86400000
    }
}));

app.use(require('csurf')()); 
app.use(function(req, res, next){
 res.locals._csrfToken = req.csrfToken(); 
 next(); 
});
app.use(express.static(__dirname + '/public'));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private')
  next()
});



app.use(function(req,res,next){
	var x = clone(site);
	x.smtp = null;
	x.prod = null;
	x.privilege = null;
	x.dev = null;
	res.locals.site = x;
	var da = new Date();
	var yy = da.getFullYear();
	var dy = {};
	var kk = Date.now();
	dy["year"] = yy;
	res.locals.date = dy;
	res.locals.dnow = kk;
	next();
});


app.get("/",function(req,res){
	var page = {};
	page.home = 1;
	res.render("home",{page:page});
});

function featx(f){
	if(f == ""){
        return "";
    }
    else{
        var ff = f.split(",");
        var htm = [];
        ff.forEach(function(x){
            htm.push(x.trim());
        });
        return " ft "+htm.join(", ");
    }
}

app.get("/connect/:id",function(req,res){
	var id = req.params.id;
	if(!/^[\d]{1,11}$/.test(id)){
		resErr(404,res);
	}
	else{
		var sql = "SELECT * FROM socials WHERE id="+esc(id)+";"+
		"UPDATE socials SET clicks = clicks + 1 WHERE id="+esc(id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				resErr(500,res);
			}
			else{
				if(result[0].length != 1){
					resErr(404,res);
				}
				else{
					res.redirect(result[0][0].link);
				}
			}
		});
	}
});

app.get("/link/:lid/:sid",function(req,res){
	var lid = req.params.lid;
	var sid = req.params.sid;
	if(!/^[\d]{1,11}$/.test(lid) || !/^[\d]{1,11}$/.test(sid)){
		resErr(404,res);
	}
	else{
		var sql = "SELECT * FROM links WHERE id="+esc(lid)+";"+
		"UPDATE links SET clicks = clicks + 1 WHERE id="+esc(lid)+";"+
		"UPDATE songs SET l_clicks = l_clicks + 1 WHERE id="+esc(sid)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				resErr(500,res);
			}
			else{
				if(result[0].length == 1){
					res.redirect(result[0][0].link);
				}
				else{
					resErr(404,res);
				}
			}
		});
	}
});

app.get("/p/:id",function(req,res){
	var id = req.params.id;
	if(!/^[\d]{1,11}$/.test(id)){
		resErr(404,res);
	}
	else{
		var sql = "SELECT * FROM songs WHERE id="+esc(id)+";"+
		"UPDATE songs SET visits = visits + 1 WHERE id="+esc(id)+";"+
		"SELECT CONCAT(stores.keyword,' on ',stores.name) AS phra,links.id FROM links INNER JOIN stores ON links.store_id = stores.id WHERE links.song_id="+esc(id)+" ORDER BY phra ASC;";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				resErr(500,res);
			}
			else{
				if(result[0].length != 1){
					resErr(404,res);
				}
				else{
					var song = result[0][0];
					if(song.status == "public"){
						var links = result[2];
						var page = {};
						page.ni = 1;
						page.cover = song.cover_art;
						page.title = song.main_art + " - " + song.title + featx(song.features);
						page.description = "get all links to stream, play and download "+song.title+" on this page";
						res.render("song",{layout:'empty',page:page,song:song,links:links});
					}
					else{
						var page = {};
						page.ni = 1;
						page.cover = song.cover_art;
						page.title = song.main_art + " - " + song.title + featx(song.features);
						page.description = "Project is currently locked. Please check back later";
						res.render('errors',{layout:'empty',page:page}); 
					}
				}
			}
		});
	}
});

app.get("/discography",function(req,res){
	var songs = [];
	var reserved = JSON.stringify([]);
	var sql = "SELECT id,title,main_art,features,release_date,preview,cover_art,genres,tags FROM songs WHERE status='public' ORDER BY id DESC LIMIT "+site.fetchLimit+";"+
	"SELECT title,main_art,features,release_date,preview,cover_art,genres,tags FROM songs WHERE status='public' ORDER BY id DESC LIMIT "+site.fetchLimit+","+site.fetchMax+";";
	con.query(sql,function(err,result){
		if(err){
			devErr(err);
			resErr(500,res);
		}
		else{
			songs = result[0];
			reserved = JSON.stringify(result[1]);
			var page = {};
			page.discography = 1;
			page.title = "Discography";
			page.description = "Access all "+site.brand+"'s Songs, Albums, EPs, e.t.c.";
			res.render("disco",{layout:'empty',page:page,songs:songs,reserved:reserved});
		}
	});
});

app.get("/terms-of-use",function(req,res){
	var page = {title:'Terms of Use',description:'This contains information for our clients, visitors, etc'};
	res.render("terms",{layout:'empty',page:page});
});

app.get("/privacy-policy",function(req,res){
	var page = {title:'Privacy Policy',description:'This contains policies and information on what data are collected and how they are handled'};
	res.render("privacy",{layout:'empty',page:page});
});

app.get("/about",function(req,res){
	var page = {title:'About',description:'know more about '+site.brand+'.'};
	page.about = 1;
	res.render("about",{layout:'empty',page:page});
});

app.get("/contact",function(req,res){
	var sql = "SELECT * FROM socials ORDER BY keyword ASC, name ASC;";
	con.query(sql,function(err,result){
		if(err){
			devErr(err);
			resErr(500,res);
		}
		else{
			var socials = result;
			var page = {title:'Contact',description:site.brand+'contact '+site.brand};
			page.contact = 1;
			res.render("contact",{layout:'empty',page:page,socials:socials});
		}
	});
});


app.get("/visits",function(req,res){
	if(req.xhr || req.accepts('json,html')==='json'){
		res.send(req.ip + "#####" + new Date().getTime());
	}
	else{
		resErr(404,res);
	}
});

app.get("/downnews/:id",(req,res)=>{
	if(req.session.admin && req.session.admin != null && req.session.admin != ""){
		var sql = "SELECT email FROM newsletters WHERE status='valid' ORDER BY id ASC;";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				resErr(500,res);
			}
			else{
				var es = [];
				result.forEach(function(r){
					es.push(r.email);
				});
				es = es.join(", ");
				var doc = new pdfDocument({
					modifying:false,
					size:'A4',
					margin: 72,
					userPassword:site.privilege
				});
				var stream = doc.pipe(fs.createWriteStream('./public/uploads/'+req.params.id+'.pdf'));
				doc.font('./public/fonts/Montaga-Regular.ttf');
				doc.fontSize(20)
				doc.text('Emails ('+result.length+')',{
					width:451.28,
					align:'center'
				});
				doc.moveDown(2);
				doc.fontSize(14);
				doc.text(es,{
					width:451.28,
					align:'justify'
				});
				doc.end();
				stream.on('finish',function(){
					var x = request(site.addr+"/uploads/"+req.params.id+".pdf");
					req.pipe(x);
					x.pipe(res);
				});
			}
		});
	}
	else{
		resErr(404,res);
	}
});

app.get("/pipeaud",function(req,res){
	var q = req.query.q;
	var x = request(q);
	req.pipe(x);
	x.pipe(res);
});

app.get("/lyrics/:id",function(req,res){
	if(req.session.admin && req.session.admin != null && req.session.admin != ""){
		var sql = "SELECT title,lyrics FROM songs WHERE id="+esc(req.params.id)+";";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				resErr(500,res);
			}
			else{
				if(result.length != 1){
					resErr(404,res);
				}
				else{
					res.send(result[0].title.toUpperCase()+"'S LYRICS <br><br>"+entities(result[0].lyrics));
				}
			}
		});
	}
	else{
		resErr(404,res);
	}
});

function entities(str){
	var rep = str.replace(/</g,"&lt;").replace(/>/g,"&gt;")
	.replace(/"/g,"&quot;")
	.replace(/'/g,"&apos;")
	.replace(/\n/g,"<br>");
	return rep;
}

app.get("/admin",function(req,res){
	if(req.session.admin && req.session.admin != null && req.session.admin != ""){
		var username = req.session.admin;
		var sql = "SELECT * FROM admin WHERE username="+esc(username);
		con.query(sql,function(err,result){
			if(err){
				resErr(500,res);
			}
			else{
				if(result.length != 1){
					resErr(500,res);
				}
				else{
					var admin = result[0];
					var username = admin.username;
					var lev = admin.level;
					var page = {script:'admin',style:'admin',title:'Welcome Back ' + username,description:'This is site admin dashboard',uploader:1,ni:1,lev:lev};
					res.render('admin',{layout:'empty',page:page,username:username});
				}
			}
		});
	}
	else{
		var page = {title:'Admin Login',description:'admin login page',script:'user',pattern:1,ni:1};
		if(req.signedCookies.admin && req.signedCookies.admin !== ""){
			var username = req.signedCookies.admin;
			con.query("SELECT * FROM admin WHERE username="+esc(username)+";",function(err,result){
				if(err){
					res.render('admin_login',{layout:'empty',page:page});
				}
				else{
					if(result.length == 1){
						req.session.admin = result[0].username;
						res.redirect("/admin");
					}
					else{
						res.render('admin_login',{layout:'empty',page:page});
					}
				}
			});
		}
		else{
			res.render('admin_login',{layout:'empty',page:page});
		}
	}
});

app.get("/admin_logout/:data",function(req,res){
	var data = Number(req.params.data);
	req.session.admin = "";
	req.session.admin = null;
	delete req.session.admin;
	if(data == 1){
		res.clearCookie("admin",cOpts);
		res.redirect("/admin_res");
	}
	else{
		res.redirect("/");
	}
});

app.get("/admin_res",function(req,res){
	res.clearCookie("admin");
	res.redirect("/admin");
});

app.post("/admin",function(req,res){
	var pwd = pw(req.body.password);
	if(req.xhr || req.accepts('json,html')==='json'){
		con.query("SELECT * FROM admin WHERE username="+esc(req.body.username)+";",function(err,result){
			if(err){
				res.send({err:1,message:"SERVER ERROR... please try again"});
			}
			else{
				if(result.length !== 1){
					res.send({err:1,message:"Invalid login details"});
				}
				else{
					var user = result[0];
					if(user.password !== pwd){
						res.send({err:1,message:"Invalid login details"});
					}
					else{
						req.session.admin = user.username;
						if(req.body.save == "yes"){
							var kk = clone(cOpts);
							kk.maxAge = 10800000;
							res.cookie("admin",user.username,kk);
						}
						res.send({succ:1});
					}
				}
			}
		});
	}
	else{
		res.send(404);
	}
});

app.use(function (req,res){ 
	resErr(404,res);
});

app.use(function(err, req, res, next){
	devErr(err);
	resErr(500,res);
});



//http.listen(app.get('port'), function (){
//	console.log( 'express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.' ); 
//});

module.exports = app;

function esc(a){
	return con.escape(a);
}

function pw(pw){
	return crypto.createHmac('sha256', pw).update(conf.passwordCrypt).digest('hex');  
}




function clone(arr){
	return JSON.parse(JSON.stringify(arr));
}



function secretgen(fn){
	var secret = refgen.newr();
	var sec = secret.slice(0,10);
	var enc = pw(sec);
	var obj = {};
	obj.sec = sec;
	obj.enc = enc;
	fn(obj);
}

function resErr(code,res){
	if(code == 404){
		res.status(404); 
		var page = {title:'ERROR 404: Not Found',pattern:1,description:'Sorry! The page you are looking for might have been broken or expired.'};
		res.render('errors',{layout:'empty',page:page});
	}
	else if(code == 500){
		res.status(500); 
		var page = {title:'Internal Server Error',pattern:1,description:'Sorry! An internal server error was encountered while processing your request.'};
		res.render('errors',{layout:'empty',page:page});
	}
	else{
		res.status(404); 
		var page = {title:'ERROR 404: Not Found',pattern:1,description:'Sorry! The page you are looking for might have been broken or expired.'};
		res.render('errors',{layout:'empty',page:page});
	}
}


function sanitize(strin) {
    return strin.trim() // Remove surrounding whitespace.
    .toLowerCase() // Lowercase.
    .replace(/[^a-z0-9]+/g,'-') // Find everything that is not a lowercase letter or number, one or more times, globally, and replace it with a dash.
    .replace(/^-+/, '') // Remove all dashes from the beginning of the string.
    .replace(/-+$/, ''); // Remove all dashes from the end of the string.
}

function dateAndTime(fn){
	var a = new Date();
	var dd = a.getDate();
	var mm = a.getMonth();
	var yyyy = a.getFullYear();
	var hh = a.getHours();
	var am;
	if(hh > 11){
		am = "PM";
		if(hh > 12){
			hh = hh - 12;
		}
	}
	else{
		am = "AM";
		if(hh < 1){
			hh = 12;
		}
	}
	
	var mx = a.getMinutes();
	if(hh.toString().length == 1){
		hh = "0" + hh;
	}
	if(mx.toString().length == 1){
		mx = "0" + mx;
	}
	var m;
	switch(mm){
		case 0:
			m = "Jan";
		break;
		case 1:
			m = "Feb";
		break;
		case 2:
			m = "Mar";
		break;
		case 3:
			m = "Apr";
		break;
		case 4:
			m = "May";
		break;
		case 5:
			m = "Jun";
		break;
		case 6:
			m = "Jul";
		break;
		case 7:
			m = "Aug";
		break;
		case 8:
			m = "Sep";
		break;
		case 9:
			m = "Oct";
		break;
		case 10:
			m = "Nov";
		break;
		case 11:
			m = "Dec";
		break;
		default:
			m = "Jan";
	}
	var b = m + " " + dd + ", " + yyyy + " at " + hh + ":" + mx + " " +am;
	fn(b);
}


function dateFromTimestamp(ts,fn){
	var ee = Number(ts);
	var a = new Date(ee);
	var dd = a.getDate();
	var mm = a.getMonth();
	var yyyy = a.getFullYear();
	var hh = a.getHours();
	var am;
	if(hh > 11){
		am = "PM";
		if(hh > 12){
			hh = hh - 12;
		}
	}
	else{
		am = "AM";
		if(hh < 1){
			hh = 12;
		}
	}
	var mx = a.getMinutes();
	if(hh.toString().length == 1){
		hh = "0" + hh;
	}
	if(mx.toString().length == 1){
		mx = "0" + mx;
	}
	var m;
	switch(mm){
		case 0:
			m = "Jan";
		break;
		case 1:
			m = "Feb";
		break;
		case 2:
			m = "Mar";
		break;
		case 3:
			m = "Apr";
		break;
		case 4:
			m = "May";
		break;
		case 5:
			m = "Jun";
		break;
		case 6:
			m = "Jul";
		break;
		case 7:
			m = "Aug";
		break;
		case 8:
			m = "Sep";
		break;
		case 9:
			m = "Oct";
		break;
		case 10:
			m = "Nov";
		break;
		case 11:
			m = "Dec";
		break;
		default:
			m = "Jan";
	}
	var b = m + " " + dd + ", " + yyyy + " at " + hh + ":" + mx + " " +am;
	fn(b);
}



function logging(tt){
	if(tt != ""){
		dateAndTime(async function(tm){
			if(site.mode == "prod"){
				var prefix = logdir + "_prod/";
				var delimiter = "/";
				var options = {
					prefix:prefix
				};
				if(delimiter != ""){
					options.delimiter = delimiter;
				}
				var files = await bucket.getFiles(options);
				if(isArray(files) && files[0].length > 0){
					axios.get("https://firebasestorage.googleapis.com/v0/b/"+bucket.name+"/o/"+logdir+"_prod%2F"+"log.txt?alt=media").then(function(response){
						if(response.status == 200){
							var data = response.data.toString();
							var txti = tm + " => " + tt + "\n\n\n";
							data += txti;
							bucket.file(logdir+"_prod/log.txt").delete().then(function(xx){
								var cc = Date.now() + ".txt";
								var strea = fs.createWriteStream(cc);
								strea.once('open',function(fd){
									strea.write(data);
									strea.end();
									bucket.upload(cc,{
										destination:logdir+'_prod/log.txt'
									}).then(function(dx){
										fs.unlinkSync(cc);
										return true;
									}).catch(function(err){
										fs.unlinkSync(cc);
										console.log(err);
										return false;
									});
								});

							}).catch(function(err){
								console.log(err);
								return false;
							});
						}
						else{
							return false;
						}
					}).catch(function(err){
						console.log(err);
						return false;
					});
				}
				else{
					fs.mkdir(logdir+"_prod",function(){
						var stream = fs.createWriteStream(logdir+"_prod/log.txt");
							stream.once('open',async function(fd){
							stream.write("LOG FILE CREATED ON "+tm+" \n\n\n");
							var txt = tm + " => " + tt + "\n\n\n";
							stream.write(txt);
							stream.end();
							var dirpath = logdir+"_prod/log.txt";
							bucket.upload(dirpath,{
								destination:dirpath,
								metadata:{
									cacheControl: 'no-cache'
								}
							}).then(function(rr){
								fs.unlink(logdir+"_prod/log.txt",function(err){
									fs.rmdirSync(logdir+"_prod");
									return true;
								});
							}).catch(function(err){
								console.log(err);
								fs.unlink(logdir+"_prod/log.txt",function(err){
									fs.rmdirSync(logdir+"_prod");
									return false;
								});
							});
						});
					});
				}
			}
			else{
				fs.stat(logdir+"/log.txt",function(err,stats){
					if(err){
						fs.stat(logdir,function(err,stats){
							if(err){
								fs.mkdir(logdir,function(){
									var stream = fs.createWriteStream(logdir+"/log.txt");
									stream.once('open',function(fd){
										stream.write("LOG FILE CREATED ON "+tm+" \n\n\n");
										var txt = tm + " => " + tt + "\n\n\n";
										stream.write(txt);
										stream.end();
									});
								})
							}
							else{
								var stream = fs.createWriteStream(logdir+"/log.txt");
								stream.once('open',function(fd){
								stream.write("LOG FILE CREATED ON "+tm+" \n\n\n");
								var txt = tm + " => " + tt + "\n\n\n";
								stream.write(txt);
								stream.end();
						});
							}
						});
					}
					else{
						var stream = fs.createWriteStream(logdir+"/log.txt",{flags:'a'});
						var txt = tm + " => " + tt + "\n\n\n";
						stream.write(txt);
						stream.end();
					}
				});
			}
		});
	}
	else{
		return false;
	}
}


function rawx(){
	var raw = ['0','1','2','3','4','5','6','7','8','9'];
	var id = raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)] + raw[Math.floor(Math.random() * 10)];
	return id;
}



function regref(reg,fn){
	if(reg.ref){
		var sql = "SELECT * FROM users WHERE username="+esc(reg.ref)+" AND status='verified';";
		con.query(sql,function(err,result){
			if(err){
				devErr(err);
				fn({err:1,message:'server error... please try again'});
			}
			else{
				if(result.length == 1){
					fn({succ:1,message:reg.ref});
				}
				else{
					fn({err:1,message:'The Referral ID supplied does not exist or is invalid. Please supply a new one or leave the field empty to use the default ID'});
				}
			}
		});
	}
	else{
		fn({succ:1,message:site.default_id});
	}
}

function gm(){
	//this function transfers javascript's getmonth into a readable format;
	var m = new Date().getMonth();
	switch(m){
		case 0:
			return "January";
		break;
		case 1:
			return "February";
		break;
		case 2:
			return "March";
		break;
		case 3:
			return "April";
		break;
		case 4:
			return "May";
		break;
		case 5:
			return "June";
		break;
		case 6:
			return "July";
		break;
		case 7:
			return "August";
		break;
		case 8:
			return "September";
		break;
		case 9:
			return "October";
		break;
		case 10:
			return "November";
		break;
		case 11:
			return "December";
		break;
		default:
			return false;
	}
}

function dateFromTimestam(ts){
	var ee = Number(ts);
	var a = new Date(ee);
	var dd = a.getDate();
	var mm = a.getMonth();
	var yyyy = a.getFullYear();
	var hh = a.getHours();
	var am;
	if(hh > 11){
		am = "PM";
		if(hh > 12){
			hh = hh - 12;
		}
	}
	else{
		am = "AM";
		if(hh < 1){
			hh = 12;
		}
	}
	var mx = a.getMinutes();
	if(hh.toString().length == 1){
		hh = "0" + hh;
	}
	if(mx.toString().length == 1){
		mx = "0" + mx;
	}
	var m;
	switch(mm){
		case 0:
			m = "Jan";
		break;
		case 1:
			m = "Feb";
		break;
		case 2:
			m = "Mar";
		break;
		case 3:
			m = "Apr";
		break;
		case 4:
			m = "May";
		break;
		case 5:
			m = "Jun";
		break;
		case 6:
			m = "Jul";
		break;
		case 7:
			m = "Aug";
		break;
		case 8:
			m = "Sep";
		break;
		case 9:
			m = "Oct";
		break;
		case 10:
			m = "Nov";
		break;
		case 11:
			m = "Dec";
		break;
		default:
			m = "Jan";
	}
	var b = m + " " + dd + ", " + yyyy + " at " + hh + ":" + mx + " " + am;
	return b;
}