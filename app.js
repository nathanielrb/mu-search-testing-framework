import { app, query, errorHandler } from 'mu';

var testrunner = require("node-qunit");
const fs = require("fs");
var path = require('path');
const util = require('util');
const exec = util.promisify(require('child_process').exec);
const utils = require('/app/utils.js');

function drc(cmd, failsafe) {
    var command = 'cd /dkr && docker-compose --project-name ' + process.env.PROJECT_NAME + ' ' + cmd
    if(failsafe)
        command += ' || true'
    return exec(command)
    .then( response => {
        console.log(response.stdout);
        console.log(response.stderr);
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
    });
}

function retry(label, interval, callback, repeat){
    return callback()
        .then( result => { 
            console.log(label + ' is up'); 
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



(async () => {
    // Remove docker images
    console.log('Killing database and elasticsearch (if they exist)');
    await drc('kill ' + process.env.DATABASE_SERVICE + ' ' + process.env.ELASTIC_SERVICE, true);
    await drc('rm -fs ' +  process.env.DATABASE_SERVICE + ' '  + process.env.ELASTIC_SERVICE, true);
    await dr('kill ' + process.env.DATABASE_SERVICE + ' ' + process.env.ELASTIC_SERVICE, true);

    // Remove data
    await exec('rm -rf /data/*');

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
    // Bring up Virtuoso
    await drc('run --rm -d --use-aliases --no-deps --name ' + process.env.DATABASE_SERVICE + ' -p 127.0.0.1:8890:8890 -v ' + process.env.DATA_DIRECTORY + '/db:/data ' + process.env.DATABASE_SERVICE);
    
    // Bring up Elasticsearch
    await drc('run --rm -d --use-aliases --no-deps --name ' + process.env.ELASTIC_SERVICE + ' -p 127.0.0.1:9200:9200 -v ' + process.env.DATA_DIRECTORY + '/elasticsearch:/usr/share/elasticsearch/data ' + process.env.ELASTIC_SERVICE);

    // Wait for Virtuoso
    await retry('virtuoso', 3000, () => { return query(' SELECT ?s WHERE { ?s ?p ?o } LIMIT 1') });

    // Clear Virtuoso
    await query(' DELETE WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }');

    // Wait for musearch
    await retry('musearch', 3000, () => { return utils.musearch('GET','/health') });

    // Run tests
    await testrunner.run({
                code: '/app/utils.js', 
                tests: '/config/tests.js'
            }, (err, report) => {
                console.log(report);
                console.log("Tests complete.");

                if(!(process.env.DEBUG == "true" || process.env.DEBUG == "True" || process.env.DEBUG == "TRUE")){
                    exec('rm -rf /data/*');
                    dr('kill ' + process.env.DATABASE_SERVICE + ' ' + process.env.ELASTIC_SERVICE); 
                    drc('kill'); // murder-suicide
                }
            });
})();
