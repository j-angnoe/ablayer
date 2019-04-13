# ABLayer
This tool allows you to proxy an external site and mix
in your overwrite external sources with local versions.

Usecases:
- Running experiments against a published site
- For creating layered abtests (an ABtest that can be added as a 
  layer on top of an existing system).
- Serves your code as if it was part of the system,
  without the need of running the entire system locally.

## Usage:
```
ablayer --url https://some-site.com [--port 9900] [--cors]
```

## Installation
```
npm install -g ablayer
```

## An example:
- Check out the [Hackernews example](https://github.com/j-angnoe/ablayer-hackernews-example) to see
  how ablayer can be used to try out a custom theme and add new/seen/read comments
  feature to [Hackernews](https://news.ycombinator.com)
  

```




```








