#!/usr/bin/env node

const cdk = require('@aws-cdk/core');
const {AwsAsyncApiWithCdkStack} = require('../lib/aws-async-api-with-cdk-stack');

const app = new cdk.App();
new AwsAsyncApiWithCdkStack(app, 'AwsAsyncApiWithCdkStack', {
    env: {
        region: 'us-east-1'
    }
});
