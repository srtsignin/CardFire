const express = require('express')
const bodyParser = require('body-parser')
const RosefireTokenVerifier = require('rosefire-node')
const redis = require('redis')
const fs = require('fs')

const USER_TO_CARD = 'UserToCard'
const CARD_TO_USER = 'CardToUser'

const secrets = JSON.parse(fs.readFileSync('secrets.properties'))

const rosefire = new RosefireTokenVerifier(secrets.roseFireSecret);

const redisHost = secrets.redis.host
const redisPort = secrets.redis.port

const client = redis.createClient(redisPort, redisHost)
const app = express()
const port = 3001

const jsonParser = bodyParser.json()

app.get('/test', (req, res) => {
    res.send(client.PING())
})

/**
 * Set contentType header to application/json
 */
app.post('/token', jsonParser, (req, res) => {
    if (!req.body) return res.sendStatus(400)
    let cardNumber = req.body.cardNumber
    let roseFireToken = req.get('RoseFireToken')
    if (roseFireToken) {
        try {
            let username = validateRoseFireToken(roseFireToken, cardNumber, removeOldCard)
            addNewCard(username, cardNumber)
        } catch (err) {
            // TODO: Handle different error types
            res.status(401).json({
                error: 'Not authorized'
            })
            return
        }
    }
    res.status(200).json({
        'success': true
    })
})

function validateRoseFireToken (roseFireToken, cardNumber, callback) {
    rosefire.verify(roseFireToken, function(err, authData) {
        if (err) {
          throw err
        } else {
          callback(cardNumber, authData.username, addNewCard)
        }
    })
}

function removeOldCard (cardNumber, username, callback) {
    client.hmget(USER_TO_CARD, username, (err, found) => {
        if (found) {
            client.hdel(CARD_TO_USER, found)
        }
        callback(cardNumber, username, () => {
            console.log('Made it, make func here')
            return
        })
    })
}

function addNewCard (cardNumber, username, callback) {
    client.hmset(USER_TO_CARD, username, cardNumber, (err) => {
        client.hmset(CARD_TO_USER, cardNumber, username, callback)
    })
}

app.listen(port, () => console.log(`CardFire service listening on port ${port}!`))