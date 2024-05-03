const socket = io();

// HTML Elements
const messageForm = document.querySelector('#message-form');
const messageFormInput = messageForm.querySelector('input');
const messageFormButton = messageForm.querySelector('button');
const sendLocationButton = document.querySelector('#send-location');
const sidebar = document.querySelector('#side-bar');
const messages = document.querySelector('#messages');

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML;
const messageConfirmationTemplate = document.querySelector('#message-confirmation-template').innerHTML;
const locationTemplate = document.querySelector('#location-template').innerHTML;
const sidebarTemplate = document.querySelector('#side-bar-template').innerHTML;

// Focus input
messageFormInput.focus();

// Options
const {username, room} = Qs.parse(location.search, {ignoreQueryPrefix: true});

const autoScroll = () => {

    // New message
    const newMessage = messages.lastElementChild;

    // Calculates height of the new message
    const newMessageStyles = getComputedStyle(newMessage);
    const newMessageMargin = parseInt(newMessageStyles.marginBottom);
    const newMessageHeight = newMessage.offsetHeight + newMessageMargin;

    // Get messages visible height
    const visibleHeight = messages.offsetHeight;

    // Get messages total height
    const totalHeight = messages.scrollHeight;

    // Get scrollbar distance
    const scrollbarDistance = Math.ceil(messages.scrollTop + visibleHeight);

    if (totalHeight - newMessageHeight <= scrollbarDistance) {
        messages.scrollTop = messages.scrollHeight;
    }
}


socket.on('messageToClient', message => {
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.message,
        createdAt: moment(message.createdAt).format('h:mm a')
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('locationToClient', location => {
    console.log(location);
    const html = Mustache.render(locationTemplate, {
        username: location.username,
        url: location.url,
        createdAt: moment(location.createdAt).format('h:mm a')
    });
    messages.insertAdjacentHTML('beforeend', html);
    autoScroll();
});

socket.on('roomDataToClient', ({room, users}) => {
    sidebar.innerHTML = Mustache.render(sidebarTemplate, {room, users});
});

messageForm.addEventListener('submit', event => {
    event.preventDefault();
    messageFormButton.setAttribute('disabled', 'disabled');
    const newMessage = event.target['elements'].message.value;
    const callback = (response) => {
        const status = Mustache.render(messageConfirmationTemplate, {
          confirmation: response.message,
          createdAt: moment(response.createdAt).format('h:mm a')
        })
        messageFormInput.focus();
        messageFormInput.value = String();
        messageFormButton.removeAttribute('disabled');
        document.querySelector('.message:last-of-type').insertAdjacentHTML('beforeend', status)
    }
    socket.emit('messageToServer', newMessage, callback);
});

sendLocationButton.addEventListener('click', () => {
    if (!navigator.geolocation)
        return alert('Your browser does not support geo location');
    sendLocationButton.setAttribute('disabled', 'disabled');
    navigator.geolocation.getCurrentPosition(position => {
        const location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
        }
        const callback = () => {
            return sendLocationButton.removeAttribute('disabled');
        }
        socket.emit('locationToServer', location, callback);
    });
});

socket.emit('join', {username, room}, error => {
    if (error) {
        alert(error);
        location.href = '/';
    }
});
