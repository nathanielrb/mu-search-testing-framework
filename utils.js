const request = require('request-promise-native');
const fs = require('fs');

function sleeper(ms) {
  return function(x) {
    return new Promise(resolve => setTimeout(() => resolve(x), ms));
  };
}

function muresource(method, path, groups, body) {
    console.log( 'Querying resources: ' +  path );
    var options = { 
        method: method,
        url: process.env.MU_RESOURCE_ENDPOINT + path,
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'MU_AUTH_ALLOWED_GROUPS': JSON.stringify(groups) 
        },
        json: true
    }
    console.log("Resources received: %j", body);
    if (body) options.body = body

    return request(options)
}

function musearch(method, path, groups, body) {
    console.log( 'Querying musearch: ' +  path );
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


function rmdirRecursive(path){
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + "/" + file;
            if(fs.lstatSync(curPath).isDirectory()) { // recurse
                rmdirRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}

//==-- exports --==//
const exports =  {
    muresource: muresource,
    musearch: musearch,
    queryMusearch: queryMusearch,
    deleteMusearchIndex: deleteMusearchIndex,
    reindexMusearch: reindexMusearch,
    musearchHealth: musearchHealth,
    sleeper: sleeper,
    rmdirRecursive: rmdirRecursive
}
export default exports;

export {
    muresource,
    musearch,
    queryMusearch,
    deleteMusearchIndex,
    reindexMusearch,
    musearchHealth,
    sleeper,
    rmdirRecursive
};

