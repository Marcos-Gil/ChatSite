/*
By: Marcos Gil
Purpose: Server side code
*/

// Making sure we have all the necessary requirements for our code
var http = require('http').createServer(handler);
var io = require('socket.io')(http);
var fs = require('fs');
var mime = require('mime-types');
var url = require('url');

var clients = []; // empty list where we will keep track of the clients 

const ROOT = "./public_html"; // our root

http.listen(3000);
console.log("Chat server listening on port 3000");


function handler(req,res){

	console.log(req.method+" request for: "+req.url);
	
	var urlObj = url.parse(req.url,true);
	var filename = ROOT+urlObj.pathname;
	
	fs.stat(filename,function(err, stats){
			
		if(err){
			
			respondErr(err);
		}
		else{
			
			if(stats.isDirectory())	filename+="/chatRoom_final.html";
	
			fs.readFile(filename,"utf8",function(err, data){
				
				if(err)respondErr(err);
				else respond(200,data);
			});
		}
	});

	function serve404(){
		
		fs.readFile(ROOT+"/404.html","utf8",function(err,data){
			
			if(err)respond(500,err.message);
			else respond(404,data);
		});
	}
		
	function respondErr(err){
		
		console.log("Handling error: ",err);
		
		if(err.code==="ENOENT"){
			
			serve404();
		}
		else{
			
			respond(500,err.message);
		}
	}
		
	function respond(code, data){
		
		res.writeHead(code, {'content-type': mime.lookup(filename)|| 'text/html'});
		res.end(data);
	}
};



io.on("connection", function(socket){
	console.log("Got a connection");

	socket.on("intro",function(data){
		
		socket.username = data; // attaches the username to the socket object
		socket.blockList = []; // attaches an empty array that will hold the names of the users who have this socket blocked
		socket.broadcast.emit("message", timestamp()+": "+socket.username+" has entered the chatroom.");
		socket.emit("message","Welcome, "+socket.username+".");
		clients.push(socket);
		io.emit("userList", getUserList()); // broadcasting a message, io is our socket.io server
	});
	
	// message handler
	socket.on("message", function(data){
		
		console.log("got message: "+data); // logging the message in console
		
		for (var i = 0; i < clients.length; i++){ // looping through clients array

			if (socket.blockList.indexOf(clients[i].username) === -1 && clients[i].username !== socket.username){ //If the current client isn't in my blockList and i'm not interacting with myself

				console.log(timestamp());
				clients[i].emit("message", timestamp()+", "+socket.username+": "+data); // emit message to client side
			}
			else{

				console.log("Message ignored!");	
			}
		}
	});

	// diconnect handler
	socket.on("disconnect", function(){
		
		console.log(socket.username+" disconnected");
		io.emit("message", timestamp()+": "+socket.username+" disconnected.");

		clients = clients.filter(function(ele){  
       		
       		return ele!==socket;
		});

		io.emit("userList", getUserList());
	});

	// private message handler
	socket.on("privateMessage", function(data){

		// Data recieved from client
		var userGettingMessage = data.username;
		var privateMessage = data.message;
	
		for (var i = 0; i < socket.blockList.length; i++){

			if (userGettingMessage === socket.blockList[i]){ // If the user getting the message is in this sockets blockList, nothing is done
				
				return;
			}
		}
		
		for (var i = 0; i < clients.length; i++){
			
			if (clients[i].username === userGettingMessage){ // If the user getting the message in the clients array, we emit the message to them
				
				var messageSent = {};
				messageSent.username = socket.username;
				messageSent.message = privateMessage;
				clients[i].emit("privateMessage", messageSent);
			}
		}
	});

	socket.on("blockUser", function(data){

		var blockedUserFound = 0; // Flag used to see if the user is currently blocked
		var indexToRemove = null; // The index of this user in the blockList array so we know where to remove them
		
		var client; // Variable that will hold the client with the blockList we want to look at

		for (var k = 0; k < clients.length; k++){

			if (clients[k].username === data.username){ // finding the specific client we are looking for to user their blockList

				client = clients[k];
			}
		}

		for (var i =0; i < client.blockList.length; i++){

			if (client.blockList[i] === socket.username){ // If the user is in the person sending the messages blockList
				
				indexToRemove = socket.blockList.indexOf(data.username);
				blockedUserFound  = 1;
			}
		}

		if (blockedUserFound === 1){// If they already were, let the user know that they have now unblocked them
			
			socket.emit("message", "You have unblocked " + data.username + " and can now see/recieve chat and private messages from them!");
			client.blockList.splice(indexToRemove, 1);
		}
		else{ // Let the user know they have now blocked this person, and aadd them to the clients blockList
			
			socket.emit("message", "You have blocked " + data.username + " and will no longer see their messages in chat or recieve private messages from them!");
			client.blockList.push(socket.username);
		}
	});
});

function getUserList(){
    
    var ret = [];
    
    for(var i=0;i<clients.length;i++){
      
        ret.push(clients[i].username);
    }
    
    return ret;
}

function timestamp(){
	
	return new Date().toLocaleTimeString();
}