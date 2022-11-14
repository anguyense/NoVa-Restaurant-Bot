# NoVa Restaurant Bot
 Source for https://twitter.com/NoVa_Rests_Bot. 
 
 Inspired by https://twitter.com/_restaurant_bot, which is on an international scale.

 This Twitter bot posts about random restaurants in Northern Virginia daily using the Twitter and Google Maps Places API. These posts contain the name, address, star rating, Google maps link, and four pictures.

 <b>Note:</b> At the time of creating this bot (Nov 13, 2022), the ```'node-fetch``` package from v3 is an ESM-only module, so it is unable to be imported with require(). If you want to continue using this package while using ```require()``` for your other packages, you will want to ```npm install node-fetch@2```. Alternatively, you will need to add ```"type": "module"``` to your ```package.json``` file. This will break your other ```require()``` statements, so you would need to change those to ```import```.
