# SDMX for EViews

## Purpose
This web-app translates SDMX data into a standard HTML table readable by [EViews](http://www.eviews.com/home.html).

*More info on the [website](http://sdmx.herokuapp.com)*.


## Contribution 

In order to run the code locally, you'll need:
- nodejs
- rabbitmq

To install required dependencies, you can do:
```sh
cd eviewsSDMX/
npm install --dev
```

### Folder organization:

The entrypoint of the app is `server.js`.

The flow of the app is:
1. A request is made
2. The request is interpreted and the following parameters are retrieved:
  - the provider
  - additional parameters (resource to be retrieved, etc)
3. A request is made to the data provider (or multiple if required)
4. The response (in SDMX format) is parsed and rendered as an HTML page (with data in an HTML table)


Fetchers to data providers are stored in `/fetchers/` folders:
- The SDMX fetcher (for SDMX 2.1) is stored is `/fetchers/sdmx.js`.
- Fetchers for other providers (FRED, Bundesbank, BLS, OECD, etc) are stored in separate files.

Code to render the response received in SDMX format as HTML code is stored in `/render` folder.

### Run tests

In order to run test, run the following command (note that you should save a BLS and FRED api key in a `.env` file):
```sh
npm test
```

Example of `.env` file:

```sh
FRED_API_KEY="YOUR_FRED_KEY"
BLS_API_KEY="YOUR_BLS_KEY"
```

## New Issues
 
You can raise new issues [here](https://github.com/louisdecharson/eviewsSDMX/issues/new).
 
## Licence
GNU Affero General Public License version 3

<hr/>

<> with <3 by [louisdecharson](https://github.com/louisdecharson/)
