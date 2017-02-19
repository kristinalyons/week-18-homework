// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
// var logger = require("morgan");
var mongoose = require("mongoose");
// Requiring my Note and Article models
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");
// My scraping tools
var request = require("request");
var cheerio = require("cheerio");
// Mongoose mpromise deprecated - use bluebird promises
var Promise = require("bluebird");

mongoose.Promise = Promise;

// Initialize express
var app = express();

// Use morgan and body-parser with my app
// app.use(logger("dev"));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Make a public static dir
app.use(express.static("public"));

// Database configuration with mongoose
mongoose.connect("mongodb://localhost/");
var db = mongoose.connection;

// Show any mongoose errors
db.on("error", function(error) {
    console.log("Mongoose Error: ", error);
});

// Once logged into the db through mongoose, log a success message
db.once("open", function() {
    console.log("Mongoose connection successful.");
});

// Routes
// ========

// Simple index route 
app.get("/", function(req, res) {
    res.send(index.html);
});

// A GET request to scrape the CNN website 
app.get("/scrape", function(req, res) {
    // First, grab the body of the html with request
    request("https://www.tmz.com", function(error, response, html) {
        // Then, load that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(html);
        // Now, grab every p tag with the title class, and do the following:
        $("p.title").each(function(i, element) {

            // Save an empty result object
            var result = {};

            // Add the text and href of every link, and save them as properties of the result object
            result.title = $(this).children("a").text();
            result.link = $(this).children("a").attr("href");

            // Using the Article model, create a new entry
            // This effectively passes the result object to the entry (and the title and link)
            var entry = new Article(result);

            // Now, save that entry to the db
            entry.save(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                // Or log the doc
                else {
                    console.log(doc);
                }
            });

        });
    });
    // Tell the browser that I finished scraping the text
    res.send("Scrape complete.");
});

// This will get the articles I scraped from mongodb
app.get("/articles", function(req, res) {
    // Grab every doc in the Articles array
    Article.find({}, function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Or send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// Grab an article by its ObjectId
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in my db
    Article.findOne({ "_id": req.params.id })
    // and populate all of the notes associated with it
    .populate("note")
    // Now, execute my query
    .exec(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise, send the doc to the browser as a json object
        else {
            res.json(doc);
        }
    });
});

// Create a new note or replace an existing note
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    var newNote = new Note(req.body);

    // And save the new note to the db
    newNote.save(function(error, doc) {
        // Log any errors
        if (error) {
            console.log(error);
        }
        // Otherwise
        else {
            // Use the article id to find and update its note
            Article.findOneAndUpdate({ "_id": req.params.id }, { "note": doc._id })
            // Execute the above query
            .exec(function(err, doc) {
                // Log any errors
                if (err) {
                    console.log(err);
                }
                else {
                    // Or send the document to the browser
                    res.send(doc);
                }
            });
        }
    });
});

// Listen on port 3000
app.listen(3000, function() {
    console.log("App listening on port 3000!");
});