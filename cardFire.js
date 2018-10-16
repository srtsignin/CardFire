const express = require('express')
const bodyParser = require('body-parser')
const RosefireTokenVerifier = require('rosefire-node')
const redis = require('redis')
const async = require('async')
const fs = require('fs')

const USER_TO_CARD = 'UserToCard'
const CARD_TO_USER = 'CardToUser'
const USER_TO_NAME = 'UserToName'

const secrets = JSON.parse(fs.readFileSync('res/secrets.properties'))

const rosefire = new RosefireTokenVerifier(secrets.rosefireSecret);

const redisHost = secrets.redis.host
const redisPort = secrets.redis.port

const client = redis.createClient(redisPort, redisHost)
const app = express()
const port = 3001

const jsonParser = bodyParser.json()

app.get('/test', (req, res) => {
    client.PING((err, response) => {
        if (err) {
            res.send('Cannot PING')
        }
        res.send(response)
    })

})

/**
 * Set contentType header to application/json
 */
app.post('/token', jsonParser, (req, res) => {
    if (!req.body) {
        return res.sendStatus(400)
    }

    let cardNumber = req.body.cardNumber
    let rosefireToken = req.get('RosefireToken')

    if (rosefireToken && cardNumber) {
        createNewCardLink(rosefireToken, cardNumber, res)
        return
    } else if (cardNumber) {
        checkCard(cardNumber, res)
        return
    } else {
        res.status(400).json({
            'success': false,
            'message': 'You must include a RosefireToken in the header, ' +
                'specify the ContentType to be application/json, ' +
                'and provide cardNumber in the body'
        })
    }
})

function createNewCardLink(rosefireToken, cardNumber, res) {
    async.waterfall([
        validateRosefireToken(rosefireToken, cardNumber),
        removeOldCard,
        addNewCard,
    ], function(err, result) {
        console.error(err)
        if (err) {
            res.status(401).json({
                'success': false,
                'message': 'Unable to authorize'
            })
        } else {
            res.status(200).json({
                'success': true,
                'token': createToken(cardNumber)
            })
        }
        return
    })
}

function createToken(cardNumber) {
    let token = generateToken(cardNumber)
    client.setex(token, 3600 * 24, cardNumber)
    return token
}

function generateToken(cardNumber) {
    return cardNumber
}

function checkCard(cardNumber, res) {
    client.hmget(CARD_TO_USER, cardNumber, (err, found) => {
        if (found[0]) {
            res.status(200).json({
                'success': true,
                'token': createToken(cardNumber)
            })
            return
        } else {
            res.status(401).json({
                'success': false,
                'message': 'This is not a registered card. Please register this card'
            })
            return
        }
    })
}

function validateRosefireToken(rosefireToken, cardNumber, callback) {
    return function(callback) {
        rosefire.verify(rosefireToken, function(err, authData) {
            if (err) {
                throw err
            }
            callback(null, cardNumber, authData)
        })
    }
}

function removeOldCard(cardNumber, authData, callback) {
    client.hmget(USER_TO_CARD, authData.username, (err, found) => {
        if (found) {
            client.hdel(CARD_TO_USER, found)
        }
        callback(null, cardNumber, authData)
    })
}

function addNewCard(cardNumber, authData, callback) {
    client.hmset(USER_TO_CARD, authData.username, cardNumber, (err) => {
        client.hmset(CARD_TO_USER, cardNumber, authData.username, (err) => {
            client.hmset(USER_TO_NAME, authData.username, authData.name, callback)
        })
    })
}

app.get('/verify', (req, res) => {
    let cardfireToken = req.get('CardfireToken')
    if (!cardfireToken) {
        res.status(400).json({
            'success': true,
            'message': 'No CardfireToken header present'
        })
        return
    } else {
        verifyCardfireToken(cardfireToken, res)
        return
    }
})

function verifyCardfireToken(cardfireToken, res) {
    client.get(cardfireToken, (err, cardNumber) => {
        if (!cardNumber) {
            res.status(401).json({
                'success': false,
                'message': 'Not a valid CardfireToken'
            })
            return
        } else {
            client.hmget(CARD_TO_USER, cardNumber, (err, userList) => {
                if (!userList[0]) {
                    res.status(401).json({
                        'success': false,
                        'message': 'Not a valid CardfireToken'
                    })
                    return
                } else {
                    client.hmget(USER_TO_NAME, userList[0], (err, nameList) => {
                        res.status(200).json({
                            'success': true,
                            'user': {
                                'username': userList[0],
                                'name': nameList[0]
                            }
                        })
                        return
                    })
                }
            })
        }
    })
}

app.listen(port, () => console.log(`Cardfire service listening on port ${port}!`))