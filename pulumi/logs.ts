
import * as aws from "@pulumi/aws";

import { prefix, tags } from './config';
import { awsProvider } from './aws-provider';

////////////////////////////////////////////////////////////////////////////

// Log groups for CloudWatch

export const logGroup = new aws.cloudwatch.LogGroup(
    "log-group",
    {
        name: prefix,
        tags: tags
    },
    {
        provider: awsProvider
    }
);

export const dovecotLogGroup = new aws.cloudwatch.LogGroup(
    "dovecot-log-group",
    {
        name: prefix + "-dovecot",
        tags: tags
    },
    {
        provider: awsProvider
    }
);

export const deliverLogGroup = new aws.cloudwatch.LogGroup(
    "deliver-log-group",
    {
        name: prefix + "-deliver",
        tags: tags
    },
    {
        provider: awsProvider
    }
);

export const postfixLogGroup = new aws.cloudwatch.LogGroup(
    "postfix-log-group",
    {
        name: prefix + "-postfix",
        tags: tags
    },
    {
        provider: awsProvider
    }
);

