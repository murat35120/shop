const http = require('http');
const fs = require('fs'); //работа с файлами
const path = require('path'); //работа с путями
const os = require('os');
const {scryptSync,} = require('node:crypto');
const salt="version 01";
const roles=["buyer", "seller", "manager", "admin"];

let mysql;
let uid;
try{
	mysql = require("mysql2");
	uid = require('uid-safe'); 	
}
catch(e){
	console.log("require bad");  
	console.log(e.name); 
	console.log(e.message);
	console.log(e.stack);
	return;
}
let inns = new Set();
inns.add("7801440951");
const root=__dirname+"/site";
const root1=__dirname+"/site/";
const port_http=8080;
const order={};
const ip_adresses = os.networkInterfaces();
for(const i in ip_adresses){
	for(const k in ip_adresses[i])if(ip_adresses[i][k].family == 'IPv4')console.log("Server running at http://" + ip_adresses[i][k].address + ':' + port_http);
}
const server = http.createServer((req, res) => {
    let first_url=req.url;
	//console.log("first_url - "+first_url);
	//console.log("__dirname - "+__dirname);
	if(req.method=='GET'){ // запросы страниц
		send_file( res, first_url);
	}
	if(req.method=='POST'){ // запросы API
	//	console.log('POST');
		send_post(req, res);
	}
}); 
const connection = mysql.createConnection({
	host: "localhost",
	user: "murat",
	database: "shop",
	password: "3512086"
});
connection.connect(function(err){
	if (err) {
		return console.error("Ошибка: " + err.message);
	} else {
		console.log("Подключение к серверу MySQL успешно установлено");
	}
});
server.listen(port_http);

function send_file( res, first_url){
    let new_url;
    //исправляем кодировку   
    try{
        new_url=decodeURIComponent(first_url);   
    }
    catch(e){
        res.statusCode = 400;  
        res.end("Bad reques");
        return;
    }
    // проверяем отсутствие 0 байта
    if(~new_url.indexOf('\0')){
        res.statusCode = 400;  
        res.end("Realy Bad reques");
        return;
    }
	//полный путь к файлу
	let all_url=path.normalize(path.join(__dirname, new_url));
	//проверяем и редактируем путь
	if(path.extname(all_url)==""){ //если нет расширения файла
		all_url=__dirname+"/site/index.html";
	} else {
	    if(path.dirname(new_url)=="/"){ //если расширение есть, но нет пути
	        all_url=__dirname+"/site/"+path.basename(new_url);
	    }
	}

	//console.log(path.dirname(first_url)); //путь (папка)
	
	fs.stat(all_url,  function(err, st){
		//console.log('last');
		let mimeType=path.extname(new_url);
		fs.readFile(all_url, function(err, content, the_type=mimeType) { 
			if (err){
				//console.log("no file");
				res.writeHead(400,{'Content-Type':'text'});
				res.end('no file');
			}else{
				res.writeHead(200,{'Content-Type':the_type});
				res.end(content);
			}				
		});
	});
}

function send_post(req, res){
    let body = [];
    req.on('error', function(err) {
        console.error(err);
    }).on('data', function(chunk) {
        body.push(chunk);
    }).on('end', function() {
        body = Buffer.concat(body).toString();
        try {
            let obj={}; 
			let data = JSON.parse(body);
			obj.role=path.basename(req.url);
			if(roles.includes(obj.role)){
				if(data.command in commands){
					commands[data.command].start(req, res, data, obj);
				}else{
					functions.answer_send(res, "no the command");
				}
			}else{
				functions.answer_send(res, "no the role");
			}	
        } catch (e) {
            console.error(e);
        }
        res.on('error', function(err) {
            console.error(err);
        });
    });	
}


