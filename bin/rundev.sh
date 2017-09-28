#!/bin/sh

topdir=$(realpath "$(dirname "$0")/..")

docker build -t dukascopy-dev ${topdir}/dev-docker

docker run --rm -ti -v ${topdir}:/app dukascopy-dev /bin/sh


