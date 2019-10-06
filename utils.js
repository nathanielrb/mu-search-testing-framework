const request = require('request-promise-native');

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

//==-- exports --==//
const exports =  {
    muresource: muresource,
    musearch: musearch,
    queryMusearch: queryMusearch,
    deleteMusearchIndex: deleteMusearchIndex,
    reindexMusearch: reindexMusearch,
    musearchHealth: musearchHealth,
    sleeper: sleeper
}
export default exports;

export {
    muresource,
    musearch,
    queryMusearch,
    deleteMusearchIndex,
    reindexMusearch,
    musearchHealth,
    sleeper
};

