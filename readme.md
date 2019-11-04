# mu-search Testing Framework

## Setup

Because this application needs to run Docker and Docker Compose from within its container, a few additional shared volumes are necessary:
- The Docker socket needs to be exposed
- The project directory (where the `docker-compose.yml` file is located) needs to be shared as `/dkr` 
- an empty data folder must be created and shared as `/data`


```
  musearchtest:
    image: semtech/mu-search-testing-framework
    privileged: true
    volumes:
      - .:/dkr
      - ./config/mu-search-testing-framework:/config
      - ./data/testing:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      NODE_ENV: development
    tty: true
```

### Naming

Several standard service names are currently hard-coded.


## Running

```
# clean-up from previous runs
rm -rf data/testing/db/.d* data/testing/db/virtuoso.* data/testing/db/dumps

drc up --no-deps musearchtest
```



## Configuration

### Loading Triple data into Virtuoso

If `./config/mu-search-testing-framework` is the shared config directory, any triple data in `./config/mu-search-testing-framework/toLoad` will be loaded by Virtuoso in the testing environment.

### Writing Tests

Tests are written using the QUnit framework.

Authorization groups are defined as JSON objects:

```
var groups = {
    'interne-overheid-read': {"name" : "o-interne-overheid-read", "variables" : ["users"]},
    'admin' : {"name" : "o-admin-roles", "variables" : ["admin"]},
    'kabinetten' : {"name" : "o-kabinetten-read", "variables" : ["kabinetten"]},
    'kanselarij' : {"name" : "o-kanselarij-all", "variables" : ["kanselarij"]},
    'thepublic' : {"name" : "public", "variables" : []},
    'read' : {"name" : "read", "variables":[]},
    'clean' : {"name" : "clean", "variables": []}
}
```

Utility functions are provided for querying mu-search and mu-cl-resources. For instance, to run a simple mu-search query:

```
test("count musearch Turtle Soup Results", assert => {
    assert.expect(1);
    return queryMusearch('/cases/search?filter[title]=Turtle+Soup', [groups.read])
        .then( results => {
            assert.equal(results['count'], 1);
        })
});
```

To add a document via mu-cl-resources:

```
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
    .then(sleeper(2000))
    .then( () => { 
        return queryMusearch('/cases/search?filter[title]=gerrymandered', [groups.admin]) 
    })
        .then( results => {
            assert.equal(1, results['count']);
        })
});
```

Note that this example currently does *not* work, due to networking issues between mu-cl-resources and database-with-auth.

