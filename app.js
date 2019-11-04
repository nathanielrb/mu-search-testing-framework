import { app, query, errorHandler } from 'mu';

var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
const utils = require('/app/utils.js')

// process.env.MU_SPARQL_ENDPOINT = 'http://virtuoso:8890/sparql' 

function drc(cmd) {
    return exec('cd /dkr && docker-compose --project-name ' + process.env.PROJECT_NAME + ' ' + cmd)
    .then( response => {
        console.log(response.stdout);
        console.log(response.stderr);
        return Promise.resolve();
    });
}

function dr(cmd) {
    return exec('docker ' + cmd)
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
                console.log('...');
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
drc('kill elasticsearch musearch kibana database database-with-auth deltanotifier resource')
.then( () => { return drc('rm -fs elasticsearch musearch kibana database') })

// Remove elasticsearch data
.then( () => { return exec('rm -rf ' + process.env.DATA_DIRECTORY + '/elasticsearch') })

// Bring up Virtuoso
.then( () => { return dr('kill database || true'); })
.then( () => { return dr('rm database || true'); })
.then( () => { 
    return drc('run -d --no-deps --name database -p 127.0.0.1:8890:8890 -v ' + process.env.DATA_DIRECTORY + '/db:/data database') 
})

// Bring up Elasticsearch
 .then( () => { return drc('up -d --no-deps elasticsearch') })

// Bring up Resources and Deltas
.then( () => { return drc('up -d --no-deps database-with-auth deltanotifier resource') })

// Bring up mu-search
 .then( () => { return drc('up -d --no-deps musearch') })


// Wait for Virtuoso
.then( () => { return retry('virtuoso', 500, () => { return query(' SELECT ?s WHERE { ?s ?p ?o } LIMIT 1') }) })


// Clear Virtuoso
.then( () => { return query(' DELETE WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// Wait for musearch
.then( () => { return retry('musearch', 5000, () => { return utils.musearch('GET','/health') }) })

// Run tests
.then( () => { 
    testrunner.run({
        code: '/app/utils.js', 
        tests: '/config/tests.js'
    }, (err, report) => {
        console.log(report);
    });
})
.then( () => {
//    dr('kill database');
})
// exit
// .then( () => { process.exit(); });
