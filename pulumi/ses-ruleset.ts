
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region } from './config';

export const ruleset = new aws.ses.ReceiptRuleSet(
    "ruleset",
    {
        ruleSetName: "postal-plexus"
    },
    { provider: awsProvider }
);

export const rulesetActivation = new aws.ses.ActiveReceiptRuleSet(
    "ruleset-activation",
    {
        ruleSetName: ruleset.ruleSetName
    },
    { provider: awsProvider }
);

