# Ideas for enhancement
An in-page pop-over for ab-layer:

Gives us some room for additional features.
Like statistics, View sources, Search in Sources, and 
quickly copy-to-local sources.. Block/Allow sources

Pros: 
- Easy access

Cons: 
- Risk of interfering with product-under-test.

Alternative ways:
- Distribute as a browser extension
- Delivery of resources via websockets. 
- Just run on a different port..
- runs in an iframe...

## An ablayer manager ui

## A way to look at it
Basically ablayer is an extremely useful element of 
a reverse-engineers toolkit.

## A quick save option, via url.

if you add `?ab:save=1` or `&ab:save=1` to the url, ablayer will save the document to 
the current working directory.


```js \
<< # Proxy response decorations >>+=
if (req.query && req.query['ab:save']) {
    saveContentAt(req.path, content);
}
```

We may want to make this async, but this was quickest.


# Save all feature:

First we need a function that allows us to write a file to some 
directory, without worrying about the creation of (sub)directories
saveContentAt will deliver.

```js \
<< # Javascript globals >>+=

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
```

It requires the npm package mkdirp, which will recursively 
create directories (if needed)

```js \
<< # Javascript requirements >>+=
var mkdirp = require('mkdirp');
    // docs: https://www.npmjs.com/package/mkdirp
```

```js \
<< # Program options >>+=
yargs.option('save', {
    desc: 'Save all proxied files to disk',
    default: false
});
```

```js \
<< # Proxy response decorations >>+=

if (argv.save) {
    saveContentAt(req.path, content);
}
```

Please note that the     funny mechanism here is:
Each (new) resource will be proxied only once. At second
load it will be read from disk.