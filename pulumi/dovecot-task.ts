
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { prefix, tags, region, users } from './config';
import { awsProvider } from './aws-provider';
import { mailboxFileSystem } from './efs';
import { dovecotImageName } from './dovecot-image';
import { execRole } from './exec-role';
import { cluster } from './cluster';
import { serviceNamespace } from './service-discovery';
import { dovecotLogGroup } from './logs';
import { serviceKey, serviceCert, caCert } from './certs';

const mmCpu = "256";
const mmMemory = "96";

// Execution role for ECS containers.  This allows normal ECS operations
// the containers need
export const taskRole = new aws.iam.Role(
    "dovecot-task-role",
    {
        name: prefix + "-dovecot-task-role",
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

const env = pulumi.all([
    serviceCert.certPem, serviceKey.privateKeyPem, caCert.certPem,
]).apply(
    ([cert, key, caCert]) => {
        return users.map(
            (user, ix) => {
                return {
                    name: `MAIL_USER_${ix}`,
                    value: user.user,
                };
            }
        ).concat(
            users.map(
                (user, ix) => {
                    return {
                        name: `MAIL_PASSWORD_${ix}`,
                        value: user.password,
                    };
                }
            )
        ).concat([
            {
                name: "TLS_CERTIFICATE",
                value: cert
            },
            {
                name: "TLS_KEY",
                value: key
            },
            {
                name: "TLS_CA_CERTIFICATE",
                value: caCert
            },
        ]);
    }
);

// Dovecot task definition
const dovecotTaskDefinition = new aws.ecs.TaskDefinition(
    "dovecot-task-definition",
    {
        family: prefix + "-dovecot-task-definition",
        cpu: mmCpu,
        memory: mmMemory,
        networkMode: "bridge",
        executionRoleArn: execRole.arn,
        taskRoleArn: taskRole.arn,
        containerDefinitions: pulumi.jsonStringify(
            [
                {
                    name: "dovecot",
                    image: dovecotImageName,
                    essential: true,
                    environment: env,
                    portMappings: [
                        {
                            containerPort: 143,
                            hostPort: 143,
                            protocol: "tcp",
                            name: "imap"
                        },
                        {
                            containerPort: 993,
                            hostPort: 993,
                            protocol: "tcp",
                            name: "imaps"
                        },
                        {
                            containerPort: 12345,
                            hostPort: 12345,
                            protocol: "tcp",
                            name: "sasl"
                        },
                        {
                            containerPort: 24,
                            hostPort: 24,
                            protocol: "tcp",
                            name: "lmtp"
                        }
                    ],
                    mountPoints: [
                        {
                            sourceVolume: "mailbox",
                            containerPath: "/var/mailbox",
                        },
                    ],
                    logConfiguration: {
                        logDriver: "awslogs",
                        options: {
                            "awslogs-group": prefix + "-dovecot",
                            "awslogs-region": region,
                            "awslogs-create-group": "true",
                            "awslogs-stream-prefix": "dovecot"
                        }
                    }
                }
            ]
        ),
	volumes: [
            {
                name: "mailbox",
                efsVolumeConfiguration: {
                    fileSystemId: mailboxFileSystem.id,
                }
	    },
	],
        tags: tags,
    },
    {
        provider: awsProvider,
    }
);

// ServiceDiscovery services that will provide DNS hostnames for
// ECS tasks
const sdDovecotService = new aws.servicediscovery.Service(
    "dovecot-discovery",
    {
        name: "dovecot",
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
const dovecotService = new aws.ecs.Service(
    "dovecot-service",
    {
        name: "dovecot",
        cluster: cluster.arn,
	healthCheckGracePeriodSeconds: 60,
        desiredCount: 1,
        deploymentMinimumHealthyPercent: 0,
        deploymentMaximumPercent: 100,
        taskDefinition: dovecotTaskDefinition.arn,
        serviceRegistries: {
                containerName: "dovecot",
                containerPort: 143,
                registryArn: sdDovecotService.arn
        },
        waitForSteadyState: false,
        tags: tags,
    },
    {
        provider: awsProvider,
        dependsOn: dovecotLogGroup,
    }
);

//pulumi.jsonStringify(dovecotService).apply(console.log);
//console.log(dovecotService.endpoints);


