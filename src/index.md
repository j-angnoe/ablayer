# ABLayer

A combination proxy which allows you to combine your local sources against an external system.

## How it works

We are going to provide this program as a terminal utility.

```js \
bin/ablayer --chmod 0755
#!/usr/bin/env node

<< # Javascript requirements >>

<< # Javascript globals >>

<< # Program options >> 

function main(argv) {    
    var runFrom = argv._[0] || '.';
    process.chdir(runFrom);

    var app = express();

    << # Server initialisation >>

    
    << # Serve static files >>

    << # Otherwise proxy from external host >>
    

    << # Start listening on port >>
}

// Start the program
argv = yargs.argv;
if (!argv.url) {
    yargs.showHelp();
    process.exit(1);
}
main(argv);

```

```js \
<< # Javascript requirements >>=
var express = require('express');
var path = require('path');
var fs = require('fs');

var proxy = require('express-http-proxy');
    // https://github.com/villadora/express-http-proxy

var url = require('url');

var argv; // will be initiated later on.

```


## Program options

We are going to use yargs for program options,
some documentation about yargs:

https://github.com/yargs/yargs/blob/HEAD/docs/api.md


```js \
<< # Javascript requirements >>=
var yargs = require('yargs');
```

```js \
<< # Program options >>=
yargs.usage(`Usage: $0 ---url=https://some.url [--port=9900]\nStart a ablayer against --url using sources from ${process.cwd()}`);

yargs.option('port', {
    desc: 'Define which port to bind to.',
    default: 9900
});

yargs.option('url', {
    desc: 'Specify the url to proxy',
    required: true,
    default: false
});

```

## Serve static files from current working dir

```js \
<< # Serve static files >>+=
app.use('/', express.static(process.cwd()));
```


## Proxy functionality


```js \
<< # Otherwise proxy from external host >>+=
app.use('/', proxy(argv.url, {
    proxyReqOptDecorator(reqOpt, srcReq) {
        // Prevent GZIP encoding, because we want to perform text
        // substitutions later on.

        reqOpt.headers['Accept-Encoding'] = '';            

        // Ablayer will be transparent that it's proxying for...
        // We may want to disable this feature. 
        reqOpt.headers['x-forwarded-for'] =  srcReq.headers['x-forwarded-for'] || srcReq.get('host') 
        return reqOpt;
    },

    userResHeaderDecorator(headers, req, res, proxyReq) {
        
        << # Proxy header decorations >> 

        /* Clear domain and secure headers per cookie.
         * It is possible to rewrite the domain, but unsetting it is effective as well.
         */
        if (headers['set-cookie']) {
            headers['set-cookie'] = headers['set-cookie'].map(cookie => {
                return cookie.replace(/;\s*domain=.+;?\s*/ig, ';').replace(/;\s*secure\s*;?/i, ';');
            });
        }

        return headers;
    },

    userResDecorator(res, data, req) {   
        var contentType = res.headers['content-type'];
        var isPlainText = /(text|application\/(javascript|json))/.test(contentType);

        if (!isPlainText) {
            return data;
        }

        var isHtml = /(text\/html)/.test(res.headers['content-type']);
        var content = data.toString();

        // Please note: Proxy response decorations are only for plaintext types.

        << # Proxy response decorations >> 

        return content;
    }
}));
```


## Start listening

```js \
<< # Start listening on port >>
app.listen(argv.port, function () {
    console.log(`AB-layer against ${argv.url} started at ${argv.port}`)
    console.log('Serving files from ' + process.cwd());
    console.log('Hit Control + C to stop this server.');
});    
```


## The abtest.js file

When a abtest.js file exists in the current
working directory, we will auto-inject this
in each html document served by this webserver.

We dont want to have to restart the server 
when one decides to add an abtest.js file later on, so we periodically check (each 5 seconds) if this file exists and act accordingly.


```js \
<< # Javascript globals >>=
var abtestFileExists = false;

function periodicallyCheckABtestFile() {
    if (fs.existsSync('abtest.js')) {
        abtestFileExists = true;
    } else {
        setTimeout(periodicallyCheckABtestFile, 5000);
    }
}

```

```js \
<< # Server initialisation >>=

    periodicallyCheckABtestFile();

    // When abtest is chedke
    app.get('/abtest.js', (req, res) => {
        // Yes, we can let res.sendFile fail, but we are aware
        // that it may take up to 5 seconds for this script
        // to detect the existence of the abtest.js file.
        if (!abtestFileExists) {
            return res.send('404: Page not Found', 404);
        }

        res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        res.header('Expires', '-1');
        res.header('Pragma', 'no-cache');
        res.sendFile(path.join(process.cwd(), '/abtest.js'));
    })

```

When the abtest.js file is there, we will inject a `<script src="abtest.js">` tag
either as last child of `<body>` or as last child of `<head>`, whichever is seen first.
Additionally, a small banner is injected to the top-right corner, to indicate
to the user that ablayer is active.

```js \
<< # Proxy response decorations >>+=
    if (isHtml && abtestFileExists) {
        content = injectAblayerBanner(content);
    }
