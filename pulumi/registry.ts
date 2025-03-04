
import * as pulumi from "@pulumi/pulumi";
import { local } from "@pulumi/command";
import * as aws from "@pulumi/aws";
import * as child_process from 'child_process';

import { prefix, region, tags } from './config';
import { awsProvider } from './aws-provider';

export const deliverRepo = new aws.ecr.Repository(
    "ecr-repository-deliver",
    {
    	name: "deliver",
	forceDelete: true,
	imageTagMutability: "MUTABLE",
	tags: tags,
    },
    {
	provider: awsProvider
    }
);

const deliverLifecyclePolicy = new aws.ecr.LifecyclePolicy(
    "ecr-lifecycle-policy-deliver",
    {
	repository: deliverRepo.name,
	policy: JSON.stringify({
	    "rules": [
		{
		    "rulePriority": 10,
		    "description": "Remove untagged images",
		    "selection": {
			"tagStatus": "untagged",
			"countType": "imageCountMoreThan",
			"countNumber": 1
		    },
		    "action": {
			"type": "expire"
		    }
		}
	    ]
	}),
    },
    { provider: awsProvider }
);

export const dovecotRepo = new aws.ecr.Repository(
    "ecr-repository-dovecot",
    {
    	name: "dovecot",
	forceDelete: true,
	imageTagMutability: "MUTABLE",
	tags: tags,
    },
    {
	provider: awsProvider
    }
);

const dovecotLifecyclePolicy = new aws.ecr.LifecyclePolicy(
    "ecr-lifecycle-policy-dovecot",
    {
	repository: dovecotRepo.name,
	policy: JSON.stringify({
	    "rules": [
		{
		    "rulePriority": 10,
		    "description": "Remove untagged images",
		    "selection": {
			"tagStatus": "untagged",
			"countType": "imageCountMoreThan",
			"countNumber": 1
		    },
		    "action": {
			"type": "expire"
		    }
		}
	    ]
	}),
    },
    { provider: awsProvider }
);

export const postfixRepo = new aws.ecr.Repository(
    "ecr-repository-postfix",
    {
    	name: "postfix",
	forceDelete: true,
	imageTagMutability: "MUTABLE",
	tags: tags,
    },
    {
	provider: awsProvider
    }
);

const postfixLifecyclePolicy = new aws.ecr.LifecyclePolicy(
    "ecr-lifecycle-policy-postfix",
    {
	repository: postfixRepo.name,
	policy: JSON.stringify({
	    "rules": [
		{
		    "rulePriority": 10,
		    "description": "Remove untagged images",
		    "selection": {
			"tagStatus": "untagged",
			"countType": "imageCountMoreThan",
			"countNumber": 1
		    },
		    "action": {
			"type": "expire"
		    }
		}
	    ]
	}),
    },
    { provider: awsProvider }
);

const getRegistry =
    (repo : aws.ecr.Repository) => repo.registryId.apply(async id => {

        const credentials = await aws.ecr.getCredentials(
            { registryId: id },
            { provider: awsProvider }
        );

        const decodedCredentials = Buffer.from(
            credentials.authorizationToken, "base64"
        ).toString();

        const [username, password] = decodedCredentials.split(":");

        if (!password || !username) {
            throw new Error("Invalid credentials");
        }

        return {
            server: credentials.proxyEndpoint,
            username: username,
            password: password,
        };

    });

export const deliverRegistry = getRegistry(deliverRepo);
export const dovecotRegistry = getRegistry(dovecotRepo);
export const postfixRegistry = getRegistry(postfixRepo);

