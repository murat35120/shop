var request={    
    //отправляем запрос
    request_do (url, obj){
        obj1=JSON.stringify(obj);
        manager.req=new XMLHttpRequest();
        manager.req.addEventListener('load', this.show_request);
        manager.req.open('POST', url, true);
        manager.req.responseType = 'text';
        manager.req.send(obj1);
    },
    // получаем ответ
    show_request(e){
        var data=e.target;
        if(data.status==200){
            control.answer(data.response);
        } else {
            console.log('no answer');
        }
    }
}

var links={
    //создаем указатели на поля ввода и вывода
    new_link (obj, name){ //объект хранения резудьтата, имя параметра
        var list=document.querySelectorAll('div[data-'+name+']'); 
        links.iterate_link (obj, list, name);
        list=document.querySelectorAll('input[data-'+name+']'); 
        links.iterate_link (obj, list, name);
        list=document.querySelectorAll('trexarea[data-'+name+']'); 
        links.iterate_link (obj, list, name);       
    },
    //перебираем массив ссылок
    iterate_link (obj, list, name){ //объект хранения резудьтата, имя параметра
        for ( var i = 0; i < list.length; i++){
            if(list[i].dataset[name]){
                obj[list[i].dataset[name]]=list[i];
            }
        }
    },
    // связываем нажатие  кнопки и выполнение функции
    call_func (e){ //объект хранения резудьтата, имя параметра
        var link=e.target;
        var name=link.dataset.action;
        if(name){ //функции без параметров
            control[name]();    
        }
        name=link.parentNode.parentNode.dataset.action_item;
        if(name){ //функции с указанием пути к нажатой кнопке
            control[name](link); 
        }        
    },    
   //заполняем форму
    obj_append(o_in, o_out){
        for (var key in o_out){ //перебираем исходный объект
             o_in.append(key, links.val(o_out[key]));
        }
    },
    //заполняем объект
    obj_add(o_in, o_out){
        for (var key in o_out){ //перебираем исходный объект
             o_in[key]= links.val(o_out[key]);
        }
    },
    //заполняем массив
    mas_add(o_in, o_out){
        for (var key in o_out){ //перебираем исходный объект
             o_in[o_in.length] = links.val(o_out[key]);
        }
    },    
    
    // из оъбекта  в объект
    obj_obj(o_in, o_out){
        for (var key in o_out){ //перебираем исходный объект
            if(o_in[key]!==undefined){ //еслы в получателе есть значение с таким ключом
                links.set_val(o_in, key, o_out[key])
            }
        }
    },
    //получаем значение в зависимости от типа элемента
    val(el){
        var ss=el.nodeName;
        var temp;
        if(ss==undefined){
            temp=el;
        }
        if(ss=='DIV'){
            temp=el.innerText;
        }
        if(ss=='INPUT' || ss=="TEXTAREA"){
            temp=el.value;
        }
        return temp;
    },
    // присваиваем значение в зависимости от типа элемента
    set_val(el_in, key, el_out){
        var ss=el_in[key].nodeName;
        //console.log (typeof el_in[key]);
        var temp=links.val(el_out);
        if(ss==undefined){
            el_in[key]=temp;
        }
        if(ss=='DIV'){
            el_in[key].innerText=temp;
        }
        if(ss=='INPUT' || ss=="TEXTAREA"){
            el_in[key].value=temp;
        }
    }    
}

var passnum;
var abonent= {
	main:{
		api_key:'2315627893',
        command: "old_abonent",
        data: []
	},
	data:{
		inn: '',
		order_number:'',
		order:[],
		email:'',
		phone: '',
		address:''	
	},
	order:{
		code:'',
		piece:'',
		price:'',
	}
}

var manager= {
    req: {},
    links:[], //массив ссылок на активные поля
    start (){ 
        links.new_link (manager.links, "value"); //заполняем ссылки
    }
}



var control= {
	add(){
		links.obj_obj(abonent.order, manager.links);
		abonent.data.order.push(abonent.order);
		links.obj_obj(abonent.data, manager.links);
		abonent.main.data=abonent.data;	
		abonent.main.command=manager.links.command.value;
		manager.links.for_result.innerText=JSON.stringify(abonent.main);
	},
	send(){
		request.request_do ("", abonent.main); //"../admin"
		abonent.data.order=[];
	},
	answer(ans){
		//let obj=JSON.parse(ans);
		manager.links.for_result.innerText=ans;
		
	}
   
}



manager.start();
// устанавливаем все слушатели
document.addEventListener('mousedown', links.call_func);