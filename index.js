const express = require('express');
const { Server } = require('ws');
const volleyball = require('volleyball');
const cors = require('cors');
const methodOverride = require('method-override')

const connectDB = require('./config/db')

// Load config
require('dotenv').config({ path: './config/config.env' })

// Initiate express
const app = express();

// Import our modules
const auth = require('./auth');
const privateApi = require('./privateApi');
const publicApi = require('./publicAPI');


// Connect to cloud hosted MongoDB
connectDB()


// Dev tools
app.use(volleyball);


// Network security
app.use(cors());


// Body parser
app.use(express.urlencoded({ extended: false }))
app.use(express.json())


// Method override
app.use(
  methodOverride(function (req, res) {
    if (req.body && typeof req.body === 'object' && '_method' in req.body) {
      // look in urlencoded POST bodies and delete it
      let method = req.body._method
      delete req.body._method
      return method
    }
  })
)


// Routes
app.get('/', (req, res) => {
  return res.json({
    message: 'Hello World!',
  });
});

app.use('/auth', auth.router);
app.use('/api/v0', publicApi);
app.use('/api/v1', privateApi);


const port = process.env.PORT || 5000;
const server = app.listen(port, () => {
  console.log('Listening on port', port);
});


// Create websocket connection
const wss = new Server({ server: server, path: '/ws' });

// save connected users in memory
let connectedUsers = [];

app.get('/connectedUsers', (req, res) => {
  return res.json({
    connectedUsers: connectedUsers
  });
});

wss.on('connection', (socket, request) => {
  const params = request.url?.split('?')[1].split('/');
  const userId = params[0];
  const userSession = params[1];

  connectedUsers[userId] = {
    ...connectedUsers[userId],
    [userSession]: socket
  }

  socket.on('close', () => delete connectedUsers[userId][userSession])
})

const broadcast_except = (userId, userSession, message) => {
  const user = connectedUsers[userId]?.[userSession];

  wss.clients.forEach((client) => {
    if( client !== user ) client.send(JSON.stringify( message ))
  });
}

const broadcast_all = (message) => {
  wss.clients.forEach((client) => {
    client.send(JSON.stringify( message ))
  });
}

const broadcast_toAllUserSessions = (userId, message) => {
  Object.values(connectedUsers[userId]).forEach((session) => {
    session.send(JSON.stringify( message ));
  });
}


// Error Handler
const e = require('./errors');

function errorHandler(err, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: err.stack
  });
}

app.use(e.respondError404_router);
app.use(errorHandler);

module.exports = {
  broadcast_except,
  // broadcast_except_two,
  broadcast_all,
  broadcast_toAllUserSessions
}