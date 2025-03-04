
import * as pulumi from "@pulumi/pulumi";
import { local } from "@pulumi/command";
import * as aws from "@pulumi/aws";

import { prefix, region, tags, version } from './config';
import { awsProvider } from './aws-provider';
import { deliverRepo, deliverRegistry } from './registry';

// Tag the local container image and push to ECR

const podman = "podman";

const localImageName = `localhost/deliver:${version}`
export const remoteImageName = deliverRepo.repositoryUrl.apply(
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
    "tagged-image-deliver",
    {
	create: tagCommand,
    },
    {
	dependsOn: [deliverRepo]
    }
);

const ecrLoginCommand = deliverRegistry.apply(x =>
    `${podman} login ` +
        `--username ${x.username} --password ${x.password} ${x.server} 2>&1`
);

const registryAuth = new local.Command(
    "ecr-login-deliver",
    {
	create: ecrLoginCommand,
    },
    {
	dependsOn: [ deliverRepo ]
    }
);

const image = new local.Command(
    "ecr-image-push-deliver",
    {
	create: remoteImageName.apply(x => `${podman} push ${x} 2>&1`)
    },
    {
	dependsOn: [taggedImage, registryAuth]
    }
);

export const deliverImage = image;

export const deliverImageName = remoteImageName;

