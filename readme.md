# SDMX + INSEE for EViews

More information on the [website](http://sdmx.herokuapp.com) 

<a name="howitworks"></a>
 
## I. How does it work ?
 
The app is transforming SDMX flows from Insee website in an HTML table that can be read by EViews. The app provides you with a stable URL that you can use in your EViews code.
 
For instance, the url for the French HICP dataset is : `http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`
 
Thus, some EViews code for retrieving the series will look like this :
 
`%url = http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`
`wfopen(wf=ipch,type="html") %url colhead=2 namepos=first`
 

With an url you can retrieve :
 
*   a timeseries
*   multiple timeseries
*   a dataset
 
 
### A. Get a Timeseries
 
Use the idbank of the timeseries : `http://sdmx.herokuapp.com/series/idbank`
 
You can filter the results and limit the number of observations by either :
 
*   fixing the number of observations with the filter : `lastNObservations`
*   fixing the starting period with the filter : `startPeriod`
 
**Example :**`%url = "http://sdmx.herokuapp.com/series/000436387?startPeriod=2010"`
 
 
### B. Get multiple Timeseries
 
You could add multiple idbanks to your request by separating each idbank by a '+' : `http://sdmx.herokuapp.com/series/idbank1+idbank2+idbank3`
 
**Example :** `http://sdmx.herokuapp.com/series/001762151+001762152+001762153?startPeriod=2010`
 
**Be cautious !** :  Previous filters still work but you have to ensure that all the timeseries share the same time period. Otherwise, some values can be missing.
 
 
### C. Get a Dataset
 
To get a dataset, you should know its id. An exhaustive list is available here : [http://sdmx.herokuapp.com/dataflow](http://sdmx.herokuapp.com/dataflow)
 
Then, the url for the dataset data is : `http://sdmx.herokuapp.com/dataset/id_dataset`
 
Some datasets have multiple dimensions. For instance, CPI Inflation dataset (IPC-2015-COICOP) contains both monthly and annual data. Thus, you might need to know the dimensions of a dataset before retrieving it.
An exhaustive dimensions lists can be found here : `http://sdmx.herokuapp.com/datastructure/id_dataset`
 
You can then use it as a standard filter.
 
**Example :** `http://sdmx.herokuapp.com/dataset/IPCH-2015-FR-COICOP?freq=M`
 
 
### Skim Data
 
The app allows you to skim through the available datasets and timeseries. A list of all the available datasets can be found here : [http://sdmx.herokuapp.com/dataflow](http://sdmx.herokuapp.com/dataflow)
 
And an exhaustive of timeseries available in each dataset is at http://sdmx.herokuapp.com/dataflow/id_dataset (change 'id_dataset' by the name of the dataset).
 
* * *
 
## Example
 
#### _EViews Input :_
 
<pre>%url = http://sdmx.herokuapp.com/series/000436387?startPeriod=2016
wfopen(wf=ipch,type="html") %url colhead=2 namepos=first
</pre>
 
#### _EViews Output :_
 
A workfile with a two series, one series named `num000436387` containing information from the timeseries with idbank _000436387_ and a series `Dates`containing Dates from 2016M01 to 2016M05
 
<a name="codesource"></a>
 
## Contribute to the code
 
Ideas and suggestions are more than welcome. Contribute to the code [here](https://github.com/louisdecharson/eviewsSDMX)
 
* * *
 
<a class="issues"></a><font color="darkRed">
 
## Known Issues
 
</font>
 
Since the app output is an html table, an obvious limitation is that a request cannot be done along multiple time dimensions. You cannot retrieve in the same request monthly and quaterly data.
 
Moreover :
 
*   Using the filter `?lastNObservations=` when retrieving multiple series or a dataset is a **bad** idea if series do not belong to the same time period.
*   Currently, retreiving some entire datasets in one instance is not possible due to limitation on the timeout period on Heroku website. However, you can filter results in ordrer to retrieve the datasets in multiple instances.
 
**New Issues**
 
You can raise new issues [here](https://github.com/louisdecharson/eviewsSDMX/issues/new)
 
 
* * *
 
 
<center>
 
Made with by [louisdecharson](https://github.com/louisdecharson/)
 
</center>
 
