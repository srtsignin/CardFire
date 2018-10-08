const express = require('express')
const bodyParser = require('body-parser')
const RosefireTokenVerifier = require('rosefire-node')
const redis = require('redis')
const async = require('async')
const fs = require('fs')

const USER_TO_CARD = 'UserToCard'
const CARD_TO_USER = 'CardToUser'

const secrets = JSON.parse(fs.readFileSync('secrets.properties'))

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
        async.waterfall([
            validateRosefireToken(rosefireToken, cardNumber),
            removeOldCard,
            addNewCard,
        ], function(err, result) {
            console.error(err)
            if (err) {
                res.status(401).json({ error: 'Not authorized' })
            } else {
                res.status(200).json({
                    'success': true,
                    'message': 'Added card number ' + cardNumber + ' to database'
                })
            }
            return
        })
    } else {
        res.status(400).json({
            'success': false,
            'message': 'You must include a RosefireToken in the header, ' +
                'specify the ContentType to be application/json, ' +
                'and provide cardNumber in the body'
        })
    }
})

function validateRosefireToken(rosefireToken, cardNumber, callback) {
    return function(callback) {
        rosefire.verify(rosefireToken, function(err, authData) {
            if (err) {
                throw err
            }
            callback(null, cardNumber, authData.username)
        })
    }
}

function removeOldCard(cardNumber, username, callback) {
    client.hmget(USER_TO_CARD, username, (err, found) => {
        if (found) {
            client.hdel(CARD_TO_USER, found)
        }
        callback(null, cardNumber, username)
    })
}

function addNewCard(cardNumber, username, callback) {
    console.log(cardNumber)
    console.log(username)
    client.hmset(USER_TO_CARD, username, cardNumber, (err) => {
        client.hmset(CARD_TO_USER, cardNumber, username, callback)
    })
}

app.listen(port, () => console.log(`CardFire service listening on port ${port}!`))