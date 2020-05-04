// Group sets
var groups = {
    'interne-overheid-read': {"name" : "o-interne-overheid-read", "variables" : ["users"]},
    'admin' : {"name" : "o-admin-roles", "variables" : ["admin"]},
    'kabinetten' : {"name" : "o-kabinetten-read", "variables" : ["kabinetten"]},
    'kanselarij' : {"name" : "o-kanselarij-all", "variables" : ["kanselarij"]},
    'thepublic' : {"name" : "public", "variables" : []},
    'read' : {"name" : "read", "variables":[]},
    'clean' : {"name" : "clean", "variables": []}
}

console.log("Welcome to the sample tests.");

test("A basic test example", assert => {
    assert.ok(true, "this test is fine");
    var value = "hello";
    assert.equal("hello", value, "We expect value to be hello");
});

// Query mu-search

test("count musearch Turtle Soup Results", assert => {
    assert.expect(1);
    return queryMusearch('/cases/search?filter[title]=Chicken+Stew', [groups.read])
        .then( results => {
            assert.equal(results['count'], 1);
        })
});

// Run resources request then query mu-search to see if Deltas were ingested
// This will only work if delta updates are sent to musearch. 

var newcase = {
    data: {
        type: 'cases',
        attributes: {
            title: 'A Gerrymandered Case'
        }
    }
}

test("Add data, check if updates applied", assert => {
    assert.expect(1);
    return muresource('POST', '/cases', [groups.admin], newcase)
	.then( (res) => { console.log("Received from resources: %j", res) })
    .then(sleeper(2000))
    .then( () => { 
        return queryMusearch('/cases/search?filter[title]=gerrymandered', [groups.admin]) 
    })
        .then( results => {
            assert.equal(1, results['count']);
        })
    .catch( err => { console.log("Error on resources Update: " + JSON.stringify(err)); })
});
