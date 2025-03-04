
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { prefix, tags, region, users } from './config';
import { awsProvider } from './aws-provider';
import { deliverImageName } from './deliver-image';
import { execRole } from './exec-role';
import { cluster } from './cluster';
import { mailTopic } from './ses-topic';
import { bucket } from './bucket';
import { deliverLogGroup } from './logs';
import { eni } from './instance';

const mmCpu = "256";
const mmMemory = "64";

export const taskRole = new aws.iam.Role(
    "deliver-task-role",
    {
        name: prefix + "-deliver-task-role",
        assumeRolePolicy: JSON.stringify({
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Action": "sts:AssumeRole",
                    "Principal": {
                        "Service": "ecs-tasks.amazonaws.com"
                    },
                    "Effect": "Allow",
                    "Sid": "TasksAccessEcsFunctions"
                },
            ]
        }),
        inlinePolicies: [
            {
                name: "AllowS3Access",
                policy: bucket.arn.apply(arn => JSON.stringify({
                   "Version": "2012-10-17",
                   "Statement": [
                       {
                           "Sid": "AllowS3Access",
                           "Effect": "Allow",
                           "Action": [
                               "s3:*"
                           ],
                           "Resource": [
                               arn,
                               arn + "/*",
                           ]
                       }
                   ]
                })),
            },
            {
                name: "AllowSQSAccess",
                policy: mailTopic.arn.apply(arn => JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "AllowSQSAccess",
                            "Effect": "Allow",
                            "Action": [
                                "sqs:*"
                            ],
                            "Resource": arn,
                        }
                    ]
                })),
            },
            {
                name: "AllowSQS",
                policy: mailTopic.arn.apply(arn => JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "AllowSQS",
                            "Effect": "Allow",
                            "Action": [
                                "sqs:*"
                            ],
                            "Resource": "*"
                        }
                    ]
                })),
            }
        ],
        tags: tags,
    },
    { provider: awsProvider }
);

// deliver task definition
const deliverTaskDefinition = new aws.ecs.TaskDefinition(
    "deliver-task-definition",
    {
        family: prefix + "-deliver-task-definition",
        cpu: mmCpu,
        memory: mmMemory,
        runtimePlatform: {
            operatingSystemFamily: "LINUX",
            cpuArchitecture: "ARM64"
        },
        networkMode: "bridge",
        executionRoleArn: execRole.arn,
        taskRoleArn: taskRole.arn,
        containerDefinitions: pulumi.jsonStringify(
            [
                {
                    name: "deliver",
                    image: deliverImageName,
                    essential: true,
                    environment: [
                        {
                            name: "LMTP_HOST",
                            value: eni.privateIp
                        },
                        {
                            name: "AWS_DEFAULT_REGION",
                            value: region
                        }
                    ],
                    logConfiguration: {
                        logDriver: "awslogs",
                        options: {
                            "awslogs-group": prefix + "-deliver",
                            "awslogs-region": region,
                            "awslogs-create-group": "true",
                            "awslogs-stream-prefix": "deliver"
                        }
                    }
                }
            ]
        ),
        tags: tags,
    },
    {
        provider: awsProvider,
    }
);

// Service
const deliverService = new aws.ecs.Service(
    "deliver-service",
    {
        name: "deliver",
        cluster: cluster.arn,
	healthCheckGracePeriodSeconds: 60,
        desiredCount: 1,
        deploymentMinimumHealthyPercent: 0,
        deploymentMaximumPercent: 100,
        taskDefinition: deliverTaskDefinition.arn,
        waitForSteadyState: false,
        tags: tags,
    },
    {
        provider: awsProvider,
        dependsOn: deliverLogGroup,
    }
);

