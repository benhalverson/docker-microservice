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

Example `curl firehol-staging.us-west-2.elasticbeanstalk.com/98.207.144.98`

```json
{
  "success": true,
  "hostname": "firehol-staging.us-west-2.elasticbeanstalk.com",
  "flagged": false,
  "message": "The IP Address is 98.207.144.98 is ok.",
  "location": {
    "region": "CA",
    "country": "US",
    "timezone": "America/Los_Angeles"
  },
  "ipset": "",
  "ipsets-count": 249
}
```

Example with a ip in one of the lists `curl firehol-staging.us-west-2.elasticbeanstalk.com/5.79.79.211`

```json
{
  "success": true,
  "hostname": "firehol-staging.us-west-2.elasticbeanstalk.com",
  "flagged": true,
  "message": "The IP Address is 5.79.79.211 was found in an ipset.",
  "location": {
    "region": "ZH",
    "country": "NL",
    "timezone": "Europe/Amsterdam"
  },
  "ipset": "https://raw.githubusercontent.com/firehol/blocklist-ipsets/master/bambenek_c2.ipset",
  "ipsets-count": 249
}
```

Invalid IP example `curl firehol-staging.us-west-2.elasticbeanstalk.com/asdf
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
- AWS Pipelines
- AWS Elasticbeanstalk

## Demo links
http://firehol-staging.us-west-2.elasticbeanstalk.com/healthcheck
http://firehol-staging.us-west-2.elasticbeanstalk.com/:ipaddress
