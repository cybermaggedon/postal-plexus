
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { prefix, tags } from './config';
import { awsProvider } from './aws-provider';
import { vpc, pubSubnet } from './vpc';

// EFS file services security group
export const efsSg = new aws.ec2.SecurityGroup(
    "efs-sg",
    {
        vpcId: vpc.id,
        description: "Enables EFS access",
        ingress: [
            {
                protocol: 'tcp',
                fromPort: 2049,
                toPort: 2049,
                cidrBlocks: ['0.0.0.0/0'],
                ipv6CidrBlocks: ["::/0"],
            }
        ],
        egress: [
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ['0.0.0.0/0'],
                ipv6CidrBlocks: ["::/0"],
            }
        ],
        tags: {
            ...tags,
            "Name": prefix,
        }
    },
    { provider: awsProvider }
);

export const mailboxFileSystem = new aws.efs.FileSystem(
    "mailbox-file-system",
    {
        encrypted: true,
        tags: {
            ...tags,
            Name: prefix + "-mailbox",
        }
    },
    {
        provider: awsProvider,
    }
);

export const mailboxMountTarget = new aws.efs.MountTarget(
    "mailbox-mount-target",
    {
        fileSystemId: mailboxFileSystem.id,
        subnetId: pubSubnet.id,
        securityGroups: [efsSg.id],
    },
    { provider: awsProvider }
);

