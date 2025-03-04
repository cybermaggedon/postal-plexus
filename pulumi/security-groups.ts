
// Security group

import * as aws from "@pulumi/aws";
import { prefix, tags, pubSubnetCidr } from './config';
import { vpc } from './vpc';
import { awsProvider } from './aws-provider';

export const mailboxSecurityGroup = new aws.ec2.SecurityGroup(
    "mailbox-security-group",
    {
        vpcId: vpc.id,
        description: "Enables access to EC2",
        ingress: [
            {
                protocol: 'tcp',
                fromPort: 587,
                toPort: 587,
                cidrBlocks: [ "0.0.0.0/0" ],
            },
            {
                protocol: 'tcp',
                fromPort: 993,
                toPort: 993,
                cidrBlocks: [ "0.0.0.0/0" ],
            },
            {
                protocol: 'tcp',
                fromPort: 143,
                toPort: 143,
                cidrBlocks: [ "0.0.0.0/0" ],
            },
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

export const lmtpSecurityGroup = new aws.ec2.SecurityGroup(
    "lmtp-security-group",
    {
        vpcId: vpc.id,
        description: "Enables access to EC2",
        ingress: [
            {
                protocol: 'tcp',
                fromPort: 24,
                toPort: 24,
                cidrBlocks: [ pubSubnetCidr ],
            },
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

// Just outbound
export const outboundSecurityGroup = new aws.ec2.SecurityGroup(
    "outbound-security-group",
    {
        vpcId: vpc.id,
        description: "Enables outbound access",
        ingress: [
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

export const nodeSecurityGroup = outboundSecurityGroup;


export const smtpSecurityGroup = new aws.ec2.SecurityGroup(
    "smtp-security-group",
    {
        vpcId: vpc.id,
        description: "Enables access to EC2",
        ingress: [
            {
                protocol: 'tcp',
                fromPort: 25,
                toPort: 25,
                cidrBlocks: [ "0.0.0.0/0" ],
            },
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

