const keys = require('./keys');

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

// pgClinet connection

const { pool } = require('pg');

const pgClient = new pool({
    user: keys.pgUser,
    password: keys.pgPassword,
    host: keys.pgHost,
    port: keys.pgPort,
    database: keys.pgDatabase

});

pgClient.on('error', error => console.error(error));

pgClient
    .query('CREATE TABLE IF NOT EXISTS values (number INT)')
    .catch(error => console.error(error));

const redis = require('redis');

const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
})

const redisPublisher = redisClient.duplicate();


app.get('/', (req,res) => {
    res.send('HI');
})

app.get('/values/all',  async (req,res) => {
    const values = await pgClient.query('SELECT * from values');
    res.send(values.rows);
})

app.get('/values/current', async (req,res) => {
    redisClient.hgetall('values', (err,values) => {
        res.send(values);
    })
})


app.post('/values', async (req,res) => {
    const index =  req.body.index;

    if (parseInt(index) > 40) {
        return res.status(422).send('Index to high');
    }

    redisClient.hset('values', index, 'Nothing yet');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values(number) VALUES($1)', [index]);

    res.send({working:true})
})


app.listen('5000', () => {
    console.log('listening');
})