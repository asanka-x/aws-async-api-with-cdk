const cdk = require('@aws-cdk/core');
const sqs = require('@aws-cdk/aws-sqs');
const apigateway = require('@aws-cdk/aws-apigateway');
const iam = require('@aws-cdk/aws-iam');


class AwsAsyncApiWithCdkStack extends cdk.Stack {
    /**
     *
     * @param {cdk.Construct} scope
     * @param {string} id
     * @param {cdk.StackProps=} props
     */
    constructor(scope, id, props) {
        super(scope, id, props);

        //Define the queues
        const asyncApiMessageDLQ = new sqs.Queue(this, 'asyncApiMessageDLQ', {});
        const asyncApiMessageQueue = new sqs.Queue(this, 'asyncApiMessageQueue', {
            deadLetterQueue: {
                maxReceiveCount: 3,
                queue: asyncApiMessageDLQ
            }
        });

        //Define the IAM role
        const asyncApiApigRole = new iam.Role(this, 'asyncApiApigRole', {
            assumedBy: new iam.ServicePrincipal('apigateway.amazonaws.com')
        });

        asyncApiApigRole.addToPolicy(new iam.PolicyStatement({
            resources: [
                asyncApiMessageQueue.queueArn
            ],
            actions: [
                'sqs:SendMessage'
            ]
        }));
        asyncApiApigRole.addToPolicy(new iam.PolicyStatement({
            resources: [
                '*'
            ],
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:DescribeLogGroups',
                'logs:DescribeLogStreams',
                'logs:PutLogEvents',
                'logs:GetLogEvents',
                'logs:FilterLogEvents'
            ]
        }));

        //Define API Gateway
        const asyncApi = new apigateway.RestApi(this, 'asyncApi', {
            endpointTypes: [
                apigateway.EndpointType.PRIVATE
            ],
            policy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        effect: iam.Effect.ALLOW,
                        actions: [
                            "execute-api:Invoke"
                        ],
                        resources: [
                            "*"
                        ],
                        conditions: {
                            "StringEquals": {
                                "aws:sourceVpc": "vpc-xxxxxxxxxx"
                            }
                        },
                        principals: [
                            new iam.AnyPrincipal()
                        ]
                    })
                ]
            }),
            deployOptions: {
                loggingLevel: apigateway.MethodLoggingLevel.INFO,
                dataTraceEnabled: true
            }
        });

        //Define API Gateway Integration
        const awsSqsIntegration = new apigateway.AwsIntegration({
            service: "sqs",
            integrationHttpMethod: "POST",
            options: {
                passthroughBehavior: apigateway.PassthroughBehavior.NEVER,
                credentialsRole: asyncApiApigRole,
                requestParameters: {
                    "integration.request.header.Content-Type": "'application/x-www-form-urlencoded'"
                },
                requestTemplates: {
                    "application/x-www-form-urlencoded": "Action=SendMessage&MessageBody=$util.urlEncode(\"$input.body\")&MessageAttribute.1.Name=queryParam1&MessageAttribute.1.Value.StringValue=$input.params(\"query_param_1\")&MessageAttribute.1.Value.DataType=String"
                },
                integrationResponses: [
                    {
                        statusCode: "200",
                        responseTemplates: {
                            "text/html": "Success"
                        }
                    },
                    {
                        statusCode: "500",
                        responseTemplates: {
                            "text/html": "Error"
                        },
                        selectionPattern: "500"
                    }
                ]
            },
            path: "027131882820/" + asyncApiMessageQueue.queueName
        });

        //Define API Gateway Resource
        const asyncEndpointResource = asyncApi.root.addResource('async_endpoint');


        //Define API Gateway Method
        asyncEndpointResource.addMethod('POST', awsSqsIntegration, {
            requestParameters: {
                "method.request.querystring.query_param_1": true
            },
            methodResponses: [
                {
                    statusCode: "200",
                    responseParameters: {
                        "method.response.header.Content-Type": true
                    }
                },
                {
                    statusCode: "500",
                    responseParameters: {
                        "method.response.header.Content-Type": true
                    },
                }
            ]
        });
    }
}

module.exports = {AwsAsyncApiWithCdkStack}
