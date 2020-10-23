require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const bcrypt = require('bcrypt');
const passport = require('passport');
const initPassport = require('./passport-config');
const flash = require('express-flash');
const session = require('express-session');
const methodOverride = require('method-override');
const morgan = require('morgan');

// MONGODB SETUP
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const assert = require('assert');
const db_url = `${process.env.DB_URL}/${process.env.DB_NAME}`;
const db_name = process.env.DB_NAME;
var db;
var users;

// View engine
app.set('view engine', 'ejs');

// Config
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(flash());
app.use(session({
    secret: process.env.jwtSecret,
    resave: false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(methodOverride('_method'));
app.use(morgan('dev'));

// Routes
app.get('/', (req, res) => {
    res.render('index', {user: req.user});
});

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login');
});

app.get('/register', checkNotAuthenticated, (req, res) => {
    res.render('register');
});

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}));

app.post('/register', checkNotAuthenticated, async (req, res) => {
    bcrypt.hash(req.body.password, 10).then(hashedPass => {
        let newUser = {
            name: req.body.name,
            email: req.body.email,
            password: hashedPass,
            created: new Date()
        };

        users.estimatedDocumentCount({email: newUser.email}).then((number) => {
            if (number < 1) {
                users.insertOne(newUser).then(value => {
                    console.log(`REGISTERED ${value.ops[0].email}`);
                    res.redirect('/login');
                }).catch(console.error);
            } else {
                res.status(400).send('That user already exists');
            }
        }).catch(console.error);
    }).catch(console.error);
});

app.delete('/logout', checkAuthenticated, (req, res) => {
    req.logOut();
    res.redirect('/login');
});

MongoClient.connect(process.env.dbUri, {useUnifiedTopology: true, native_parser: true}, async (err, client) => {
    try {
        assert.strictEqual(null, err);
        console.log('DATABASE CONNECTION: SUCCESS');

        db = client.db('transexchange');
        users = db.collection('users');

        await initPassport(passport, 
            async email => await users.findOne({email}),
            async id => {
                const u = await users.findOne({_id: new mongodb.ObjectID(id)});
                return u;
            });

        app.listen(3000, () => console.log('Server running on port 3000'));
    } catch (err) {
        console.error(err);
    }
});

function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.redirect('/login');
    }
}

function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        next();
    }
}