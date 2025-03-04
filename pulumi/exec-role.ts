
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { prefix, tags } from './config';
import { awsProvider } from './aws-provider';
import { dovecotLogGroup } from './logs';

const assumeRolePolicy = JSON.stringify({
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
});

const policies = pulumi.all([
    dovecotLogGroup.arn
]).apply(
    ([dovecotLogs]) => [
        {
            name: "Logs",
            policy: JSON.stringify({
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Action": "logs:*",
                        "Effect": "Allow",
                        "Resource": dovecotLogs,
                        "Sid": "TasksAccessLogs"
                    },
                ]
            }),
        }
    ]
);

// Execution role for ECS containers.  This allows normal ECS operations
// the containers need
export const execRole = new aws.iam.Role(
    "execution-role",
    {
        name: prefix + "-ECSExecutionRole",
        assumeRolePolicy: assumeRolePolicy,
        inlinePolicies: policies,
        tags: tags,
    },
    { provider: awsProvider }
);

const execPolicyAttachment = new aws.iam.RolePolicyAttachment(
    "execution-policy",
    {
        role: execRole.name,
        policyArn:
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    },
    { provider: awsProvider }
);

