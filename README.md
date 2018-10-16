# CardFire

Our authentication service which uses a card scanner

## Endpoints

- POST at `/token`
  - Requires header for `contentType` set to `application/json`
  - If registering a new card, requires a header `RosefireToken` containing the Rosefire token
  - Expects a card number in the body, example below

  ```json
  {
    "cardNumber": 1234
  }
  ```

  - Responds with json indicating whether the action was successful. If the action was successful, a token comes back, otherwise, a message explaining what went wrong comes back

  ```json
  {
    "success": false,
    "message": "You must include a RosefireToken in the header."
  }
  or
  {
    "success": true,
    "token": "dslakjfsdlnf2e4242lhezlsfnsdaf2342lfdsnmanfso2"
  }
  ```

- GET at `/verify`
  - Requires a header for `CardfireToken` containing the Cardfire token
  - Returns a success boolean and either a message (if false) or a user object (if true)

  ```json
  {
    "success" : false,
    "message" : "Not a valid token"
  }
  or
  {
    "success" : true,
    "user" : {
      "username" : "JDoe",
      "name" : "John Doe"
    }
  }
  ```
