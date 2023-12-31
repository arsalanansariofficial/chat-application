const users = [];

const addUser = (id, username, room) => {
    username = username.trim().toLowerCase();
    room = room.trim().toLowerCase();

    if (!username || !room)
        return {error: 'Username and Room are required'};

    const existingUser = users.find(user => {
        return user.username === username && user.room === room;
    });

    if (existingUser)
        return {error: `${username} already in use`};

    const user = {id, username, room}
    users.push({id, username, room});
    return {user};
}

const removeUser = id => {
    const index = users.findIndex(user => user.id === id);

    if (index !== -1)
        return users.splice(index, 1)[0];
}

const getUser = id => users.find(user => user.id === id);

const getUsersInRoom = room => users.filter(user => user.room === room.trim().toLowerCase());

module.exports = {addUser, removeUser, getUser, getUsersInRoom};
