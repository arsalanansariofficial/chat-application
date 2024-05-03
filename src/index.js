const port = process.env.PORT || 3000;
const path = require("path");
const publicDirectory = path.join(__dirname, '../public');
const http = require("http");
const express = require("express");
const socketIo = require("socket.io");
const { generateMessage, generateLocationMessage } = require("./utils/message");
const { addUser, removeUser, getUser, getUsersInRoom } = require("./utils/users");

const app = express();
app.use(express.static(publicDirectory));

const server = http.createServer(app);
const io = socketIo(server);

io.on('connection', (socket) => {
    socket.on('join', ({ username, room }, callback) => {
        const { error, user } = addUser(socket.id, username, room);
        if (error)
            return callback(error);
        socket.join(user.room);
        socket.emit('messageToClient', generateMessage('Admin', 'welcome'));
        socket['broadcast'].to(user.room).emit('messageToClient', generateMessage('Admin', `${user.username} has joined`));
        io.to(user.room).emit('roomDataToClient', {
            room: user.room,
            users: getUsersInRoom(user.room)
        });
    });

    socket.on('messageToServer', (message, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('messageToClient', generateMessage(user.username, message));
        callback(generateMessage(user.username, 'sent'));
    });

    socket.on('locationToServer', ({ latitude, longitude }, callback) => {
        const user = getUser(socket.id);
        io.to(user.room).emit('locationToClient', generateLocationMessage(user.username, `https://google.com/maps?q=${latitude},${longitude}`));
        callback();
    });

    socket.on('disconnect', () => {
        const user = removeUser(socket.id);
        if (user) {
            io.to(user.room).emit('messageToClient', generateMessage('Admin', `${user.username} has left`));
            io.to(user.room).emit('roomDataToClient', {
                room: user.room,
                users: getUsersInRoom(user.room)
            });
        }
    });
});

server.listen(port, () => {
    console.log(`Server is up on port ${port}`);
});
