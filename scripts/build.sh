#!/bin/sh -ex

TAG=${CIRCLE_BRANCH}

docker build -t ${DOCKER_IMAGE}:${TAG} job-docker

`aws ecr get-login --registry-ids ${AWS_ACCOUNT_ID} --no-include-email`

docker push ${DOCKER_IMAGE}:${TAG}

aws cloudformation deploy --parameter-overrides "imageurl=${DOCKER_IMAGE}:${TAG}" --stack-name ${CF_STACK_NAME} --template-file cf/template.yml --capabilities CAPABILITY_IAM

