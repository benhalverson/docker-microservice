# docker-microservice
The purpose of this API is to check an IP address against a known list of ip addresses in a Firehol blocklist


## Getting started

You can either git clone the repo and install the repo locally or use docker-compose to start the app.
- `git clone git@github.com:benhalverson/docker-microservice.git`
- `cd docker-microservice`
- `npm i`
- `npm run dev`

## With Docker
- `git clone git@github.com:benhalverson/docker-microservice.git`
- `cd docker-microservice`
- `docker-compose up`

Use curl or Postman to hit the api.
Example: `curl localhost:3000/127.0.0.1`

The result will be a JSON response that looks like.

Example `curl localhost:3000/98.207.144.98`

```json
{
    "success": true,
    "hostname": "localhost",
    "flagged": false,
    "message": "The ip address is 98.207.144.98 is ok.",
    "telemetry": [
        {
            "region": "CA",
            "country": "US",
            "timezone": "America/Los_Angeles"
        }
    ],
    "ipset": null,
    "ipsets-count": 249
}
```

Example with a ip in one of the lists `curl localhost:3000/5.79.79.211`

```json
{
    "success": true,
    "hostname": "localhost",
    "flagged": true,
    "message": "The ip address is 5.79.79.211 was found in an ipset.",
    "telemetry": [
        {
            "region": "ZH",
            "country": "NL",
            "timezone": "Europe/Amsterdam"
        }
    ],
    "ipset": "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/bambenek_c2.ipset",
    "ipsets-count": 249
}
```

Invalid IP example `curl localhost:3000/asdf
```json
{
    "success": false,
    "Error": "Not a valid IP address."
}
```


To use docker you need Docker installed. See docker.com



## Technology used
- Node.js 14.x LTS
- express.js 
- axios
- firehol ip address list
- Docker / Docker compose
- Travis CI
- AWS