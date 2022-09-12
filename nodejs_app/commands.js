 
module.exports.first = function(name){
	tut(name, this.second);
}
module.exports.second = function(name){
	console.log(name);
}