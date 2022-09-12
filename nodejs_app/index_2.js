const http = require('http');
const fs = require('fs'); //работа с файлами
const path = require('path'); //работа с путями
const os = require('os');

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

const {scryptSync,} = require('node:crypto');
const salt="version 01";

const roles=["buyer", "seller", "manager", "admin"];
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
// тестирование подключения
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

//1  "new_abonent" -> "buyer"
//2  "error message"


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
			obj.data = JSON.parse(body);
			obj.role=path.basename(req.url);
			if(roles.includes(obj.role)){
				if(obj.data.command="new_abonent"){
					if(obj.role=="buyer"){
						if(inns.has(obj.data.inn)){
							functions.check_login(req, res, obj);
						}else{
							functions.answer_send(res, "no the INN");
						}
					}else{ //все остальные
						functions.check_passkey(req, res, obj);
					}
				}else{
					functions.need_session(req, res, obj);
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

let functions={
	need_session(req, res, obj){
		if(obj.data.session){
			mass = [obj.data.session];
			sql = 'SELECT * FROM abonents WHERE session=?;'
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
			console.log("send object");
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
				sql = 'SELECT * FROM abonents WHERE login=?;'
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
				sql = 'SELECT * FROM abonents WHERE passkey=?;'
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
	session_check(req, res, obj){ // 1_
		mass = [obj.session];
		sql = 'SELECT * FROM abonents WHERE session=?;'
		connection.query(sql, mass, function(err, abonent) {
			if(err) console.log(err);
			if(abonent.length){
				functions.new_session(req, res, obj);
			} else{				
				if(obj.data.command=="new_abonent"){
					functions.insert_abonent(req, res, obj);
				}else{
					//другие команды
					functions.answer_send(res, "difrent commands");
				}				
			}
		});
	},
	new_session(req, res, obj){ // 1_
		uid(18).then(function (str) {
			obj.session=str;
			functions.session_check(req, res, obj);  
		})
	},
	insert_abonent(req, res, obj){ // 1_
		let abonent={};
		let hash=scryptSync(obj.data.password, salt, 32).toString('hex');
		if(obj.role=="buyer"){
			abonent = [obj.data.login, hash, "buyer", "1", obj.data.inn, obj.data.name, obj.session];
		}else{
			//другие роли
			functions.answer_send(res, "difrent roles");
		}
		console.log(obj.data.login);
		let sql = "INSERT INTO abonents(login, hash, role, passkey, inn, name, session) VALUES (?, ?, ?, ?, ?, ?, ?)";
		connection.query(sql, abonent, function(err, results) {
			if(err) console.log(err);
			functions.answer_send(res, obj.session); //тут нужно вставить ответ в зависимости от функции
		});
	}
}

let commands = {
	new_abonent(req, res, obj){
		switch(obj.role) {
			case "buyer":
				console.log("buyer"); //проверяем инн
				if("inn" in obj.data){
					console.log(obj.data.inn);
					if(inns.has(obj.data.inn)){
						functions.check_login(req, res, obj);
					}
				} else{
					functions.answer_send(res, "the inn is incorrect");
				}
				break;
			default:
				functions.check_passkey(req, res, obj);
		}
	},


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




