# SMDX for EViews


### Purpose
EViews cannot read SDMX format (yet). However, EViews can read html tables.

This very simple app aims at creating html table from SDMX flow in a quick and efficient way in the same spirit as [Widukind](https://github.com/Widukind) 

Currently, the app supports only INSEE SDMX requests but any contribution is very welcome.

### Libraries
This app is written is NodeJS. It's using the following librairies
* xml2js
* ExpressJS
* Concat



## I. How to use it ?
The app is transforming SDMX flows from INSEE website in a html table that can be read by EViews. The app provides you with a stable URL you can use in your EViews code.
For instance, the url for French HICP dataset is :
`http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`

Thus, some EViews code retrieving the series will look like this :

`%url = http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`
`wfopen(wf=ipch,type="html") %url colhead=2 namepos=first`

With an url you can retrieve :
* a timeseries
* multiple timeseries
* a dataset


### A. Get a Timeseries 
Use the idbank of the timeseries :
`http://sdmx.herokuapp.com/series/idbank`

You can filter the results and limit the number of observations by either :
* fixing the number of observations with the filter : `lastNObservations`
* fixing the starting period with the filter : `startPeriod`

**Example :**

Input : `http://sdmx.herokuapp.com/series/000436387?startPeriod=2010`

### B. Get multiple Timeseries 
You could add multiple idbanks to your request with '+' :

`http://sdmx.herokuapp.com/series/idbank1+idbank2+idbank3`

Previous filter still works but you have to ensure that the timeseries share the same time period. Otherwise, some values can be missing.

**Example**

Input : `http://sdmx.herokuapp.com/series/001762151+001762152+001762153?startPeriod=2010`

### C. Get a Dataset
To get a dataset, you should know its id. You can get an exhaustive list here : http://sdmx.herokuapp.com/dataflow

Then, the url for the dataset data is :
`http://sdmx.herokuapp.com/dataset/id`

Some datasets have multiple dimensions. For instance, CPI Inflation dataset (IPC-2015-COICOP) contains both monthly and annual data. An exhaustive dimensions lists can be found here : `http://sdmx.herokuapp.com/datastructure/id_dataset``

You can then use it as a standard filter :

**Example**

Input : `http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`

### KNOWN ISSUES
Since the app output is an html table, an obvious limitations is that a request cannot be done along multiple dimensions.



