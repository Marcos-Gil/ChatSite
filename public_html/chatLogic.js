/*
By: Marcos Gil
Purpose: JavaScript file sourced in my server that contains my functions
*/

$(document).ready(function(){
		
	var userName = prompt("What's your name?")||"User";
	
	var socket = io(); //connect to the server that sent this page
	
	socket.on('connect', function(){
		
		socket.emit("intro", userName);
	});
	
	$('#inputText').keypress(function(ev){ // this is where the messages are sent and they press enter
			
			if(ev.which===13){
				//send message
				socket.emit("message",$(this).val());
				ev.preventDefault(); //if any
				$("#chatLog").append((new Date()).toLocaleTimeString()+", "+userName+": "+$(this).val()+"\n")
				$(this).val(""); //empty the input
			}
	});

	socket.on("message",function(data){
		
		$("#chatLog").append(data+"\n");
		$('#chatLog')[0].scrollTop=$('#chatLog')[0].scrollHeight; //scroll to the bottom
	});

	socket.on("userList", function(data){
		
		$("#userList").empty();

		for (var i = 0;  i < data.length; i++){
			$("#userList").append("<li id = '" + i +"' data-name= '" + data[i] + "'>"+ data[i] + "</li>"); // Giving our ID a data value of name to be accessed later in our event listener
			$("#" + i ).dblclick(function(ev){ // Giving each list item a double click listener 

				var currentListElement = $(this);
				var messageInfo = {};
				var blockInfo = {};
				messageInfo.username = currentListElement.data('name');
				blockInfo.username = currentListElement.data('name');

				if (ev.ctrlKey === true){ // Checking to see if the ctrl key is held down, in which case the user becomes blocked/unblocked
					
					socket.emit("blockUser", blockInfo);
				}
				else{ // else we prompt the user for the message they want to private message and emit it to the server with the username
					
					var privMessage = prompt("Message to '"+ currentListElement.data('name') +"': ");
					messageInfo.message = privMessage;

					socket.emit("privateMessage", messageInfo);
				}
			});
		}
	});

	socket.on("privateMessage", function(data){
		
		var sender = data.username;
		var message = data.message;

		var response = prompt("PM from " + sender + ": " + message); // show user the message and prompt them for a response at the same time

		var newMessage = {};
		newMessage.username = sender;
		newMessage.message = response;

		if (response === ""){ // If the user doesn't enter a response, nothing happens
		
			return;
		}
		else{ // We emit the message

			socket.emit("privateMessage", newMessage);
		}

	});
});