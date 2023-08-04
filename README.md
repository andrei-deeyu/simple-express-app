
# Structure
```bash
├───auth (auth API, config, middlewares)
├───config (.env variables, DB config, DB Seeders)
├───models (DB Models)
├───privateApi (private API - requires authentication)
├───publicApi (public API - doesn't require authentication)
├───errors.js (Error Handler)
└───index.js
```

# Run Locally

#### 1. Create Auth0 Machine to Machine Application `(make sure the Management API is authorized to access & manage it with all the scopes checked)`
* retreive it's basic information
#### 2. Set up your Google Cloud project ([see official docs](https://developers.google.com/maps/documentation/javascript/cloud-setup))
* create API key
#### 3. Create `config/config.env` and insert the below data
```bash
MONGO_URI: <mongodb's host connection uri>
AUDIENCE: <auth0 api>
DOMAIN: <auth0 domain>
CLIENTID: <auth0 clientid>
CLIENTSECRET: <auth0 client secret>
ACCESS_TOKEN_NAMESPACE: <unique namespace that doesn't interfere with auth0's booked namespaces
GOOGLE_MAPS_API_KEY <google maps API key>
```
