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
const roleManager = require('./role-manager');

// MONGODB SETUP
const mongodb = require('mongodb');
const MongoClient = mongodb.MongoClient;
const assert = require('assert');
const MongoStore = require('connect-mongo')(session);

MongoClient.connect(process.env.DB_URI, {useUnifiedTopology: true, native_parser: true}, async (err, client) => {
    try {
        const db = client.db(process.env.DB_NAME);
        const users = db.collection('users');
        // DEFINE OTHER COLLECTIONS HERE

        // View engine
        app.set('view engine', 'ejs');

        // Config
        app.use(bodyParser.urlencoded({extended: false}));
        app.use(bodyParser.json());
        app.use(flash());
        app.use(session({
            store: new MongoStore({client}),
            secret: process.env.SECRET,
            resave: false,
            saveUninitialized: false
        }));
        app.use(passport.initialize());
        app.use(passport.session());
        app.use(methodOverride('_method'));
        app.use(morgan('dev'));
        app.use(express.static('public'));
        app.use(roleManager);
        app.use(function (err, req, res, next) {
            if (res.headersSent) {
                return next(err)
            }
            res.status(500).render('error', {user: req.user, error: err.stack});
        });

        // Insert collections
        app.use((req, res, next) => {
            req.db = {users}; // Insert any other collections here
            next();
        });

        // Routes
        app.get('/', (req, res) => {
            res.render('index', {user: req.user, path: '/'});
        });

        app.get('/login', checkNotAuthenticated, (req, res) => {
            res.render('login', {path: '/login'});
        });

        app.get('/register', checkNotAuthenticated, (req, res) => {
            res.render('register', {path: '/register'});
        });

        app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
            successRedirect: '/',
            failureRedirect: '/login',
            failureFlash: true
        }));

        app.post('/register', checkNotAuthenticated, async (req, res) => {
            if (req.body.password != req.body.confirmPassword) {
                req.flash('error', 'Make sure Password and Confirm Password match');
                return res.render('register');
            }

            bcrypt.hash(req.body.password, 10).then(hashedPass => {
                let newUser = {
                    name: req.body.name,
                    email: req.body.email,
                    password: hashedPass,
                    created: new Date()
                };

                const cursor = users.find({email: newUser.email});
                cursor.count().then((number) => {
                    if (number < 1) {
                        users.insertOne(newUser).then(value => {
                            console.log(`REGISTERED ${value.ops[0].email}`);
                            res.redirect('/login');
                        }).catch(console.error);
                    } else {
                        req.flash('error', 'That user already exists');
                        res.render('register');
                    }
                }).catch(console.error);
            }).catch(console.error);
        });

        app.delete('/logout', checkAuthenticated, (req, res) => {
            req.logOut();
            const route = req.query.return;
            res.redirect(route);
        });

        // Handle 404
        app.use((req, res, next) => {
            res.status(404).render('notfound', {user: req.user, path: '/'});
        });

        assert.strictEqual(null, err);
        console.log('DATABASE CONNECTION: SUCCESS');

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