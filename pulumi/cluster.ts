
import * as aws from "@pulumi/aws";

import { prefix, tags } from './config';
import { awsProvider } from './aws-provider';
import { logGroup } from './logs';

////////////////////////////////////////////////////////////////////////////

// ECS cluster and services

// ECS cluster
export const cluster = new aws.ecs.Cluster(
    "cluster",
    {
        name: prefix,
        configuration: {
            executeCommandConfiguration: {
                logging: "OVERRIDE",
                logConfiguration: {
                    cloudWatchLogGroupName: logGroup.name,
                },
            },
        },
        tags: tags,
    },
    { provider: awsProvider }
);

