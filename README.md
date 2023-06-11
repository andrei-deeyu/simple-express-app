
# Structure
```bash
├───api (private API - requires authentication)
├───auth (auth API, config, middlewares)
├───config ( .env variables, DB config )
├───models
├───node_modules
├───index.js
└───publicAPI ( public API - doesn't require authentication )
```

# Run Locally

#### 1. create auth0 Machine to Machine Application `(make sure the Management API is authorized to access & manage it with all the scopes checked)`
#### 2. retreive it's basic information
#### 3. create `config/config.env` and insert the below data
```bash
MONGO_URI: <mongodb's host connection uri>
AUDIENCE: <auth0 api>
DOMAIN: <auth0 domain>
CLIENTID: <auth0 clientid>
CLIENTSECRET: <auth0 client secret>
ACCESS_TOKEN_NAMESPACE: <unique namespace that doesn't interfere with auth0's booked namespaces
```