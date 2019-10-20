import { app, query, errorHandler } from 'mu';

var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
const utils = require('/app/utils.js')

// process.env.MU_SPARQL_ENDPOINT = 'http://virtuoso:8890/sparql' 

function drc(cmd) {
    return exec('cd /kaleidos-project && docker-compose --project-name ' + process.env.PROJECT_NAME + ' ' + cmd)
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
        .catch( err => {
            console.log( "Oops, something went wrong with this Virtuoso query: " + ( err ) );
        });
}

function retry(label, interval, callback){
    return callback()
        .then( () => { 
            console.log(label + ' is up'); 
            return Promise.resolve() 
        })
        .catch( err => { 
            console.log('Waiting for ' + label + '...');
            return utils.sleeper(interval)().then( () => { return retry(label, interval, callback) } );
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
//    if (!fs.existsSync('/data/db')){
        fs.mkdirSync('/data/db');
  //  }

    //if (!fs.existsSync('/data/db/toLoad')){
        fs.mkdirSync('/data/db/toLoad');
//    }

    // var files = fs.readdirSync('/data/db/virtuoso*');
    // files.forEach( file => { 
    //     fs.unlinkSync(path.join('/data/db', file));
    // }); 

    // fs.unlinkSync('/data/db/.data-loaded');
    // fs.unlinkSync('/data/db/.dba_pwd_set');


    var files = fs.readdirSync(sourceDir);
    files.forEach( file => { 
        console.log( "Copying file: " + file);
        var source = fs.readFileSync(path.join(sourceDir, file));
        var destination = path.join('/data/db/toLoad', file); //
        fs.writeFileSync(destination, source);
    }); 
}


// Remove docker images
drc('kill elasticsearch musearch kibana database')
.then( () => { return drc('rm -fs elasticsearch musearch kibana database') })
.then( () => { return dr('kill database || true'); })
.then( () => { return dr('rm database || true'); })

// Remove elasticsearch data
.then( () => { return exec('rm -rf ' + process.env.DATA_DIRECTORY + '/elasticsearch') })

// Bring up Virtuoso
//    .then( () => { return drc('up -d database') })
.then( () => { return drc('run -d --no-deps --name database -p 127.0.0.1:8890:8890 -v ' + process.env.DATA_DIRECTORY + '/db:/data database') })

// Bring up Elasticsearch
 .then( () => { return drc('up -d --no-deps elasticsearch') })

// Bring up mu-search
 .then( () => { return drc('up -d --no-deps musearch') })
// .then( () => { return drc("run --name musearch -d -v /dkr/config/elastic:/config -p 127.0.0.1:9201:80 --link jelly_database:database musearch") })

// Wait for Virtuoso
.then( () => { return retry('virtuoso', 500, () => { return queryVirtuoso(' ASK { ?s ?p ?o }') }) })

// Clear Virtuoso
// TODO make this DELETE WHERE :-)
.then( () => { return queryVirtuoso(' SELECT * WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// Wait for musearch
.then( () => { return retry('musearch', 5000, () => { return utils.musearch('GET','/health') }) }) //utils.musearchHealth('_all') }) })

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
    dr('kill database');
})
// exit
// .then( () => { process.exit(); });
