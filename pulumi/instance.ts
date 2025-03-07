
// Creates an ECS cluster using EC2 compute

import * as fs from 'fs';
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";

import { vpc, pubSubnet } from './vpc';
import { awsProvider } from './aws-provider';
import {
    prefix, tags, region, volumeSize
} from './config';
import {
    outboundSecurityGroup, lmtpSecurityGroup, smtpSecurityGroup,
    mailboxSecurityGroup
} from './security-groups';
import { address } from './address';
import { cluster } from './cluster';

// Amazon Linux 2023 Arm64 AMI LTS in London
//const ami = "ami-03c97cf0c8e01613d";

const instanceType = "t4g.nano";

////////////////////////////////////////////////////////////////////////////

const image = aws.ec2.getAmiOutput({
    mostRecent: true,
    owners: ["amazon"],
    filters: [
        {
            name: "architecture",
            values: ["arm64"],
        },
        {
            name: "name",
            values: ["al2023-ami-ecs-hvm-2023.0.20250224*"],
        },
    ],
});

// image.id.apply(console.log);

////////////////////////////////////////////////////////////////////////////

const userData = cluster.name.apply(
    (name) => `#!/bin/bash\necho ECS_CLUSTER=${name} >> /etc/ecs/ecs.config\n`
).apply(
    (data) => btoa(data)
);

////////////////////////////////////////////////////////////////////////////

// ssh key, elliptic curve
export const sshKey = new tls.PrivateKey(
    "ssh-key",
    {
        algorithm: "ED25519",
    }
);

export const keypair = new aws.ec2.KeyPair(
    "keypair",
    {
        keyName: prefix + "-key",
        publicKey: sshKey.publicKeyOpenssh,
        tags: tags,
    },          
    { provider: awsProvider, }
);

////////////////////////////////////////////////////////////////////////////

const role = new aws.iam.Role(
    "ec2-role",
    {
	assumeRolePolicy: JSON.stringify({
	    Version: "2012-10-17",
	    Statement: [{
		Action: "sts:AssumeRole",
		Effect: "Allow",
		Principal: {
		    Service: "ec2.amazonaws.com",
		},
	    }],
	}),
        inlinePolicies: [
        ],
    },
    { provider: awsProvider, }
);

const rolePolicyAttachment = new aws.iam.RolePolicyAttachment(
    "ec2-role-policy-attachment",
    {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role"
    },
    { provider: awsProvider }
);


// Create instance profile
const instanceProfile = new aws.iam.InstanceProfile(
    "ec2-instance-profile",
    {
        role: role.name,
    },
    { provider: awsProvider, }
);

////////////////////////////////////////////////////////////////////////////

export const eni = new aws.ec2.NetworkInterface(
    "network-interface",
    {
	subnetId: pubSubnet.id,
	securityGroups: [
            outboundSecurityGroup.id, mailboxSecurityGroup.id,
            lmtpSecurityGroup.id, smtpSecurityGroup.id,
        ],
    },
    { provider: awsProvider, }
);

export const assoc = new aws.ec2.EipAssociation(
    "assocation",
    {
	allocationId: address.id,
	networkInterfaceId: eni.id,
    },
    { provider: awsProvider, }
);

export const instance = new aws.ec2.Instance(
    "ec2-instance",
    {
	ami: image.id,
	availabilityZone: region + "a",
	ebsOptimized: false,
	enclaveOptions: {
            enabled: false,
	},
	instanceType: instanceType,
	keyName: keypair.keyName,
	networkInterfaces: [
	    {
		deviceIndex: 0,
		networkInterfaceId: eni.id,
		deleteOnTermination: false,
	    }
	],
	iamInstanceProfile: instanceProfile.name,
	rootBlockDevice: {
            volumeSize: 30,
            volumeType: "gp3",
            deleteOnTermination: true,
            encrypted: true,
            tags: {
		Name: prefix,
		...tags,
            },
	},
        metadataOptions: {
	    httpEndpoint: 'enabled',
	    httpPutResponseHopLimit: 2,
	},
	tags: {
	    Name: prefix,
	    ...tags,
	},
	userData: userData,
	userDataReplaceOnChange: true,
    },
    { provider: awsProvider, }
);