//console.log(scryptSync("password", salt, 32).toString('hex'));
let functions={
	add_admin(){
		//const hash_admin=scryptSync("password", salt, 32).toString('hex');
		let hash="6e281ea4b173eec20113cd1a699b3d9f7a38a0b6a79335d6c4d9c6424d2e0562";
		let login="Murat351";
		let name="Murat";
		let session="3456";
		let abonent = [login, hash, "admin", name, session];
		let sql = "INSERT INTO abonents(login, hash, role, name, session) VALUES (?, ?, ?, ?, ?)";
		connection.query(sql, abonent, function(err, results) {
			if(err) console.log(err);
		});
	},
	check_admin(){
		mass = ["admin"];
		sql = 'SELECT * FROM abonents WHERE role=?;';
		connection.query(sql, mass, function(err, abonent) {
			if(err) console.log(err);
			if(!abonent.length){
				functions.add_admin();
			} 
		});
	},
	check_hash(req, res, obj){ //3_
		let hash=scryptSync(obj.data.password, salt, 32).toString('hex');
		mass = [obj.data.login, hash, obj.role];
		sql = 'SELECT * FROM abonents WHERE login=? AND hash=? AND role=?;';
		connection.query(sql, mass, function(err, abonent) {
			if(err) console.log(err);
			if(abonent.length){
				obj.abonent_number=abonent.abonent_number;
				functions.new_session(req, res, obj);
			} else{
				functions.answer_send(res, "the login or password is incorrect");
			}
		});
	},
	need_session(req, res, obj){
		if(obj.data.session){
			mass = [obj.data.session];
			sql = 'SELECT * FROM abonents WHERE session=?;';
			connection.query(sql, mass, function(err, abonent) {
				if(err) console.log(err);
				if(abonent.length){
					obj.abonent=abonent;
					if(obj.role==abonent[0].role){
						commands.check_command(req, res, obj);
					}
				} else{
					functions.answer_send(res, "the session is incorrect");
				}
			});
		} else{
			functions.answer_send(res, "no session");
		}
	},
	check_command(req, res, obj){	
		if(obj.data.command in commands){
			commands[obj.data.command](req, res, obj);
		} else {
			functions.answer_send(res, "no the command");
		}
	},
	answer_send(res, msg){ // 2_
		res.writeHead(200);
		if(typeof(msg)=="object"){
			res.end(JSON.stringify(msg));
			//console.log("send object");
		}else{
			res.end(msg);
			console.log(msg);
		}
	},
	check_login(req, res, obj){ //1_
		if("login" in obj.data){
			console.log("login");
			if(obj.data.login.length>5){
				mass = [obj.data.login];
				sql = 'SELECT * FROM abonents WHERE login=?;';
				connection.query(sql, mass, function(err, abonent) {
					if(err) console.log(err);
					if(!abonent.length){
						functions.new_session(req, res, obj);
					} else{
						functions.answer_send(res, "duplicate login");
					}
				});
			} else{
				functions.answer_send(res, "short login");
			}
		} else{
			functions.answer_send(res, "no login");
		}
	},
	check_passkey(req, res, obj){
		if("passkey" in obj.data){
			if(obj.data.passkey.length>5){
				mass = [obj.data.passkey];
				sql = 'SELECT * FROM abonents WHERE passkey=?;';
				connection.query(sql, mass, function(err, abonent) {
					if(err) console.log(err);
					if(abonent.length){
						obj.abonent=abonent[0];
						functions.check_login(req, res, obj);
					} else{
						functions.answer_send(res, "the passkey is incorrect");
					}
				});
			} else{
				functions.answer_send(res, "short passkey");
			}
		} else{
			functions.answer_send(res, "no login");
		}
	},
	session_check(req, res, obj){ // 1_3_
		mass = [obj.session];
		sql = 'SELECT * FROM abonents WHERE session=?;';
		connection.query(sql, mass, function(err, abonent) {
			if(err) console.log(err);
			if(abonent.length){
				functions.new_session(req, res, obj);
			} else{	

				switch(obj.data.command) {
					case "new_abonent":
						functions.insert_abonent(req, res, obj);
						break;
					case "in_abonent":
						functions.write_session(req, res, obj);
						break;
					default:
						functions.answer_send(res, "difrent commands");
				}				
			}
		});
	},
	write_session(req, res, obj){ //3_
		abonent = [obj.session, obj.abonent_number];
		let sql = "UPDATE abonents SET session=? WHERE abonent_number=? ";
		connection.query(sql, abonent, function(err, results) {
			if(err) console.log(err);
			functions.answer_send(res, obj.session); //тут нужно вставить ответ в зависимости от функции
		});
	},
	new_session(req, res, data, obj, func_obj, func_name){
		uid(18, function (err, str) {
			if (err) throw err;
			obj.session=str;
			func_obj[func_name](req, res, data, obj);
		})
	},
	new_session_for(req, res, data, obj, func_obj, func_name){
		uid(18, function (err, str) {
			if (err) throw err;
			obj.session_for=str;
			func_obj[func_name](req, res, data, obj);
		})
	},
	insert_abonent(req, res, obj){ // 1_
		let abonent=[];
		let hash=scryptSync(obj.data.password, salt, 32).toString('hex');
		if(obj.role=="buyer"){
			abonent = [obj.data.login, hash, "buyer", "1", obj.data.inn, obj.data.name, obj.session];
		}else{
			//другие роли
			functions.answer_send(res, "difrent roles");
		}
		//console.log(obj.data.login);
		let sql = "INSERT INTO abonents(login, hash, role, passkey, inn, name, session) VALUES (?, ?, ?, ?, ?, ?, ?)";
		connection.query(sql, abonent, function(err, results) {
			if(err) console.log(err);
			functions.answer_send(res, obj.session); //тут нужно вставить ответ в зависимости от функции
		});
	},
	passkey_gen() {
		let min=100000;
		let max=999999;
		return Math.floor(Math.random() * (max - min)) + min;
	}
}

