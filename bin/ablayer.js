var express = require('express');
var path = require('path');
var fs = require('fs');

var proxy = require('express-http-proxy');
    // https://github.com/villadora/express-http-proxy

var url = require('url');

var argv; // will be initiated later on.

var yargs = require('yargs');
var opn = require('opn');
var nocache = require('nocache');
var mkdirp = require('mkdirp');
    // docs: https://www.npmjs.com/package/mkdirp

var abtestFileExists = false;

function periodicallyCheckABtestFile() {
    if (fs.existsSync('abtest.js')) {
        abtestFileExists = true;
    } else {
        setTimeout(periodicallyCheckABtestFile, 5000);
    }
}

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

    function requireUncached(module){
        delete require.cache[require.resolve(module)]
        return require(module)
    }

function saveContentAt(filePath, content) {
    var savePath = path.join(process.cwd(), filePath);

    // Auto append index.html to directories.
    if (savePath.substr(-1) === "/") {
        savePath += "index.html";
    }

    var saveDir = path.dirname(savePath);

    return new Promise((resolve, reject) => {
        mkdirp(saveDir, err => {
            if (err) {
                // The directory could not be created...
                console.info('[saveContentAt] Could not create directory %s, (%s)', saveDir, error); 
                // But attempt to write anyways.
            }
    
            fs.writeFile(savePath, content, err => {
                if (err) {
                    console.error('[saveContentAt] Could not save file %s, (%s)', savePath, error);        
                    return reject();
                } else {
                    console.log('Saved file `%s`', savePath);        
                    return resolve();
                }  
            })
        });
    })
}

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

yargs.option('search', {
    desc: 'Search for a needle inside responses, defaults to case insensitive search, use search-re for regex search',
    default: false
});
yargs.option('search-re', {
    desc: 'Search for a needle using a regular expression. This will be case insensitive, example: search-re="abc?de*"'
});
yargs.option('cors', {
    desc: 'Allow all origins and headers',
    default: false
});

yargs.option('middleware', {
    desc: 'Supply a middleware file',
    default: false
})

yargs.option('save', {
    desc: 'Save all proxied files to disk',
    default: false
});

function main(argv) {    
    var runFrom = argv._[0] || '.';
    process.chdir(runFrom);

    var app = express();

    
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

app.use(nocache());

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

if (argv.open) {
    var myUrl = 'http://localhost:' + (argv.port);
    opn(myUrl);
    console.log("Launching webbrowser at `%s`", myUrl);
}

    
    app.use('/', express.static(process.cwd()));

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

        
if (argv.search) {
    // Only search in plain text types.

    if (isPlainText) {
        if (searchForNeedles.test(content)) {
            console.log("Found needle in url `%s` (%s)", req.path, res.headers['content-type'].split(/;/).shift());
        }
    }
}
    if (isHtml && abtestFileExists) {
        content = injectAblayerBanner(content);
    }
    if (isPlainText) {
        content = replaceForeignHost(content, getCallingHost(req));
    }

if (contentType.match('javascript')) {
    var shouldBeautify = argv.beautify || req.query.beautify;

    if (shouldBeautify) {
        var jsBeautify = require('js-beautify').js;
        content = jsBeautify(content);  
    }
}

if (req.query && req.query['ab:save']) {
    saveContentAt(req.path, content);
}

if (argv.save) {
    saveContentAt(req.path, content);
}

        return content;
    }
}));
    

    app.listen(argv.port, function () {
    console.log(`AB-layer against ${argv.url} started at ${argv.port}`)
    console.log('Serving files from ' + process.cwd());
    console.log('Hit Control + C to stop this server.');
});    
}


// Start the program
argv = yargs.argv;
if (!argv.url) {
    yargs.showHelp();
    process.exit(1);
}
main(argv);


// # sourceMappingURL=ablayer.js.map

//# sourceMappingURL=ablayer.js.map