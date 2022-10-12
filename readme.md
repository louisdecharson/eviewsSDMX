# SDMX for EViews

## Purpose
This web-app translates SDMX data into a standard HTML table readable by [EViews](http://www.eviews.com/home.html).
It serves as a middlepoint:
- web requests to the app are turned into SDMX request to the provider (e.g. INSEE)
- response returned by the provider is parsed and translated to HTML table

This is helpful as EViews software can easily make GET requests to a web-application and read HTML table.

*More info on the on how to make request on the [website](http://sdmx.herokuapp.com)*.

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
1. A request is made (by a user) to the web application `http://sdmx.herokuapp.com`
2. The request is interpreted depending on the route and resources asked and the following parameters are retrieved:
  - the provider, e.g. INSEE, OECD, etc
  - additional parameters (resource to be retrieved, etc), e.g. whether a series or a dataset is requested, which resource_id, etc.
3. A request is made to the corresponding data provider (one request or multiple requests if required)
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
