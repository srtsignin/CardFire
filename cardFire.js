const express = require('express')
const bodyParser = require('body-parser')
const RosefireTokenVerifier = require('rosefire-node')
const redis = require('redis')
const fs = require('fs')

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
        validateRoseFireToken(roseFireToken, res)
    }
})

function validateRoseFireToken (roseFireToken, res) {
    rosefire.verify(roseFireToken, function(err, authData) {
        if (err) {
          res.status(401).json({
            error: 'Not authorized!'
          })
        } else {
          console.log(authData.username)
          console.log(authData.issued_at) 
          console.log(authData.group)
          console.log(authData.expires)
          res.json(authData);
        }
      })
      
}

app.listen(port, () => console.log(`CardFire service listening on port ${port}!`))