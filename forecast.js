// setting up server reqs
process.stdin.setEncoding("utf8");
let path = require('path');
let app = require('express')();
let axios = require('axios');

// setting up ejs/dotenv
app.set("views", path.resolve(__dirname, "templates"));
app.set("view engine", "ejs");
require("dotenv").config({ path: path.resolve(__dirname, '.env') }) 

//all database related info
let user = process.env.MONGO_DB_USERNAME;
let password = process.env.MONGO_DB_PASSWORD;
let db_info = {db: "WeatherDB", collection:"savedLocations"};
let { MongoClient, ServerApiVersion } = require('mongodb');
let uri = `mongodb+srv://${user}:${password}@mabdul03.qijkuh2.mongodb.net/?retryWrites=true&w=majority`;
// 'mongodb+srv://meerabdullah:u37dg92WpkbE9byd@mabdul03.qijkuh2.mongodb.net/?retryWrites=true&w=majority&appName=mabdul03'
let client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });

// if argument isnt 3, break.
if (process.argv.length != 3) {
    console.log("Enter valid arguments: 'node forecast.js <some_port>'");
    process.exit(0);
}

// otherwise start web server on given port.
port = process.argv[2];
console.log(`Web server started and running at http://localhost:${port}`);

// Enter 'stop' to end IIFE function
(function () {
    process.stdout.write("Stop to shutdown the server: ");
    process.stdin.on('readable', function() {
        // read cmd
        let cmd = process.stdin.read();
        if (cmd !== null) {
            // trim, if not null, check if lowercase is stop, and if so, shut down server
            cmd = cmd.trim();
            if (cmd.toLowerCase() == "stop") {
                process.stdout.write("Shutting down the server\n");
                process.exit(0);
            }
            // else print out invalid cmd
            process.stdout.write(`Invalid command: ${cmd}\n`);
        }
        // continue to prompt user if server not shut down
        process.stdout.write("Stop to shutdown the server: ");
        process.stdin.resume();
    });
})();

// create server and use body parser
require('http').createServer(app).listen(port);
app.use(require("body-parser").urlencoded({extended: false}));

// create paths/routes for get requests
app.get('/', (_, res) => res.render('index'));
app.get('/saveLocationForm', (_, res) => res.render('saveLocation'));
app.get('/searchSavedWeather', (_, res) => res.render('searchSavedWeather'));

/* get weather API call */
app.get('/getWeather', (req, res) => {
    // arguments and URL with API key
    const city = req.query.city;
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=imperial&appid=${process.env.API_KEY}`;

    // IIFE func calling API, returned rendered data.
    (async function() {
        try {
            const resp = await axios.get(url);
            res.render("weather", {city: city, weatherData: resp.data}); 
        } catch (error) {
            //console.error('Error fetching weather data:', error);
            res.render("weather", {city: city, weatherData: null, error: 'Failed to fetch weather data'});
        }
    })();
});

/* save location form */
app.post("/saveLocationForm", (req, res) => {
    // get args from body
    const { name, password, city } = req.body;

    // IIFE
    (async function(){
        try {
            // connect to db, insert, and output given html
            await client.connect();
            const collection = client.db(db_info.db).collection(db_info.collection);
            await collection.insertOne({ name, password, city });
            let output = `<h1>Location Saved!</h1><p><b>Name:</b>`;
            output += ` ${name}</p><p><b>City:</b> ${city}</p>`;
            output += `<hr><a href="\/">Home</a>`;
            res.send(output);
        } catch (error) {
            //console.error("Failed to save to database:", error);
            res.status(500).send("Failed to save the location");
        } finally {
            await client.close();
        }
    })();
});

/* get saved weather */
app.post('/retrieveSavedWeather', (req, res) => {
    // get args from request
    const { name, password } = req.body;

    // IIFE function
    (async function(){
        try {
            // connect to DB, find the given entry, output corresponding HTML
            await client.connect();
            const collection = client.db(db_info.db).collection(db_info.collection);
            const user = await collection.findOne({ name: name, password: password });
            if (user) {
                let output = `<h1>Saved Weather Data</h1><p><b>Name:</b> ${user.name}</p>`;
                output += `<p><b>City:</b> ${user.city}</p><hr><a href="/">Home</a>`;
                res.send(output);
            }

            let output = `<h1>No Data Found</h1><p>Incorrect name or password.</p><hr>`;
            output += `<a href="/searchSavedWeather">Try Again</a>`;
            output += `<br><a href="/">Home</a>`;
            res.send(output);
        } catch (error) {
            //console.error("Error retrieving saved data:", error);
            res.status(500).send("Failed to retrieve saved data");
        } finally {
            await client.close();
        }
    })();
});
