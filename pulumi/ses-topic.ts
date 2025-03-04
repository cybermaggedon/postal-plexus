
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region, mailDomains } from './config';
import { ruleset } from './ses-ruleset';

export const mailTopic = new aws.sns.Topic(
    "sns-topic",
    {
        name: "mail",
    },
    { provider: awsProvider }
);

const topicPolicy = pulumi.all([
    ruleset.arn, mailTopic.arn,
]).apply(
    ([rulesetArn, topicArn]) => {

        return JSON.stringify({
            "Version": "2012-10-17",
            "Statement": mailDomains.map(
                (domain) => {
                    const ruleArn = `${rulesetArn}:receipt-rule/${domain}`;

                    return {
                        "Sid": `AllowSnsPublish-${domain}`,
                        "Effect": "Allow",
                        "Principal": {
                            "Service":"ses.amazonaws.com",
                        },
                        "Action": [
                            "SNS:Publish",
                        ],
                        "Resource": topicArn,
                        "Condition": {
                            "ArnEquals": {
                                "aws:SourceArn": ruleArn,
                            }
                        }
                    }
                }
             )
        });
    }
);

export const mailTopicPolicyAttachment = new aws.sns.TopicPolicy(
    "sns-topic-policy",
    {
        arn: mailTopic.arn,
        policy: topicPolicy,
    },
    { provider: awsProvider }
);

