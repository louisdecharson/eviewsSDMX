# SDMX for EViews

### Purpose

EViews cannot read SDMX format (yet). However, EViews can read html tables.

This very simple app aims at creating html table from SDMX flow in a quick and efficient way in the same spirit as [Widukind](https://github.com/Widukind)

Currently, the app supports only Insee, ECB or Eurostat data natively.

It also supports requests for :

+ Quandl
+ Bureau of Labor Stastics
+ Fred

### Libraries

This app is written is NodeJS. It's using the following librairies

* xml2js
* ExpressJS
* Concat
* Cheerio
* ical-generator

More information on the [website](http://sdmx.herokuapp.com) 
 
## I. How does it work ?
 
The app is transforming SDMX flows from Insee, ECB or Eurostat website in an HTML table that can be read by EViews. The app provides you with a stable URL that you can use in your EViews code.
 
For instance, the url for the French HICP dataset is : `http://sdmx.herokuapp.com/insee/dataset/IPCH-2015-FR-COICOP?freq=M`
 
Thus, some EViews code for retrieving the series will look like this :

```
%url = http://sdmx.herokuapp.com/insee/dataset/IPCH-2015-FR-COICOP?freq=M
import(t="html") %url colhead=2 namepos=first
```

With an url you can retrieve :
 
*   a timeseries
*   a dataset
*   multiple timeseries (only supported for Insee)

The app also gives flows from the providers [Insee](http://sdmx.herokuapp.com/insee/dataflow), [ECB](http://sdmx.herokuapp.com/ecb/dataflow) and [Eurostat](http://sdmx.herokuapp.com/eurostat/dataflow).
 
 
### A. Get a Timeseries
 
Use the id of the timeseries : `http://sdmx.herokuapp.com/provider/series/id`
 
You can filter the results and limit the number of observations by either :
 
*   fixing the number of observations with the filter : `lastNObservations`
*   fixing the starting period with the filter : `startPeriod`
 
**Example :**`%url = "http://sdmx.herokuapp.com/provider/series/000436387?startPeriod=2010"`
 
 
### B. Get multiple Timeseries (only supported for Insee)
 
You could add multiple idbanks to your request by separating each idbank by a '+' : `http://sdmx.herokuapp.com/provider/series/idbank1+idbank2+idbank3`
 
**Example :** `http://sdmx.herokuapp.com/provider/series/001762151+001762152+001762153?startPeriod=2010`
 
**Be cautious !** :  Previous filters still work but you have to ensure that all the timeseries share the same time period. Otherwise, some values can be missing.
 
 
### C. Get a Dataset
 
To get a dataset, you should know its id. An exhaustive list is available here : [http://sdmx.herokuapp.com/dataflow](http://sdmx.herokuapp.com/dataflow)
 
Then, the url for the dataset data is : `http://sdmx.herokuapp.com/service/dataset/id_dataset`
 
Some datasets have multiple dimensions. For instance, CPI Inflation dataset (IPC-2015-COICOP) contains both monthly and annual data. Thus, you might need to know the dimensions of a dataset before retrieving it.
An exhaustive dimensions lists can be found here : `http://sdmx.herokuapp.com/datastructure/id_dataset`
 
You can then use it as a standard filter.
 
**Example :** `http://sdmx.herokuapp.com//dataset/IPCH-2015-FR-COICOP?freq=M`

### D. Get data from other providers
Alternatively, you can also make a request to

+ an other SDMX provider using an **url**: `http://sdmx.herokuapp.com/req?url=SDMX_URL`
+ Quand series: `http://sdmx.herokuapp.com/quandl/API_KEY/DATASET/SERIES`
+ BLS series: `http://sdmx.herokuapp.com/bls/API_KEY/SERIES_ID?startyear=STARTYEAR&endyear=ENDYEAR`. Filters

### Skim Data

The app allows you to skim through the available datasets and timeseries. A list of all the available datasets can be found here for each provider :
* [Insee](http://sdmx.herokuapp.com/insee/dataflow)
* [ECB](http://sdmx.herokuapp.com/ecb/dataflow)
* [Eurostat](http://sdmx.herokuapp.com/eurostat/dataflow)
 
And an exhaustive of timeseries available in each dataset is at http://sdmx.herokuapp.com/dataflow/id_dataset (change 'id_dataset' by the name of the dataset).
 
* * *
 
## Example
 
#### _EViews Input :_
 
 ```
%url = http://sdmx.herokuapp.com/insee/series/000436387?startPeriod=2016
wfopen(wf=ipch,type="html") %url colhead=2 namepos=first
```

#### _EViews Output :_
 
A workfile with a two series, one series named `num000436387` containing information from the timeseries with idbank _000436387_ and a series `Dates`containing Dates from 2016M01 to 2016M05
 
 
## Contribute to the code
 
Ideas and suggestions are more than welcome. Contribute to the code [here](https://github.com/louisdecharson/eviewsSDMX)
 
* * *
  
## Known Issues

Since the app output is an html table, an obvious limitation is that a request cannot be done along multiple time dimensions. You cannot retrieve in the same request monthly and quaterly data.
 
Moreover :
 
*   Using the filter `?lastNObservations=` when retrieving multiple series or a dataset is a **bad** idea if series do not belong to the same time period.
*   Currently, retreiving some entire datasets in one instance is not possible due to limitation on the timeout period on Heroku website. However, you can filter results in ordrer to retrieve the datasets in multiple instances.
 
**New Issues**
 
You can raise new issues [here](https://github.com/louisdecharson/eviewsSDMX/issues/new)
 
 
* * *

## Licence
GNU Affero General Public License version 3
 
 
Made with <3 by [louisdecharson](https://github.com/louisdecharson/)
 
 Hello
