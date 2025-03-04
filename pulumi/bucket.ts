
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region } from './config';
import { ruleset } from './ses-ruleset';

export const bucket = new aws.s3.BucketV2(
    "bucket",
    {
        bucketPrefix: "postal-plexus-",
    },
    { provider: awsProvider }
);

