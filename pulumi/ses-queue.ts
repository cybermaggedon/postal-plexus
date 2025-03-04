
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region } from './config';
import { mailTopic, mailTopicPolicyAttachment } from './ses-topic';

export const mailQueue = new aws.sqs.Queue(
    "queue",
    {
        name: "mail",
        delaySeconds: 0,
        visibilityTimeoutSeconds: 30,
        maxMessageSize: 256 * 1024,
        messageRetentionSeconds: 14 * 86400,
        receiveWaitTimeSeconds: 20,
//        policy: queuePolicy,
    },
    { provider: awsProvider }
);

const queuePolicy = pulumi.all([
    mailTopic.arn, mailQueue.arn,
]).apply(
    ([topicArn, queueArn]) => {
        return JSON.stringify({
          "Version": "2012-10-17",
          "Statement": [
            {
              "Sid": "SnsSendMessage",
              "Effect": "Allow",
              "Principal": "*",
              "Action": "SQS:SendMessage",
              "Resource": queueArn,
              "Condition": {
                "ArnEquals": {
                  "aws:SourceArn": topicArn,
                }
              }
            }
          ]
        });
    }
);

export const mailQueuePolicyAttachment = new aws.sqs.QueuePolicy(
    "queue-policy",
    {
        queueUrl: mailQueue.id,
        policy: queuePolicy,
    },
    { provider: awsProvider }
);    

