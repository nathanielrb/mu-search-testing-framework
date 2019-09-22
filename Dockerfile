FROM semtech/mu-javascript-template
LABEL maintainer="nathaniel.rudavsky@gmail.com"

RUN apk add docker

# RUN apk add py-pip
# RUN apk update
# RUN apk add python-dev libffi-dev openssl-dev gcc libc-dev make
# RUN pip install --upgrade pip
# RUN pip install docker-compose
