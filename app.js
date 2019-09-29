import { app, query, errorHandler } from 'mu';
const request = require('request-promise-native');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');

function delay(t, v) {
   return new Promise(function(resolve) { 
       setTimeout(resolve.bind(null, v), t)
   });
}

function retry(label, interval, callback){
    return callback()
        .then( () => { 
            console.log(label + ' is up'); 
            return Promise.resolve() 
        })
        .catch( (err) => { 
            console.log('Waiting for ' + label);
            console.log(JSON.stringify(err));
            return delay(interval).then( () => { return retry(label, interval, callback) } );
        });
}

function command(cmd) {
    return exec(cmd)
    .then( response => {
        console.log('Shell command: ' + JSON.stringify(response));
    });
}

function queryVirtuoso( q ) {
    return query( q )
        .then( response => {
            console.log('Virtuoso: ' +  JSON.stringify(response ));
        })
        .catch( err => {
            console.log( "Oops, something went wrong with this Virtuoso query: " + ( err ) );
        });
}

function musearch(method, path, groups, body) {
    console.log( 'Querying musearch: ' + process.env.MU_SEARCH_ENDPOINT + path );
    var options = { 
        method: method,
        url: process.env.MU_SEARCH_ENDPOINT + path,
        headers: { 'MU_AUTH_ALLOWED_GROUPS': JSON.stringify(groups) },
        json: true
    }

    if (body) options.body = body

    return request(options)
}

function queryMusearch(path, groups) {
    return musearch('GET', path, groups);
}

function deleteMusearchIndex(documentType, groups) {
    return musearch('DELETE', '/' + documentType + '/delete', groups);
}

function reindexMusearch(documentType, groups) {
    return musearch('POST', '/' + documentType + '/index', groups);
}

function musearchHealth(type){
    return musearch('GET','/' + type + '/health');
}

// Startup

console.log("Welcome to the mu-search testing framework")

console.log('=== Warning ===\nThis will run queries on the triplestore and delete containers.\nYou have 3 seconds to press ctrl+c ctrl+c\n===============')

setTimeout( () => {}, 3000)

// Put Quads data in Virtuoso toLoad directory
// The /data directory used by Virtuoso must be shared
// TODO This has an obvious problem, when naming overlaps
function copyLoadFiles() {
    if (fs.existsSync('/config/toLoad') && fs.existsSync(process.env.VIRTUOSO_DATA_DIRECTORY)){
        var loadDir = process.env.VIRTUOSO_DATA_DIRECTORY + '/toLoad';

        if (!fs.existsSync(loadDir)){
            console.log("Creating directory: " + loadDir)
            fs.mkdirSync(loadDir);
        }

        var files = fs.readdirSync('/config/toLoad');
        files.forEach( (file) => { 
            console.log( "Copying file: " + file + ' to ' + loadDir);
            var source = path.join(loadDir, path.basename(file));
            var destination = fs.readFileSync(path.join('/config/toLoad', file));
            fs.writeFileSync(source, destination);
        }); 
     }
}

// Cleans up any copied files from /toLoad directory
// TODO This has an obvious problem, when naming overlaps
function cleanLoadFiles() {
    if (fs.existsSync('/config/toLoad') && fs.existsSync(process.env.VIRTUOSO_DATA_DIRECTORY)){
        var loadDir = process.env.VIRTUOSO_DATA_DIRECTORY + '/toLoad';

        var files = fs.readdirSync('/config/toLoad');
        files.forEach( (file) => { 
            var filepath = path.join('/config/toLoad', file);
            console.log( "Removing file: " + filepath);
            fs.unlinkSync(filepath);
        }); 
     }
}

// group sets
var readGroup = {"name" : "read", "variables" : []}
var publicGroup = {"name" : "public", "variables" : []}

command('cd /dkr')

// delete docker images
// .then( () => { return command('docker-compose rm -fs elasticsearch musearch kibana') })

// remove elasticsearch data
// .then( () => { return  command('sudo rm -rf data/elasticsearch/') })

// load Virtuoso data
.then( () => { copyLoadFiles(); return Promise.resolve(); })

// bring up docker images
// command('docker-compose up -d --remove-orphans')

// wait for Virtuoso
.then( () => { return retry('virtuoso', 500, () => { return queryVirtuoso(' ASK { ?s ?p ?o }') }) })

// clean up Virtuoso data
.then( () => { cleanLoadFiles(); return Promise.resolve(); })

// clear Virtuoso
// TODO make this DELETE WHERE :-)
.then( () => { return queryVirtuoso(' SELECT * WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// wait for musearch
.then( () => { return retry('musearch', 5000, () => { return musearchHealth('_all') }) })

// something with musearch
.then( () => { 
    return queryMusearch('/cases/search?filter[title,data,subcaseTitle,subcaseSubTitle]=test', [readGroup])
        .then( results => {
            console.log('musearch: ' + results['count'] + ' RESULTS!!!!')
        })
        .catch( err => {
            console.log('ERROR: ' + err);
        })
})

// run tests
.then( () => { 
    testrunner.run({
        code: '/app/empty.js', 
        tests: '/config/tests.js'
    }, (err, report) => {
        console.log(report);
    });
});




// command("docker-compose exec -T virtuoso isql-v <<EOF
// SPARQL DELETE WHERE {   GRAPH <http://mu.semte.ch/authorization> {     ?s ?p ?o.   } };
// exec('checkpoint');
// exit;
// EOF")

