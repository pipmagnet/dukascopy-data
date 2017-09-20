#!/bin/sh -e

curl -sSL https://download.docker.com/linux/static/stable/x86_64/docker-17.06.2-ce.tgz -o docker.tgz
tar -xf docker.tgz
cp docker/* /usr/bin/
