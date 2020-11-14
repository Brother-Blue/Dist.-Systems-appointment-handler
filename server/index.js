const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const morgan = require('morgan');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const router = require('router');

// Configure env file use
dotenv.config();

// Connect to MongoDB
mongoose.connecct(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}, (err) => {
    if (err) {
        console.error(' >> Failed to connect to MongoDB.');
        console.error(err.stack);
        process.exit(1);
    }
    console.log(' >> Connected to MongoDB.');
});

// Create Express app
var app = express();

// Parse json body requests
app.use(bodyParser.json());

// Logger
app.use(morgan('dev'));

// Cross Origin Resource Sharing
app.options('*', cors());
app.use(cors());

// Import routes
app.get('/api', (req, res) => {
    res.json({'message': 'Hello <3'});
});

// Route middlewares
app.use('/api', router);

// Catch all missing endpoints
app.use('/api/*', (req, res) => {
    res.status(404).json({'message': 'Not found.'});
});

// Serve static files
var root = path.normalize(__dirname + '/..');
var client = path.join(root, 'client', 'dist');
app.use(express.static(client));

// Start and listen to connection
app.listen(process.env.PORT, (err) => {
    if (err) throw err;
    console.log(` >> Server listening on port ${process.env.PORT}`);
    console.log(` >> Backend: http://localhost:${process.env.PORT}/api/`);
});

module.exports = app;