
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

import { awsProvider } from './aws-provider';
import { prefix, tags, mailDomains } from './config';

const domainArray = mailDomains.map(
    (domain, ix) => {
        const tag = domain.replace(/\./g, "-");
        return {
            [domain]: new aws.route53.Zone(
                `route53-${tag}`,
                {
                    name: domain,
                    tags: tags,
                },
                { provider: awsProvider }
            )
        };
    }
);

export const domains = Object.assign({}, ...domainArray);

