#!/bin/sh -e

TAG=$(git rev-parse --short HEAD)

docker build -t ${DOCKER_IMAGE}:${TAG} job-docker

`aws ecr get-login --registry-ids ${AWS_ACCOUNT_ID} --no-include-email`

docker push ${DOCKER_IMAGE}:${TAG}

if aws cloudformation describe-stacks --stack-name ${CF_STACK_NAME}
then
    aws cloudformation update-stack --parameters ParameterKey=imageurl,ParameterValue=${DOCKER_IMAGE}:${TAG} --stack-name ${CF_STACK_NAME} --template-body file://cf/template.yml --capabilities CAPABILITY_IAM
else
    aws cloudformation create-stack --parameters ParameterKey=imageurl,ParameterValue=${DOCKER_IMAGE}:${TAG} --stack-name ${CF_STACK_NAME} --template-body file://cf/template.yml --capabilities CAPABILITY_IAM
fi

