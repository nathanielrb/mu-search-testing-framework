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

console.log("Welcome to the tests");

test("A basic test example", assert => {
    assert.ok(true, "this test is fine");
    var value = "hello";
    assert.equal("hello", value, "We expect value to be hello");
});

// Query mu-search
test("count musearch Turtle Soup Results", assert => {
    assert.expect(1);
    return queryMusearch('/cases/search?filter[title]=Turtle+Soup', [groups.read])
        .then( results => {
            assert.equal(results['count'], 1);
        })
});


// Run resources request then query mu-search to see if Deltas were ingested
// This won't work until we resolve drc networking issues (resources isn't talking to database-with-auth)
//
// var newcase = {
//     data: {
//         type: 'cases',
//         attributes: {
//             title: 'A Gerrymandered Case'
//         }
//     }
// }

// test("Add data, check if updates applied", assert => {
//     assert.expect(1);
//     return muresource('POST', '/cases', [groups.admin], newcase)
//     .then(sleeper(2000))
//     .then( () => { 
//         return queryMusearch('/cases/search?filter[title]=gerrymandered', [groups.admin]) 
//     })
//         .then( results => {
//             assert.equal(1, results['count']);
//         })
//     .catch( err => { console.log("ERR: " + JSON.stringify(err)); })
// });
