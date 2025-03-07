
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region, mailboxes } from './config';
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
            "Statement": mailboxes.map(
                (address) => {

                    const tag = address.replace(/\./g, "-").replace(/@/g, "-");
                    const ruleArn = `${rulesetArn}:receipt-rule/${tag}`;

                    return {
                        "Sid": `AllowSnsPublish-${tag}`,
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

