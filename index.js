/**
 * require allows you to import a package from a path.
 * require can also work on directory by using dot backslash(./) to path.
 * importing a folder that has index.js can be imported without adding the index.js to it.
 */
const http = require("http");
const express = require("express");
const app = express();
const routes = require("./routes");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const port = 3000;
const { db_url } = require("./config");
const session = require("express-session");
const mongoose = require("mongoose");
const WebSocketServer = require("websocket").server;
app.use(bodyParser.urlencoded({ limit: "10mb" }));
app.use(bodyParser.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(session({ secret: "MY_SECRET_KEY" }));
app.use(routes);
mongoose
	.connect(db_url, { autoIndex: false })
	.then(() => {
		console.log("Mongoose connected!");
	})
	.catch(console.log);

app.listen(port, () => {
	console.log(`Example app listening at http://localhost:${port}`);
});

var server = http.createServer(function (request, response) {
	console.log(new Date() + " Received request for " + request.url);
	response.writeHead(404);
	response.end();
});
server.listen(8080, function () {
	console.log(new Date() + " WebsocketServer is listening on port 8080");
});
wsServer = new WebSocketServer({
	httpServer: server,
	// You should not use autoAcceptConnections for production
	// applications, as it defeats all standard cross-origin protection
	// facilities built into the protocol and the browser.  You should
	// *always* verify the connection's origin and decide whether or not
	// to accept it.
	// autoAcceptConnections: false,
});

function originIsAllowed(origin) {
	// put logic here to detect whether the specified origin is allowed.
	return true;
}
const questions = ["Please where are you?", "Please when did you register?", "Please where are you from?"];
const connections = [];
wsServer.on("request", function (request) {
	if (!originIsAllowed(request.origin)) {
		// Make sure we only accept requests from an allowed origin
		request.reject();
		console.log(new Date() + " Connection from origin " + request.origin + " rejected.");
		return;
	}

	var connection = request.accept("echo-protocol", request.origin);
	console.log(new Date() + " Connection accepted.");
	connections.push({ connection, data: {} });
	connection.on("message", function (message) {
		if (message.type === "utf8") {
			console.log("Received Message: " + message.utf8Data);
			for (let id in connections) {
				const conn = connections[id];
				if (conn.connection == connection) {
					if (!conn.data.answer) conn.data.answer = {};
					if (typeof conn.data.question === "undefined") {
						conn.data.question = 0;
					} else if (conn.data.question == 1) {
						conn.data.answer.name = message.utf8Data;
					} else if (conn.data.question == 2) {
						conn.data.answer.age = message.utf8Data;
					} else if (conn.data.question == 3) {
						conn.data.answer.placeOfBirth = message.utf8Data;
					}
					if (conn.data.question == questions.length + 1) {
						if (message.utf8Data.toLowerCase() == "yes" || message.utf8Data.toLowerCase() == "y") {
							conn.data.question = 0;
						} else {
							connection.sendUTF("Thank you for answering our questions do you wish to answer again?");
							return;
						}
					}

					if (conn.data.question == questions.length) {
						const answer = conn.data.answer;
						connection.sendUTF(
							`Your name is ${answer.name}, you are ${answer.age} years old, you were born in ${answer.placeOfBirth}.`,
						);
						connection.sendUTF("Thank you for answering our questions do you wish to answer again?");
						conn.data.question++;
						return;
					}

					conn.data.question++;
					connection.sendUTF(questions[conn.data.question - 1]);
					return;
				}
			}
			connection.sendUTF(message.utf8Data);
		} else if (message.type === "binary") {
			console.log("Received Binary Message of " + message.binaryData.length + " bytes");
			connection.sendBytes(message.binaryData);
		}
	});
	connection.on("close", function (reasonCode, description) {
		console.log(new Date() + " Peer " + connection.remoteAddress + " disconnected.");
	});
});