let commands = {
	//набор объектов содержащих последовательность функций
	new_abonent:{
		start(req, res, data, obj){
			switch(obj.role) {
				case 'buyer': 
					if(data.inn){
						if(inns.has(data.inn)){
							queryes.check_login(req, res, data, obj, commands.new_abonent.check_login);
						}
					}
					else{
						functions.answer_send(res, "the inn is missing");
					}
				break;
				case 'seller': 
					if(data.passkey){
						queryes.check_passkey(req, res, data, obj, commands.new_abonent.check_passkey);
					}else{
						functions.answer_send(res, "the passkey is missing");
					}
				break;
				case 'manager': 
					if(data.passkey){
						queryes.check_passkey(req, res, data, obj, commands.new_abonent.check_passkey);
					}else{
						functions.answer_send(res, "the passkey is missing");
					}
				break;
				default:
					functions.answer_send(res, "the role is incorrect");
			}
		},
		check_passkey(req, res, data, obj){
			if(obj.abonent){
				queryes.check_login(req, res, data, obj, commands.new_abonent.check_login);
			}else{
				functions.answer_send(res, "the passkey is incorrect");
			}
		},
		check_login(req, res, data, obj){
			if(obj.abonent){
				functions.answer_send(res, "the login is duplicate");
			}else{
				functions.new_session(req, res, data, obj, commands.new_abonent, "new_session");
			}
		},
		new_session(req, res, data, obj){
			queryes.session_check(req, res, data, obj, this.session_check);
		},
		session_check(req, res, data, obj){
			if(obj.abonent){
				commands.new_abonent.check_passkey(req, res, data, obj);
			}else{
				obj.hash=scryptSync(data.password, salt, 32).toString('hex');
				if(obj.role=="buyer"){
					queryes.insert_abonent(req, res, data, obj, commands.new_abonent.write_session);
				}else{
					queryes.edit_abonent(req, res, data, obj, commands.new_abonent.write_session);
				}
			}
		},
		write_session(req, res, data, obj){
			let ansver={command:data.command, session:obj.session};
				functions.answer_send(res, ansver);
		},
	},
	in_abonent:{
		start(req, res, data, obj){
			obj.hash=scryptSync(data.password, salt, 32).toString('hex');
			queryes.check_hash(req, res, data, obj, this.check_hash);
		},
		check_hash(req, res, data, obj){
			if(obj.abonent){
				obj.abonent_number=obj.abonent.abonent_number;
				functions.new_session(req, res, data, obj, commands.in_abonent, "new_session");
			}else{
				functions.answer_send(res, "the login or password is incorrect");
			}
		},
		new_session(req, res, data, obj){
			queryes.session_check(req, res, data, obj, this.session_check);
		},
		session_check(req, res, data, obj){
			if(obj.abonent){
				commands.in_abonent.check_hash(req, res, data, obj);
			}else{
				queryes.write_session(req, res, data, obj, commands.in_abonent.write_session);
			}
		},
		write_session(req, res, data, obj){
			let ansver={command:data.command, session:obj.session};
				functions.answer_send(res, ansver);//нужно сделать ответ соответсчтвующим протоколу
		},
	},
	new_passkey:{
		start(req, res, data, obj){
			queryes.session_check(req, res, data, obj, this.session_check);
		},	
		session_check(req, res, data, obj){
			if(obj.abonent){
				obj.passkey=functions.passkey_gen();
				queryes.check_passkey(req, res, data, obj, commands.new_passkey.passkey_is);
			}else{
				functions.answer_send(res, "the session is incorrect");
			}
		},
		passkey_is__99(req, res, data, obj){
			if(obj.abonent){
				commands.new_passkey.session_check(req, res, data, obj);
			}else{
				switch(obj.role) {
					case 'manager': 
							queryes.check_passkey(req, res, data, obj, commands.new_abonent.check_passkey);
					break;
					case 'admin': 
							queryes.check_passkey(req, res, data, obj, commands.new_abonent.check_passkey);
					break;
					default:
						functions.answer_send(res, "the role is incorrect");
				}
			}
		},

		passkey_is(req, res, data, obj){
			if(obj.abonent){
				commands.new_passkey.session_check(req, res, data, obj):
			}else{
				functions.new_session_for(req, res, data, obj, commands.new_passkey, "new_session_check");
			}
		},
		new_session_check(req, res, data, obj){
			if(obj.abonent){
				commands.in_abonent.check_hash(req, res, data, obj);
			}else{
				queryes.write_session(req, res, data, obj, commands.in_abonent.write_session);
			}
		},
		write_session(req, res, data, obj){
			let ansver={command:data.command, session:obj.session};
				functions.answer_send(res, ansver);//нужно сделать ответ соответсчтвующим протоколу
		},
	},
}

