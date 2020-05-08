# mu-search Testing Framework

## Overview

The mu-search testing framework allows mu-search to be tested *in situ* with arbitrary triples data, and tests using the QUnit javascript unit test suite. It can be added to an existing project.


## Setup

Because this application runs Docker and Docker Compose from within its container, a few additional shared volumes are necessary:

- the Docker socket needs to be exposed
- the project directory (where the `docker-compose.yml` file is located) needs to be shared as `/dkr` 
- an empty data folder must be created and shared as `/data`

The project name (directory) must also be specified, to ensure correct naming and networking.

Finally, the absolute path to the data directory needs to be specified.

```
  musearchtest:
    image: semtech/mu-search-testing-framework
    privileged: true
    volumes:
      - .:/dkr
      - ./config/testing:/config
      - ./data/testing:/data
      - /var/run/docker.sock:/var/run/docker.sock
    environment:
      NODE_ENV: development
      PROJECT_NAME: my-project
      DATA_DIRECTORY: ./data/testing
    tty: true
```

### Naming

By default, Elasticsearch service is called `elasticsearch`, and Virtuoso `database`. These can be parameterized:

```
    environment:
      ELASTIC_SERVICE: elasticsearch2
      DATABASE_SERVICE: mydatabase
```

The endpoints `MU_SEARCH_ENDPOINT` and `MU_RESOURCE_ENDPOINT` can also be parameterized as needed.


## Running

The mu-search testing framework runs two services from within its container, Elasticsearch and Virtuoso. All other services necessary for testing should be brought up first, without dependencies:

```
# drc up --no-deps -d resource deltanotifier musearch
```

Then bring up mu-search-test

```
# drc up musearchtest
```

### Shutting Down

If mu-search-test is shut down prematurely, it may leave two containers running with unconventional names (`database` instead of `my-project_database_75751dd7f14f`, etc.):

```
# drc ps
Name            Command           State                 Ports               
------------------------------------------------------------------------------
database        /bin/bash /virtuoso.sh           Up      1111/tcp, 127.0.0.1:8890->8890/tcp
elasticsearch   /usr/local/bin/docker-entr ...   Up      9200/tcp, 9300/tcp                
```

These need to be killed directly through Docker:

```
# docker kill database elasticsearch
```



## Configuration

### Loading Triple data into Virtuoso

If `./config/testing` is the shared config directory, then any triple data in `./config/testing/toLoad` will be loaded by Virtuoso in the testing environment.

### Writing Tests

Tests are written using the QUnit framework, and must be defined in the file `./config/testing/tests.js`.

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

Note that this example currently will only work if delta notifications to mu-search are correctly configured.



