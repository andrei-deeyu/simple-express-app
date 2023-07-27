const express = require('express');
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

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log('Listening on port', port);
});