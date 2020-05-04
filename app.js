import { app, query, errorHandler } from 'mu';

var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
const utils = require('/app/utils.js')

// process.env.MU_SPARQL_ENDPOINT = 'http://virtuoso:8890/sparql' 

const database = process.env.DATABASE_SERVICE || 'database';
const elasticsearch = process.env.ELASTICSEARCH_SERVICE || 'elasticsearch';

function drc(cmd, failsafe) {
    var command = 'cd /dkr && docker-compose --project-name ' + process.env.PROJECT_NAME + ' ' + cmd
    if(failsafe)
        command += ' || true'
    return exec(command)
    .then( response => {
        console.log(response.stdout);
        console.log(response.stderr);
        return Promise.resolve();
    });
}

function dr(cmd, failsafe) {
    var command = 'docker ' + cmd;
    if(failsafe)
        command += ' || true'
    return exec(command)
    .then( response => {
        console.log(response.stdout);
        console.log(response.stderr);
        return Promise.resolve();
    });
}

function queryVirtuoso( q ) {
    return query( q )
        .then( response => {
            return Promise.resolve();
        })
}

function retry(label, interval, callback, repeat){
    return callback()
        .then( result => { 
            console.log(label + ' is up'); 
            return Promise.resolve() 
        })
        .catch( err => { 
            if(repeat)
                console.log('Still waiting for ' + label + '...');  
            else 
                console.log('Waiting for ' + label + '...');
            return utils.sleeper(interval)().then( () => { return retry(label, interval, callback, true) } );
        });
}
 

// Startup
console.log("Welcome to the mu-search testing framework")

console.log('\n\n====== Warning ======\nThis will run queries on the triplestore and delete containers.\nYou have 3 seconds to press ctrl+c ctrl+c\n=====================\n\n')

setTimeout( () => {}, 3000);


// Create clean Virtuoso data directory with toLoad files
var sourceDir = '/config/toLoad';
if (fs.existsSync(sourceDir)){
    utils.rmdirRecursive('/data/db');
    
    fs.mkdirSync('/data/db');
    fs.mkdirSync('/data/db/toLoad');

    var files = fs.readdirSync(sourceDir);
    files.forEach( file => { 
        var source = fs.readFileSync(path.join(sourceDir, file));
        var destination = path.join('/data/db/toLoad', file); //
        fs.writeFileSync(destination, source);
    }); 
}


// Remove docker images
console.log('Killing database and elasticsearch (if they exist)');
drc('kill ' + database + ' ' + elasticsearch, true)
.then( () => { return drc('rm -fs ' +  database + ' '  + elasticsearch, true) })
.then( () => { return dr('kill database elasticsearch', true); })

// Remove data
.then( () => { return exec('rm -rf ' + process.env.DATA_DIRECTORY + '/*') })

// Bring up Virtuoso
.then( () => { 
    return drc('run -d --no-deps --name ' + database + ' -p 127.0.0.1:8890:8890 -v ' + process.env.DATA_DIRECTORY + '/db:/data ' + database) 
})

// Bring up Elasticsearch
.then( () => { 
    return drc('run -d --no-deps --name ' + elasticsearch + ' -v ' + process.env.DATA_DIRECTORY + '/elasticsearch:/usr/share/elasticsearch/data ' + elasticsearch) 
})

// Wait for Virtuoso
.then( () => { return retry('virtuoso', 3000, () => { return query(' SELECT ?s WHERE { ?s ?p ?o } LIMIT 1') }) })

// Clear Virtuoso
.then( () => { return query(' DELETE WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// Wait for musearch
.then( () => { return retry('musearch', 3000, () => { return utils.musearch('GET','/health') }) })

// Run tests
.then( () => { 
   return testrunner.run({
        code: '/app/utils.js', 
        tests: '/config/tests.js'
    }, (err, report) => {
        console.log(report);
        console.log("Tests complete.");
        dr('kill database elasticsearch'); 
        drc('kill'); // murder-suicide
    });
})
