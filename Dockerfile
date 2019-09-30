FROM mu-javascript-template-with-docker
LABEL maintainer="nathaniel.rudavsky@gmail.com"


# RUN apk add docker

# RUN apk add py-pip
# RUN apk update
# RUN apk add python-dev libffi-dev openssl-dev gcc libc-dev make
# RUN pip install --upgrade pip
# RUN pip install docker-compose


ENV MU_SEARCH_ENDPOINT 'http://musearch'

ENV MU_RESOURCE_ENDPOINT 'http://resource'

ENV VIRTUOSO_DATA_DIRECTORY '/data'

ENV ELASTICSEARCH_DATA_DIRECTORY 'data/elasticsearch'