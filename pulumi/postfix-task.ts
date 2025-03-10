
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import {
    prefix, tags, region, users, endpointHostname, mailDomains, mailboxes,
    aliases
} from './config';
import { awsProvider } from './aws-provider';
import { postfixImageName } from './postfix-image';
import { execRole } from './exec-role';
import { cluster } from './cluster';
import { serviceNamespace } from './service-discovery';
import { smtpSecurityGroup } from './security-groups';
import { emailSmtpUsername, emailSmtpPassword } from './ses-user';
import { postfixLogGroup } from './logs';
import { serviceKey, serviceCert } from './certs';
import { eni } from './instance';

const mmCpu = "256";
const mmMemory = "96";

// Execution role for ECS containers.  This allows normal ECS operations
// the containers need
export const taskRole = new aws.iam.Role(
    "postfix-task-role",
    {
        name: prefix + "-postfix-task-role",
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
        tags: tags,
    },
    { provider: awsProvider }
);

// postfix task definition
const postfixTaskDefinition = new aws.ecs.TaskDefinition(
    "postfix-task-definition",
    {
        family: prefix + "-postfix-task-definition",
        cpu: mmCpu,
        memory: mmMemory,
        networkMode: "bridge",
        executionRoleArn: execRole.arn,
        taskRoleArn: taskRole.arn,
        containerDefinitions: pulumi.jsonStringify(
            [
                {
                    name: "postfix",
                    image: postfixImageName,
                    essential: true,
                    environment: [
                        {
                            name: "RELAY_USERNAME",
                            value: emailSmtpUsername
                        },
                        {
                            name: "RELAY_PASSWORD",
                            value: emailSmtpPassword
                        },
                        {
                            name: "RELAY_HOST",
                            value: `email-smtp.${region}.amazonaws.com`
                        },
                        {
                            name: "RELAY_PORT",
                            value: "2587"
                        },
                        {
                            name: "LMTP_HOST",
                            value: eni.privateIp
                        },
                        {
                            name: "LMTP_PORT",
                            value: "24"
                        },
                        {
                            name: "SASL_AUTH_HOST",
                            value: eni.privateIp
                        },
                        {
                            name: "SASL_AUTH_PORT",
                            value: "12345"
                        },
                        {
                            name: "TLS_KEY",
                            value: serviceKey.privateKeyPem
                        },
                        {
                            name: "TLS_CERTIFICATE",
                            value: serviceCert.certPem
                        },
                        {
                            name: "HOSTNAME",
                            value: "localhost"
                        },
                        {
                            name: "MAIL_DOMAINS",
                            value: mailDomains.join(" ")
                        },
                        {
                            name: "MAILBOXES",
                            value: mailboxes.join(" ")
                        },
                        {
                            name: "ALIASES",
                            value: aliases.map(
                                (a) => `${a.alias}=${a.destination}`
                            ).join(" ")
                        },

                    ],
                    portMappings: [
                        {
                            containerPort: 587,
                            hostPort: 587,
                            protocol: "tcp",
                            name: "submission"
                        }
                    ],
                    logConfiguration: {
                        logDriver: "awslogs",
                        options: {
                            "awslogs-group": prefix + "-postfix",
                            "awslogs-region": region,
                            "awslogs-create-group": "true",
                            "awslogs-stream-prefix": "postfix"
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

// ServiceDiscovery services that will provide DNS hostnames for
// ECS tasks
const sdPostfixService = new aws.servicediscovery.Service(
    "postfix-discovery",
    {
        name: "postfix",
        dnsConfig: {
            namespaceId: serviceNamespace.id,
            dnsRecords: [
                {
                    ttl: 10,
                    type: "SRV",
                }
            ],
            routingPolicy: "MULTIVALUE",
        },
        healthCheckCustomConfig: {
            failureThreshold: 1,
        },
    },
    { provider: awsProvider }
);

// Service
const postfixService = new aws.ecs.Service(
    "postfix-service",
    {
        name: "postfix",
        cluster: cluster.arn,
	healthCheckGracePeriodSeconds: 60,
        desiredCount: 1,
        deploymentMinimumHealthyPercent: 0,
        deploymentMaximumPercent: 100,
        taskDefinition: postfixTaskDefinition.arn,
        serviceRegistries: {
            containerName: "postfix",
            containerPort: 587,
            registryArn: sdPostfixService.arn,
        },
        waitForSteadyState: false,
        tags: tags,
    },
    {
        provider: awsProvider,
        dependsOn: postfixLogGroup,
    }
);

