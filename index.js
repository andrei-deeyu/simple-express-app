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
const api = require('./api');
const publicApi = require('./publicAPI');


// Connect to cloud hosted MongoDB
connectDB()

app.use(volleyball);
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

app.get('/', (req, res) => {
  return res.json({
    message: 'Hello World!',
  });
});

app.use('/auth', auth)
app.use('/api/v1', api); // require authorization
app.use('/api/v0', publicApi) // doesn't require authorization


function notFound(req, res, next) {
  res.status(404);
  const error = new Error('Not Found - ' + req.originalUrl);
  next(error);
}

function errorHandler(err, req, res, next) {
  res.status(res.statusCode || 500);
  res.json({
    message: err.message,
    stack: err.stack
  });
}

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log('Listening on port', port);
});