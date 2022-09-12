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

//---------------------------------------работа с базой образцы ------------------------
let mass = [25, "matrix iii-i", "reader", 66, 50];
let sql = "INSERT INTO goods(article_key, title, description, price_retail, price_wholesale ) VALUES(?, ?, ?, ?, ?)";
//query_do(sql, mass);
sql = "SELECT * FROM goods WHERE title=? AND article_key<?";
mass = ["z5r", 29];
//query_do(sql, mass);
function query_do(sql, mass){
	connection.query(sql, mass, function(err, results) {
		if(err) console.log(err);
		console.log(results);
	});
}
//---------------------------------------работа с базой образцы ------------------------

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
			obj.data = JSON.parse(body); 
			switches.check_session (req, res, obj);
        } catch (e) {
            console.error(e);
        }
        res.on('error', function(err) {
            console.error(err);
        });
    });	
}

let switches = {
	check_session (req, res, obj){
		obj.url=path.basename(req.url);
		console.log("role_url - "+obj.url);
		console.log("command - "+obj.data.command);
		if('session' in obj.data){ 
			let mass = [obj.data.session];
			let sql = 'SELECT * FROM abonents WHERE session=?;'
			connection.query(sql, mass, function(err, abonent) {
				if(err) console.log(err);
				if(abonent.role!=obj.url){
					commands.answer_send(res, "no this role");
				}	
				if(obj.data.command in commands){
					obj.abonent=abonent;
					commands[obj.data.command](req, res, obj);
				} else {
					commands.answer_send(res, "no this command");
				}

			});
		}else{
			if(obj.data.command in commands){
				obj.abonent="no";
				commands[obj.data.command](req, res, obj);
			} else {
				commands.answer_send(res, "no this command");
			}
		}
	}
};

let requests = {
	insert_user(req, res, obj){
		let user = [obj.data.login, "user", "1234", "6789", "Tom"];
		let sql = "INSERT INTO abonents(login, role, passkey, hash, name) VALUES (?, ?, ?, ?, ?)";
		connection.query(sql, user, function(err, results) {
			if(err) console.log(err);
			commands.answer_send(res, results);
		});
		
	}	
}

let commands = {
	new_abonent(req, res, obj){
		if("login" in obj.data){
			if(obj.data.login.length>5){
				mass = [obj.data.login];
				sql = 'SELECT * FROM abonents WHERE login=?;'
				connection.query(sql, mass, function(err, abonent) {
					if(err) console.log(err);
					if(!abonent.length){
						requests.insert_user(req, res, obj);
					} else{
						commands.answer_send(res, "duplicate login");
					}
				});
			} else{
				commands.answer_send(res, "short login");
			}
		} else{
			commands.answer_send(res, "no login");
		}
	},
	
	new_abonent_old(req, res, obj, abonent, role_url){
		console.log("new_abonent_ok");
		if(abonent!=[]){
			console.log("no the abonent");	
		}
		if(!('passkey' in obj)){
			console.log("no the passkey");	
		}
		switch(role_url) {
			case "user":
				console.log("user");
				break;
			case "seller":
				console.log("seller"); 
				break;
			case "manager":
				console.log("manager");   
				break;
			case "admin":
				console.log("admin");   
				break;
			default:
				commands.answer_send(res, "no the role");
		}
		commands.answer_send(res, "end abonent");
	},
	answer_send(res, msg){
		res.writeHead(200);
		if(typeof(msg)=="object"){
			res.end(JSON.stringify(msg));
			console.log("send object");
		}else{
			res.end(msg);
			console.log(msg);
		}
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

//-----------------------------------пример создания UID ------------------------
function ud(){
	uid(18).then(function (str) {
	  console.log('async');
	  console.log(str);  
	})
}
//ud();
//-----------------------------------пример создания UID ------------------------


