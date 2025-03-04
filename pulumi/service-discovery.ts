
import * as aws from "@pulumi/aws";

import { prefix, tags } from './config';
import { awsProvider } from './aws-provider';
import { vpc } from './vpc';

////////////////////////////////////////////////////////////////////////////

// Private DNS namespace.
export const namespace = new aws.servicediscovery.PrivateDnsNamespace(
    "private-dns-namespace",
    {
        name: prefix,
        description: prefix,
        vpc: vpc.id,
        tags: tags,
    },
    { provider: awsProvider }
);

export const serviceNamespace = namespace;