```

```js \
<< # Javascript globals >>+=
function injectAblayerBanner(content) {
    var style = `
    position:fixed;
    background:#3F3;
    top: 0;
    right: 0;
    z-index:100000;
    padding: 5px;
    color: black;
    `.replace(/\n/g,'');

    var indicator = `
    document.addEventListener('DOMContentLoaded', function(event) {
        var div=document.createElement('div');
        var style = "${style}";
        var viewSource = '<a href="/abtest.js">view source</a>';
        div.innerHTML = '<div style="' + style + '">A/B test active ('+viewSource+')</div>';
        document.body.appendChild(div);
    });
    `

    if (~content.indexOf('</head>')) {
        return content.replace('</head>', `<script>${indicator}</script><script src="/abtest.js"></script></head>`);
    } else {
        return content.replace('</body>', `<script>${indicator}</script><script src="/abtest.js"></script></body>`)
    }
}
```

## Prevent escapes to external host

We want to prevent any direct calls to the external host. We solve this by rewriting
each occurence of a reference to the external host with localhost:9900 (or whatever port
we are running on). This prevents CORS/cross domain errors. This is not 100% bullet-proof
but it goes a long way. 


```js \
<< # Javascript globals >>+=

/* We can be behind a number of proxies
 * And we need to know the Original/Calling host.
 * We are more flexible if we determine this on a per-request
 * basis instead of precalculating this at start-up.
 */
function getCallingHost(req) {
    return url.format({
        protocol: req.headers['x-forwarded-proto'] || req.protocol, 
        host: req.headers['x-forwarded-for'] || req.get('host') // @fixme support x-forwarded-for
    });        
}

// Use this whenever you want to rewrite host to callingHost.
// Please note this uses the global `argv`.
function replaceForeignHost(content, callingHost) {
    var foreignHost = url.parse(argv.url).host;
    return content.replace(new RegExp('(https?:)?//'+foreignHost,'g'), callingHost);
}

```

Make sure urls are rewritten in all `plain text` type responses:

```js \
<< # Proxy response decorations >>+=
    if (isPlainText) {
        content = replaceForeignHost(content, getCallingHost(req));
    }
```

The external server may want to redirect us all over the place. 
This is a possibility for escape. We will handle redirects to different
locations on the external host (by rewriting the redirect header).
Redirections to other domains will be passed, and this way the user
may escape the ablayer proxy. This poses is a problem, which we 
haven't solved completely yet. An potential solution may be to spawn yet 
another ablayer and redirect to there... 

```js \
<< # Proxy header decorations >>+=
    /* Rewrite the location headers, 
     * replace proxy host with our calling host (CALLING_HOST)
     */

    if (headers['location']) {
        var {location} = headers
        
        headers['location'] = replaceForeignHost(location, getCallingHost(req));
        
        if (url.parse(argv.url).protocol == 'http:') {
            if (url.parse(location).protocol == 'https:') {

                // This is a sticky situation: http -> https infinite redirect.
                // we way solve this here, but its simpler that you start ablayer
                // with the https location instead. 
                if (location != headers['location']) {

                    res.send('Infinite http -> https loop detected. Please restart ablayer.');

                    console.error('Infinite http -> https redirect loop detected.');
                    console.error('From ' + argv.url + ' to ' + location);
                    console.error('Please start ablayer with the https url.');
                    process.exit(1);

                    return;
                }
            }
        }
    } 
```

## Feature: Prevent caching

As we are probably developing, we want every request to be as fresh as possible. 

```js \
<< # Javascript requirements >>+=
var nocache = require('nocache');
```

```js \
<< # Server initialisation >>+=

app.use(nocache());

```



## The CORS option

This option isn't on by default, but could be. 
It instructs our ablayer server to send the appropriate allow origins/headers
headers which are requested by the browser when you try to send ajax
requests from a different location. Let's say you have some local service 
that requests resources from some ablayer running locally. 

```js \
<< # Program options >>+=
yargs.option('cors', {
    desc: 'Allow all origins and headers',
    default: false
});
```

Implementation of these headers as an express middleware:

```js \
<< # Server initialisation >>+=
    if (argv.cors) {
        // Allow all CORS stuffs
        // https://enable-cors.org/server_expressjs.html

        console.log("Ablayer: CORS is enabled.");

        app.use(function(req, res, next) {
            // To allow CORS with credentials the Allowed Origin "*" won't do.
            // So we repeat the calling host (i.e. the host you refer to when calling this)
            console.log(req.headers);

            var allowHost = getCallingHost(req);

            var referer = req.headers['referer'] || false;
            if (referer) {
                var refererParsed = url.parse(referer);
                referer = url.format({
                    protocol: refererParsed.protocol,
                    host: refererParsed.host
                });

                allowHost = referer;
            }

            res.header("access-control-allow-origin", allowHost);
            res.header('access-control-allow-credentials', true);
            res.header("access-control-allow-headers", "Origin, X-Requested-With, Content-Type, Accept");

            if ('OPTIONS' == req.method) {
               res.send(200);
            } else {
                next();
            }
        });
    }
