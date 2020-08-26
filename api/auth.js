const express = require('express');
var router = express.Router();

const bcrypt = require('bcrypt');
const salt = 10;

const jwt = require('jsonwebtoken');

router.post('/register', (req, res) => {
    bcrypt.hash(req.body.password, salt).then(hashedPass => {
        let newUser = {
            email: req.body.email,
            password: hashedPass,
            refreshToken: null
        };

        req.users.estimatedDocumentCount({email: newUser.email}).then((number) => {
            if (number < 1) {
                req.users.insertOne(newUser).then(value => {
                    console.log(`~ REGISTERED ${value.ops[0].email}`);
                    res.send(value.ops[0]);
                }).catch(console.error);
            } else {
                res.status(400).send('That user already exists');
            }
        }).catch(console.error);
    }).catch(console.error);
});

router.post('/login', (req, res) => {
    req.users.findOne({email: req.body.email}).then(user => {
        bcrypt.compare(req.body.password, user.password, async (err, same) => {
            if (err) return console.error(err);

            if (same) {
                // Login successful
                if (user.refreshToken) {
                    // Session already established
                    console.log(`LOGIN AGAIN ${user.email}`);
                    const accessToken = await refreshAccess(user.refreshToken, req.users);
                    res.send({refreshToken: user.refreshToken, accessToken});
                } else {
                    // Establish a new session
                    console.log(`LOGIN NEW ${user.email}`);
                    const refreshToken = jwt.sign({email: user.email}, process.env.TOKEN_SECRET, {expiresIn: '365d'});
                    req.users.updateOne({email: user.email}, {$set:{refreshToken}}).then(async value => {
                        const accessToken = await refreshAccess(refreshToken, req.users);
                        res.send({refreshToken, accessToken});
                    });
                }
            } else {
                // Wrong password
                res.status(400).send('Email/password incorrect!');
            }
        });
    }).catch(console.error);
});

router.post('/logout', (req, res) => {
    if (req.body.refreshToken) {
        req.users.updateOne({refreshToken: req.body.refreshToken}, {$set: {refreshToken: null}}, (err, result) => {
            if (err) return console.error(err);

            if (result.modifiedCount > 0) {
                res.send('Logged out successfully!');
            } else {
                res.status(500).send('Could not log out!');
            }
        });
    } else {
        res.status(400).send('No refresh token sent');
    }
});

async function refreshAccess(refreshToken, collection) {
    try {
        const user = jwt.verify(refreshToken, process.env.TOKEN_SECRET);
        const count = await collection.countDocuments({email: user.email, refreshToken});
        if (count > 0) {
            // Valid refresh token
            const accessToken = jwt.sign({email: user.email}, process.env.TOKEN_SECRET, {expiresIn: '1h'});
            return accessToken;
        } else {
            return null;
        }
    } catch (err) {
        console.error(err);
    }
}

module.exports = router;