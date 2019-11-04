FROM mu-semtech/mu-javascript-template
LABEL maintainer="nathaniel.rudavsky@gmail.com"


RUN apk add docker

RUN apk add py-pip
RUN apk update
RUN apk add python-dev libffi-dev openssl-dev gcc libc-dev make
RUN pip install --upgrade pip
RUN pip install docker-compose


ENV MU_SEARCH_ENDPOINT 'http://musearch'

ENV MU_RESOURCE_ENDPOINT 'http://resource'

ENV DATA_DIRECTORY '/data/kaleidos-project/data/testing'

ENV ELASTICSEARCH_DATA_DIRECTORY '/data/elasticsearch'

ENV PROJECT_NAME 'kaleidos-project'

ENV RESOURCE_SERVICE_NAME 'resource'

ENV DELTAS_SERVICE_NAME 'deltanotifier'

ENV ELASTIC_SERVICE_NAME 'elasticsearch'

ENV MUSEARCH_SERVICE_NAME 'musearch'

ENV VIRTUOSO_SERVICE_NAME 'database'