
import * as pulumi from "@pulumi/pulumi";
import { local } from "@pulumi/command";
import * as aws from "@pulumi/aws";

import { prefix, region, tags, version } from './config';
import { awsProvider } from './aws-provider';
import { postfixRepo, postfixRegistry } from './registry';

// Tag the local container image and push to ECR

const podman = "podman";

const localImageName = `localhost/postfix:${version}`
export const remoteImageName = postfixRepo.repositoryUrl.apply(
    x => `${x}:${version}`
);

const tagCommand = pulumi.all(
    [localImageName, remoteImageName]
).apply(
    ([local, remote]) => {
	return `${podman} tag ${local} ${remote}`
    }
);

const taggedImage = new local.Command(
    "tagged-image-postfix",
    {
	create: tagCommand,
    },
    {
	dependsOn: [postfixRepo]
    }
);

const ecrLoginCommand = postfixRegistry.apply(x =>
    `${podman} login ` +
        `--username ${x.username} --password ${x.password} ${x.server} 2>&1`
);

const registryAuth = new local.Command(
    "ecr-login-postfix",
    {
	create: ecrLoginCommand,
    },
    {
	dependsOn: [ postfixRepo ]
    }
);

const image = new local.Command(
    "ecr-image-push-postfix",
    {
	create: remoteImageName.apply(x => `${podman} push ${x} 2>&1`)
    },
    {
	dependsOn: [taggedImage, registryAuth]
    }
);

export const postfixImage = image;

export const postfixImageName = remoteImageName;