```

## The User middleware option

Allow the user to supply a file containing an express middleware function, 
thus providing the user more control over the webserver/proxy.

An example use-case is: When adding some script to some page, it does display but it doesn't function.
A strange situation. Maybe scripts are negatively impacting each other....  So I needed to confirm
the positive scenario: When only script A is included on the page, everything works fine. How does
one prevent the page to include everything but the designated script... Developer tools didn't provide
an 1 minute answer. 

I decided that ablayer could help out, if only i could control the ablayer webserver
in such a way that it will only serve my specific javascript, although many javascripts
are requested.

The solution: a small piece of custom middleware. In this case the middleware I wanted
to supply was:

```js 
// Example middleware to block all javascript except...:
module.exports = function(req ,res, next) {
    if (req.path && req.path.match(/\.js/)) {

        var allowedPatterns = ['my-target-script.js'];

        var allowedPatternsRegEx = new RegExp(`(${allowedPatterns.join('|')})`);

        if (req.path.match(allowedPatternsRegEx)) {
            console.log('Allow Javascript: ' + req.path);
            next();
        } else {
            console.log("Blocked Javascipt: " + req.path);
            res.end();
        }
    } else {
        next(); 
    }
}
```

I saved this script to my current working directory, and called:

`ablayer --url https://target.site --middleware ./middleware.js`

And that was it. 

The implementation of custom middleware: 

```js \
<< # Program options >>+=

yargs.option('middleware', {
    desc: 'Supply a middleware file',
    default: false
})

```


```js \
<< # Server initialisation >>+=

    if (argv.middleware) {
        var middlewarePath = path.join(process.cwd(), argv.middleware);

        console.log("Initialising custom middleware from: " + middlewarePath);
        
        try { 
   

            app.use((req, res, next) => {
                // Allow the user to change the middleware without having
                // to restart the server each time.
                try { 
                    var middleware = requireUncached(middlewarePath);

                    // You must call next(), res.send or res.end inside your middleware, 
                    // otherwise you wont see any result in the browser.

                    middleware(req, res, next);
                } catch (error) {
                    console.error('Middleware', middlewarePath, 'raised exception:', error);
                    res.send('500 Internal server error', 500);
                }
            })
        } catch (exception) {
            console.error('Could not initialize middleware', exception);
        }
    }
```

```js \
<< # Javascript globals >>+=
    function requireUncached(module){
        delete require.cache[require.resolve(module)]
        return require(module)
    }
```



## Auto open the browser with the url

Add the --open option which automatically opens the target
url in the browser. Cross platform open in browser isn't
as straighforward as it seems. We've had good experiences
with npm 'opn' package. 

Docs: https://www.npmjs.com/package/opn

An added benefit of using this option is that once you
start the ablayer, it immediately is put to work by the 
webbrowser, which is useful when doing small iterations
in development on ablayer.

```js \
<< # Javascript requirements >>
var opn = require('opn');
```

```js \
<< # Program option >>+=
yargs.option('open', {
    desc: 'Launch webbrowser at given url',
    default: false
})
```

```js \
<< # Server initialisation >>+=

if (argv.open) {
    var myUrl = 'http://localhost:' + (argv.port);
    opn(myUrl);
    console.log("Launching webbrowser at `%s`", myUrl);
}
```

## Search in all sources of a page.

How do you find a certain string in the current page 
(including all the resources it has loaded). For example:
I want to know which script defines some global, or which scripts
use some global. I need to be able to perform a page+resources search. 

```js \
<< # Program options >>
yargs.option('search', {
    desc: 'Search for a needle inside responses, defaults to case insensitive search, use search-re for regex search',
    default: false
});
yargs.option('search-re', {
    desc: 'Search for a needle using a regular expression. This will be case insensitive, example: search-re="abc?de*"'
});
```

```js \
<< # Server initialisation >>
var searchForNeedles = false;
if (argv.search) {
    searchForNeedles = new RegExp(argv.search, 'i');
}

if (argv.searchRe) {
    try { 
        searchForNeedles = new RegExp(argv.searchRe,'i');
    } catch (error) {
        console.error('Your search-re argument could not be interpretted as valid regular expression, use --search-re="blabla" for example');

        process.exit(1);
    }
}
```

```js \
<< # Proxy response decorations >> 

if (argv.search) {
    // Only search in plain text types.

    if (isPlainText) {
        if (searchForNeedles.test(content)) {
            console.log("Found needle in url `%s` (%s)", req.path, res.headers['content-type'].split(/;/).shift());
        }
    }
}
```

## Auto beautify option

We want to be able to output javascripts beautified...

2 methods:
- beautify when we add ?beautify to the url
- always beautify javascripts/css when given an option.. this 
will take up more cpu.

implement method 1:

Docs: https://www.npmjs.com/package/js-beautify

```js \
<< # Proxy response decorations >>+=

if (contentType.match('javascript')) {
    var shouldBeautify = argv.beautify || req.query.beautify;

    if (shouldBeautify) {
        var jsBeautify = require('js-beautify').js;
        content = jsBeautify(content);  
    }
}

```

## Further ideas and enhancements:

Also compile ideas: [ideas](ideas.md);


