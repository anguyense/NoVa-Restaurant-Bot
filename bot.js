console.log('The bot is starting.');

var cities = require('all-the-cities');
var fetch = require('node-fetch');
var fs = require('fs');
var Twit = require('twit');
var geolib = require('geolib');
var config = require('./config');
var { placeDetails } = require('@googlemaps/google-maps-services-js');

const noVa = ['Alexandria', 'Arlington', 'Fairfax', 'Fairfax Station', 'Falls Church', 
	      'West Falls Church', 'Loudoun Valley Estates', 'Manassas', 'Manassas Park', 'Reston', 
	      'Herndon', 'Annandale', 'Woodbridge', 'McLean', 'Vienna', 
	      'Leesburg', 'Chantilly', 'Centreville', 'Tysons Corner', 'Woodburn', 
	      'North Springfield', 'Springfield', 'West Springfield', 'Sterling', 'Potomac Mills', 
	      'Great Falls', 'Ashburn', 'Oakton', 'Baileys Crossroads', 'Burke', 
          'Bull Run', 'Lorton', 'Fredericksburg'];

const T = new Twit({
    consumer_key:         config.TWITTER_consumer_key,
    consumer_secret:      config.TWITTER_consumer_secret,
    access_token:         config.TWITTER_access_token,
    access_token_secret:  config.TWITTER_access_token_secret,
})

const G_api = config.GOOGLE_api_key;

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

console.log(cities.filter((city) => (city.adminCode.match('VA') && city.name.match('Clifton'))));

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

async function getDetails(obj) {
	if (obj?.place_id) {
		const details = await placeDetails({
			params: {
				key: G_api,
				place_id: obj.place_id,
				fields: ['photos', 'formatted_address'],
			},
			timeout: 1000,
		});
		return { details_photos: details.data.result.photos, formatted_address: details.data.result.formatted_address, ...obj };
	} else {
		throw new Error('details no obj?.place_id');
	}
}

function verifyNearby(obj) {
	const distn = geolib.getDistance(
		{ latitude: obj.geometry.location.lat, longitude: obj.geometry.location.lng },
		{
			latitude: obj.placeCoordinates[1],
			longitude: obj.placeCoordinates[0],
		}
	);
	console.log('distn', distn);
	if (distn > 161000) {
		console.log('-----> too far away');
		composeBot();
		throw new Error('too far away from place');
	}
	return obj;
}

async function searchStreetImage(obj) {
	//console.log('street obj', obj);
	const imageMeta = await fetch(
		`https://maps.googleapis.com/maps/api/streetview/metadata?size=640x640&location=${obj.geometry.location.lat},${obj.geometry.location.lng}&key=${G_api}`
	);
	const data = await imageMeta.json();
	console.log('imageMeta', data);
	if (data.status === 'ZERO_RESULTS') {
		console.log('No street view image');
		return obj;
	} else {
		console.log('YES street view image');
		const imageUrl = await fetch(
			`https://maps.googleapis.com/maps/api/streetview?size=640x640&return_error_codes=true&location=${obj.geometry.location.lat},${obj.geometry.location.lng}&key=${G_api}`
		)
			.then((result) => result.url)
			.catch((err) => console.log('street error', err));

		return {
			imageUrl,
			...obj,
		};
	}
}

async function getStreetImage(obj) {
	return new Promise(async (resolve, reject) => {
		if (obj.imageUrl) {
			console.log('YES getStreetImage');
			const response = await fetch(obj.imageUrl);
			const buffer = await response.buffer();
			await fs.writeFile(`./image1.jpg`, buffer, () => {
				console.log('getStreetImage finished downloading!');
				resolve(obj);
			});
		} else {
			console.log('NO getStreetImage');
			resolve(obj);
		}
	});
}

const writeFile = (uri, data, options) =>
	new Promise((resolve, reject) => {
		fs.writeFile(uri, data, (err) => {
			if (err) {
				return reject(`Error writing file: ${uri} --> ${err}`);
			}
			resolve(`Successfully wrote file`);
		});
	});

async function getDetailImages(obj) {
	const photosNeed = obj.imageUrl ? 3 : 4;
	if (!obj.details_photos || obj.details_photos.length < photosNeed) {
		console.log('Not enough detail images');
		composeBot();
		throw new Error('Not enough detail images');
	}
	const photos = obj.details_photos.slice(0, photosNeed);
	const i = obj.imageUrl ? 2 : 1;
	for (const photo of photos) {
		const response = await fetch(
			`https://maps.googleapis.com/maps/api/place/photo?maxwidth=640&photoreference=${photo.photo_reference}&key=${G_api}`
		);
		const buffer = await response.buffer();
		const write = await writeFile(`./image${i}.jpg`, buffer);
		i++;
	}
	return obj;
}

async function uploadTweetImages(obj) {
	const images = ['image1.jpg', 'image2.jpg', 'image3.jpg', 'image4.jpg'];
	const ids = images.map((image) => {
		const data = require('fs').readFileSync(`./${image}`);
		return twitter.post('media/upload', { media: data }).catch((error) => console.log('tweetImageUploader error', error));
	});
	const allIdObjs = await Promise.all(ids);
	const allIds = allIdObjs.map((obj) => obj.media_id_string);
	return {
		mediaIds: allIds,
		...obj,
	};
}

function tweet(obj) {
	return new Promise((resolve, reject) => {
		const params = {
			status: `${obj.name}; ${obj.formatted_address} https://www.google.com/maps/search/?api=1&query=${obj.geometry.location.lat}%2C${obj.geometry.location.lng}&query_place_id=${obj.place_id}`,
			media_ids: obj.mediaIds,
		};

		T.post('statuses/update', params, function (err, data, response) {
			if (err) {
				reject(err);
			}
			resolve(obj);
		});
	});
}

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

async function composeBot() {
	getPlace()
		.then((r) => searchNearby(r))
		.then((r) => getDetails(r))
		.then((r) => verifyNearby(r))
		.then((r) => searchStreetImage(r))
		.then((r) => getStreetImage(r))
		.then((r) => getDetailImages(r))
		.then((r) => uploadTweetImages(r))
		.then((r) => tweetIt(r))
		.then((r) => console.log('DONE', r))
		.catch((e) => {
			console.log('err', e.message);
		});
}

composeBot();