//new_passkey
//{
//	command:"new_passkey",
//	session:session,
//	name:name,
//	role:role,
//}
//answer
//{
//	command:"new_passkey",
//	name:name,
//	passkey: passkey
//}



let queryes={
	//набор функций заполняющих данные для запроса и вызывающие универсальный запрос
	check_hash(req, res, data, obj, func){ //
		obj.mass = [data.login, obj.hash, obj.role];
		obj.sql = 'SELECT * FROM abonents WHERE login=? AND hash=? AND role=?;';
		this.base(req, res, data, obj, func);
	},
	check_passkey(req, res, data, obj, func){ //
		obj.mass = [data.passkey, obj.role];
		//тут нужно добавить фильтр по времени создания паскей
		obj.sql = 'SELECT * FROM abonents WHERE passkey=? AND role=?;';
		this.base(req, res, data, obj, func);
	},
	session_check(req, res, data, obj, func){ //
		obj.mass = [obj.session, obj.role];
		obj.sql = 'SELECT * FROM abonents WHERE session=? AND role=?;';
		this.base(req, res, data, obj, func);
	},
	write_session(req, res, data, obj, func){
		obj.mass = [obj.session, obj.abonent_number];
		obj.sql = "UPDATE abonents SET session=? WHERE abonent_number=? ";
		this.base(req, res, data, obj, func);
	},
	check_login(req, res, data, obj, func){
		obj.mass = [data.login];
		obj.sql = 'SELECT * FROM abonents WHERE login=?;';
		this.base(req, res, data, obj, func);
	},
	insert_abonent(req, res, data, obj, func){
		obj.mass = [data.login, obj.hash, obj.role,  data.inn, data.name, obj.session];
		obj.sql = "INSERT INTO abonents(login, hash, role,  inn, name, session) VALUES (?, ?, ?, ?, ?, ?)";
		this.base(req, res, data, obj, func);
	},	
	edit_abonent(req, res, data, obj, func){
		obj.mass = [obj.session, obj.abonent_number];
		obj.sql = "UPDATE abonents SET session=? WHERE abonent_number=? ";
		this.base(req, res, data, obj, func);
	},
	base(req, res, data, obj, func){ //базовая функция
		connection.query(obj.sql, obj.mass, function(err, abonent) {
			if(err) console.log(err);
			if(abonent.length){
				obj.abonent=abonent[0];
			} else{
				obj.abonent='';
			}
			func(req, res, data, obj);
		});
	}
}


//преобразование даты
Date.prototype.format = function(format = 'yyyy-mm-dd') {
    const replaces = {
        yyyy: this.getFullYear(),
        mm: ('0'+(this.getMonth() + 1)).slice(-2),
        dd: ('0'+this.getDate()).slice(-2),
        hh: ('0'+this.getHours()).slice(-2),
        MM: ('0'+this.getMinutes()).slice(-2),
        ss: ('0'+this.getSeconds()).slice(-2)
    };
    let result = format;
    for(const replace in replaces){
        result = result.replace(replace,replaces[replace]);
    }
    return result;
};

functions.check_admin();




