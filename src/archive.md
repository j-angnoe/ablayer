# Archive/experiments

These wont be included in the official build.

## Statistics

*Experiment* 
This is an experiment to gather some statistics:
number of requests, request sizes, etc... 

First, we need an option

```js \
<< # Program options >>
yargs.option('stats', {
    desc: 'Gather statistics',
    default: false
});
```


```js \
<< # Server initialisation >> 

if (argv.stats) {
    var stats = {
        num_requests: 0
    };

    app.use((req, res, next) => {
        console.log("Incoming request: " + req.path);
        stats.num_requests++;

        res.on('exit', () =>{
            console.log("Done with " + req.path);
        });
        next();
    });

    // Pretty naive: Display stats every once in a while
    setInterval(() => {
        console.log(JSON.stringify(stats, null, 3));
    }, 2000);

}

```

There are some problems here...
How do we present our statistics?
A standalone `management` ui?
An on-page thing?

Dont do stuff that developer tools also do.
