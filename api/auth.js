const express = require('express');
var router = express.Router();

const bcrypt = require('bcrypt');
const salt = 10;

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

module.exports = router;