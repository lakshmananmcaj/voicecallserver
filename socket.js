const cors = require("cors");

//const io = require("socket.io")(httpServer, 

const { Server } = require('socket.io');
let IO;
const {Users} = require('./utils/users');
let users = new Users();

const {isRealString} = require('./utils/isRealString');
//const {Users} = require('./utils/users');


module.exports.initIO = (httpServer) => {
    io = new Server(httpServer,{
        cors: {
          origin: "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        }
      });

    io.use((socket, next) => {
        if (socket.handshake.query) {
            let userName = socket.handshake.query.name
            socket.user = userName;
            next();
        }
    })
   
    //io.of('/programer').on('connection', function (socket) {

io.on('connection', (socket) => {
    console.log("A new user just connected");
  
    socket.emit('greeting-from-server', {
        greeting: 'Hello Client'
    });
    socket.on('greeting-from-client', function (message) {
      console.log(message);
    });
    
    socket.on('join', (params, callback) => {
       if(!isRealString(params.name) || !isRealString(params.room)){
         return callback('Name and room are required');
       }
      
      let stsCall='Free';
      socket.join(params.room);
      //users.removeUser(socket.id);
      users.addUser(socket.id, params.name, params.room,"NA");
      //socket.broadcast.emit('user-connected', params.name) // Tell everyone else in the room that we joined

      socket.user=params.room;
     // io.to(params.room).emit('updateUsersList', users.getUserList(params.room));
      io.to(socket.user).emit('updateUsersList', users.getUserList(socket.user,'NA'));

      callback();
    })

  //  console.log(socket.user, "Connected");
    socket.join(socket.user);

    /* voicecall code started */
    
    socket.on('callTo', (data) => {
      let callee = data.name;
      let rtcMessage = data.rtcMessage;
      let myRoom=data.myRoom;
           
      socket.to(callee).emit("newCall", {
          caller: data.userCallFrom, //socket.user,         
          rtcMessage: rtcMessage,
          myRoom: myRoom
      })
  
    })

   // create room manually
    socket.on('create', function (room1) {
      console.log("joined room " + room1);
      socket.join(room1);
      let rooms = io.sockets.adapter.rooms //io.sockets.adapter.rooms.has(roomIdentifier)
      let user = users.getUser(socket.id);    
      io.to(user.room).emit('updateUsersList', users.getUserList(user.room,user.stsCall));
     

    });


    //:RE-JOIN:Client Room
  socket.on('subscribe',function(room){  
    try{
      console.log('[socket]','join room :',room)
      socket.join(room);
      let user = users.getUser(socket.id);
      user.stsCall="NA";
      console.log('[user]','user :',user)
      io.to(user.room).emit('updateUsersList', users.getUserList(user.room,user.stsCall));
     }catch(e){
      console.log('[error]','join room :',e);
      socket.emit('error','couldnt perform requested action');
    }
  })

  //:LEAVE:Client Room
  socket.on('unsubscribe',function(room){  
    try{
      console.log('[socket]','leave room :', room);
      //console.log('[socket]','socket.id :', socket.id);
      let user = users.getUser(socket.id);
      user.stsCall="InCall";
      io.to(user.room).emit('updateUsersList', users.getUserList(user.room,user.stsCall));
     
    }catch(e){
      console.log('[error]','leave room :', e);
      socket.emit('error','couldnt perform requested action');
    }
  })
   
    

  socket.on("newMsg",(data) => {
      console.log(`new message recevied from the user: ${data.username}`);
  });

  socket.on("endCall", (data) => {
      let caller = data.caller;
      rtcMessage = data.rtcMessage

      socket.to(caller).emit("callEnded", {
        callee: socket.user,
        rtcMessage: rtcMessage
      })     
  })
 
  socket.on("rejectCallTo", (data) => {
    let caller = data.caller;
    rtcMessage = data.rtcMessage

    socket.to(caller).emit("callRejected", {
      callee: socket.user,
      rtcMessage: rtcMessage
    })     
  })

  socket.on('answerCall', (data) => {
        let caller = data.caller;
        rtcMessage = data.rtcMessage
  
        socket.to(caller).emit("callAnswered", {
            callee: socket.user,
            rtcMessage: rtcMessage
        })
  })
  
  socket.on('ICEcandidate', (data) => {
        let otherUser = data.user;
        let rtcMessage = data.rtcMessage;
  
        socket.to(otherUser).emit("ICEcandidate", {
            sender: socket.user,
            rtcMessage: rtcMessage
        })
  })
    
   // Here we emit our custom event
  socket.on('forceDisconnect', () => {
      io.emit('myCustomEvent', {customEvent: 'Custom Message'})
      socket.disconnect();
      console.log('Socket disconnected: ' + socket.user)
  })

  
    /* voicecall code end */
  /*  socket.on('reconnect', () => {
      socket.emit('subscribe', 'programmer')
   })*/

  socket.on('disconnect', () => {
      let user = users.removeUser(socket.id);
     // auth.signOut();
     // alert("signed out");
    //  sessionStorage.clear() 
      if(user){
        io.to(user.room).emit('updateUsersList', users.getUserList(user.room));
       // io.to(user.room).emit('endCall', stop());
      //  io.to(user.room).emit('newMessage', generateMessage('Admin', `${user.name} has left ${user.room} chat room.`))

      }
  });
   
  
  })
}
  module.exports.getIO = () => {
    if (!io) {
        throw Error("IO not initilized.")
    } else {
        return io;
    }
}