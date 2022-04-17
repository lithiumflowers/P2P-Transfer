const static = require('node-static');
const https = require('https');
const file = new(static.Server)();
const app = https.createServer(function (req, res) {
  file.serve(req, res);
}).listen(8080);

const io = require('socket.io').listen(app); //侦听8080

io.sockets.on('connection', (socket) => {

  // 便于函数记录服务器消息至客户端
  function log(){ 
    const array = ['>>> Message from server: ']; 
    for (var i = 0; i < arguments.length; i++) {
      array.push(arguments[i]);
    } 
      socket.emit('log', array);
  }

  socket.on('message', (message) => { //收到message时，进行广播
    log('Got message:', message);
    socket.broadcast.emit('message', message); //在真实的应用中，应该只在房间内广播
  });

  socket.on('create or join', (room) => { //收到 “create or join” 消息

    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0; //房间里的人数

    log('Room ' + room + ' has ' + numClients + ' client(s)');
    log('Request to create or join room ' + room);

    if (numClients === 0){ //如果房间里没人
      socket.join(room);
      socket.emit('created', room); //发送 "created" 消息
    } else if (numClients === 1) { //如果房间里有一个人
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room); //发送 “joined”消息
    } else { // max two clients
      socket.emit('full', room); //发送 "full" 消息
    }
    socket.emit('emit(): client ' + socket.id +
      ' joined room ' + room);
    socket.broadcast.emit('broadcast(): client ' + socket.id +
      ' joined room ' + room);

  });

  socket.on('message', function(message) {
    socket.broadcast.emit('message', message);
});

});