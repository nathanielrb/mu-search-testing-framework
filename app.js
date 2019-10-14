import { app, query, errorHandler } from 'mu';

var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
const utils = require('/app/utils.js')

function drc(cmd) {
    return exec('cd /dkr && docker-compose --project-name ' + process.env.PROJECT_NAME + ' ' + cmd)
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

// Copy  Quads data in Virtuoso toLoad directory
// The /data directory used by Virtuoso must be shared
// TODO This has an obvious problem, when naming overlaps.
// A better solution would be to run Virtuoso with an
// overridden shared volume, but this opens the can of 
// networking worms...
function copyLoadFiles() {
    if (fs.existsSync('/config/toLoad') && fs.existsSync(process.env.VIRTUOSO_DATA_DIRECTORY)){
        var toLoadDir = process.env.VIRTUOSO_DATA_DIRECTORY + '/toLoad';
        var sourceDir = '/config/toLoad'

        if (!fs.existsSync(toLoadDir)){
            console.log("Creating directory: " + toLoadDir)
            fs.mkdirSync(toLoadDir);
        }

        var files = fs.readdirSync(sourceDir);
        files.forEach( file => { 
            console.log( "Copying file: " + file + ' to ' + toLoadDir);
            var source = fs.readFileSync(path.join(sourceDir, file));
            var destination = path.join(toLoadDir, file); //
            fs.writeFileSync(destination, source);
        }); 
     }

    return Promise.resolve();
}

// Cleans up any copied files from /toLoad directory
function cleanLoadFiles() {
    if (fs.existsSync('/config/toLoad') && fs.existsSync(process.env.VIRTUOSO_DATA_DIRECTORY)){
        var toLoadDir = process.env.VIRTUOSO_DATA_DIRECTORY + '/toLoad';

        var files = fs.readdirSync('/config/toLoad');
        files.forEach( file => { 
            var filepath = path.join(toLoadDir, file);
            console.log( "Removing file: " + file);
            fs.unlinkSync(filepath);
        }); 
     }

    return Promise.resolve();
}


// Startup

console.log("Welcome to the mu-search testing framework")

console.log('=== Warning ===\nThis will run queries on the triplestore and delete containers.\nYou have 3 seconds to press ctrl+c ctrl+c\n===============')

setTimeout( () => {}, 3000);

// do we need to share a network here?

// remove docker images
drc('kill elasticsearch musearch kibana database')
.then( () => { return drc('rm -fs elasticsearch musearch kibana database') })
// .then () => { return exec('docker ps | grep ' + process.env.PROJECT_NAME + " | awk '{print $1}' | xargs docker rm") }) // why is this necessary?

// remove elasticsearch data
// .then( () => { return  exec('rm -rf ' + process.env.ELASTICSEARCH_DATA_DIRECTORY) })

// copy Virtuoso toLoad data
exec('rm -rf ' + process.env.ELASTICSEARCH_DATA_DIRECTORY)
.then( () => { return copyLoadFiles();  })
.then( () => { return exec('ls /data/db/toLoad'); })

// bring up Virtuoso
.then( () => { return drc('up -d database') })
// .then( () => { console.log("going"); return drc('run -d --name kaleidos-project_database_1 -p 127.0.0.1:8890:8890 -v /data/kaleidos-project/data/db:/data database') })

// bring up Elasticsearch
.then( () => { return drc('up -d elasticsearch') })

// bring up mu-search
.then( () => { return drc('up -d musearch') })
// .then( () => { return drc("run -d -v /dkr/config/elastic:/config -p 127.0.0.1:9201:80 --link dkr_elasticsearch_1:elasticsearch musearch") })

// wait for Virtuoso
.then( () => { return retry('virtuoso', 500, () => { return queryVirtuoso(' ASK { ?s ?p ?o }') }) })

// clean up Virtuoso data
.then( () => { return cleanLoadFiles(); })

// clear Virtuoso
// TODO make this DELETE WHERE :-)
.then( () => { return queryVirtuoso(' SELECT * WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// wait for musearch
.then( () => { return retry('musearch', 5000, () => { return utils.musearch('GET','/health') }) }) //utils.musearchHealth('_all') }) })

// run tests
.then( () => { 
    testrunner.run({
        code: '/app/utils.js', 
        tests: '/config/tests.js'
    }, (err, report) => {
        console.log(report);
    });
})

// exit
// .then( () => { process.exit(); });
