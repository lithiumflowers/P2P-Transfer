const static = require('node-static');
const https = require('https');
const file = new(static.Server)();
const app = https.createServer(function (req, res) {
  file.serve(req, res);
}).listen(8080);

const io = require('socket.io').listen(app); 