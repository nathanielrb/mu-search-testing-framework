import { app, query, errorHandler } from 'mu';
const request = require('request-promise-native');
const util = require('util')
const exec = util.promisify(require('child_process').exec);
var testrunner = require("node-qunit");

console.log("Welcome to the mu-search testing framework")

console.log('=== Warning ===\nThis will run queries on the triplestore and delete containers.\nYou have 3 seconds to press ctrl+c ctrl+c\n===============')

function command(cmd) {
    return exec(cmd) //, (err, stdout, stderr) => {
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

function muSearch(method, path, groups, body) {
    console.log( 'Querying musearch: ' + path );
    var options = { 
        method: method,
        url: 'http://musearch' + path,
        headers: { 'MU_AUTH_ALLOWED_GROUPS': JSON.stringify(groups) },
        json: true
    }

    if(body) options.body = body

    return request(options)
}

function queryMuSearch(path, groups) {
    return muSearch('GET', path, groups);
}

function deleteMuSearchIndex(documentType, groups) {
    return muSearch('DELETE', '/' + documentType + '/delete', groups);
}

function reindexMuSearch(documentType, groups) {
    return muSearch('POST', '/' + documentType + '/index', groups);
}

setTimeout( () => {}, 3000)

// group sets
var readGroup = {"name" : "read", "variables" : []}
var publicGroup = {"name" : "public", "variables" : []}

command('cd /dkr')

// delete docker images
// .then( () => { return command('docker-compose rm -fs elasticsearch musearch kibana') })

// remove elasticsearch data
// .then( () => { return  command('sudo rm -rf data/elasticsearch/') })

// load Virtuoso data

// bring up docker images

// wait for musearch to be up

// clear Virtuoso
.then( () => { return queryVirtuoso(' SELECT * WHERE { GRAPH <http://mu.semte.ch/authorization> { ?s ?p ?o } }') })

// something with musearch
.then( () => { 
    return queryMuSearch('/cases/search?filter[title,data,subcaseTitle,subcaseSubTitle]=test', [readGroup])
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

// command('docker-compose up -d --remove-orphans')
