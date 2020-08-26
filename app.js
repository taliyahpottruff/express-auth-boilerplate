const dotenv = require('dotenv');
dotenv.config();

// EXPRESS SETUP
const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// MONGODB SETUP
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const assert = require('assert');
const db_url = `${process.env.DB_URL}/${process.env.DB_NAME}`;
const db_name = process.env.DB_NAME;
var db;
var users;

// Config
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Middleware
app.use((req, res, next) => {
    // Log each request
    console.log(`${req.method} ${req.url}`);

    // Pass the user database
    req.users = users;

    next();
});

// Routes
const auth = require('./api/auth');
app.use('/api/auth', auth);

// Base Route
app.get('/', (req, res) => {
    res.send("Hello world!");
});

app.listen(port, () => {
    console.log(`~ Back-end running on port ${port}`);
    MongoClient.connect(db_url, {useUnifiedTopology: true}, async (err, client) => {
        try {
            assert.equal(null, err);
            console.log('~ DATABASE CONNECTION: SUCCESS');

            db = client.db(db_name);
            users = db.collection('users');
        } catch (err) {
            console.error(err);
        }
    });
});