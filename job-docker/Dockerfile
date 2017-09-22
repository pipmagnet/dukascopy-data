FROM debian:stretch

RUN apt-get update && apt-get install -y \
    curl \
    xz-utils \
    python \
    python-pip

RUN pip install awscli

ADD cache.sh /

CMD ["/cache.sh"]
