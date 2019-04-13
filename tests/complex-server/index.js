/**
 * This complex server features cookies, CORS, ajax calls.
 */

const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();
const nocache = require('nocache');


app.use(nocache());
app.use(cookieParser());

var visits = 0;

app.use('/', express.static(__dirname));

app.get('/api/call1', (req, res) => {
    res.json({
      param: 'value'  
    })
});

app.get('/api/call2', (req, res) => {
    res.json({
      value: 'complex server value'
    })
});

app.get('/api/cookie', (req, res) => {
    res.json({
        cookies: req.cookies
    });
});

app.get('/api/clearcookie', (req, res) => {
    Object.keys(req.cookies).forEach(key => {
        res.clearCookie(key);
    })
    res.json({ok: true});
});
app.get('/api/setcookie', (req, res) => {

    res.cookie('complex_server_cookie', new Date(), {
        maxAge: 100000000,
        //domain: 'localhost:' + process.env.PORT,
        httpOnly: true,
        secure: false
    });

    res.json({ok: true});
})

app.listen(process.env.PORT, () => {
    console.log('Complex server started at ' + process.env.PORT);
});
