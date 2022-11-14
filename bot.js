console.log('The bot is starting.');

var cities = require('all-the-cities');
var fetch = require('node-fetch');
var fs = require('fs');
var Twit = require('twit');
var geolib = require('geolib');
var config = require('./config');
var { placeDetails } = require('@googlemaps/google-maps-services-js');

const noVa = ['Alexandria', 'Arlington', 'Fairfax', 'Fairfax Station', 'Falls Church', 'West Falls Church', 'Loudoun Valley Estates', 'Manassas', 'Manassas Park', 'Reston', 'Herndon', 'Annandale', 'Woodbridge', 'McLean', 'Vienna', 'Leesburg', 'Chantilly', 'Centreville', 'Tysons Corner', 'Woodburn', 'North Springfield', 'Springfield', 'West Springfield', 'Sterling', 'Potomac Mills', 'Great Falls', 'Ashburn', 'Oakton', 'Baileys Crossroads', 'Burke', 'Bull Run'];

const T = new Twit({
    consumer_key:         config.TWITTER_consumer_key,
    consumer_secret:      config.TWITTER_consumer_secret,
    access_token:         config.TWITTER_access_token,
    access_token_secret:  config.TWITTER_access_token_secret,
})

const G_api = config.GOOGLE_api_key;

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

function getPlace() {
	return new Promise(async (resolve, reject) => {
		const places = cities.filter((city) => (city.adminCode.match('VA') && noVa.includes(city.name)));
        const countries = places.map((place) => place.country);
        const country = rand(countries);
        const countryPlaces = places.filter((place) => place.country === country);
        const place = rand(countryPlaces);
		resolve(place.loc.coordinates);
	});
}

async function searchNearby(placeCoordinates) {
	const nearPlaces = await fetch(
		`https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${placeCoordinates[1]},${placeCoordinates[0]}&radius=5000&type=restaurant&key=${G_api}`
	);
	const nearArr = await nearPlaces.json();

	const nearFiltered = nearArr.results.filter(
		(place) => !place.name.includes('Hotel') && !place.types.includes('lodging') && !place.types.includes('gas_station')
	);
	const nearOne = rand(nearFiltered);
	return { placeCoordinates, ...nearOne };
}
