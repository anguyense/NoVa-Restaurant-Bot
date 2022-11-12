console.log('The bot is starting.');

var cities = require('all-the-cities');
var fetch = require('node-fetch');
var fs = require('fs');
var Twit = require('twit');
var geolib = require('geolib');
var config = require('./config');
var { placeDetails } = require('@googlemaps/google-maps-services-js');

const T = new Twit({
    consumer_key:         config.TWITTER_consumer_key,
    consumer_secret:      config.TWITTER_consumer_secret,
    access_token:         config.TWITTER_access_token,
    access_token_secret:  config.TWITTER_access_token_secret,
})

const G = config.GOOGLE_api_key;

function tweetIt() {
    var r = Math.floor(Math.random()*100);
    
    var tweet = {
        status: 'Hello world! ' + r
    }
    
    T.post('statuses/update', tweet, tweeted);
    
    function tweeted(err, data, response) {
        if (err) {
            console.log('Tweet went wrong!');
            console.log(err);
        } else {
            console.log('Tweet worked!');
        }
    }
}

function rand(array) {
    var i = Math.floor(Math.random() * array.length);
    return array[i];
}

//tweetIt();
//setInterval(tweetIt, 1000*30);
