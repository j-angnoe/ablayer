# Ablayer
This tool allows you to proxy an external site and mix
in your overwrite external sources with local versions.

Usecases:
- Running experiments against a external applications.
- For creating layered abtests (an ABtest that can be added as a 
  layer on top of an existing system).
- Serves your code as if it was part of the system,
  without the need of running the entire system locally.
- Debugging and troubleshooting in production:
  Allows you to test your local (javascript) build against production.
- Great for demonstrations and proof of concepts.

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
  
<img src="https://raw.githubusercontent.com/j-angnoe/ablayer-hackernews-example/master/screenshot-frontpage.png" height="200" align="left">
<img src="https://raw.githubusercontent.com/j-angnoe/ablayer-hackernews-example/master/screenshot-comments.png" height="200">

## Features
- Proxy against http and https servers.
- Serves files from the current directory
    - abtest.js will be automatically injected in each html file that is served via ablayer.
    - for each requested file ablayer will check if it exists locally, otherwise it
      will proxy the request to the external server.
- Will rewrite links so you stay on localhost.
- Cookies are handled appropriately, so you can login via your localhost
  on the external system.
- Redirects will be rewritten, so you stay on localhost.








