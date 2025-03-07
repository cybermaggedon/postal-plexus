
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

import { awsProvider } from './aws-provider';
import { prefix, tags, region, mailDomains, mailboxes } from './config';
import { mailIdentities } from './ses-identity';
import { bucket } from './bucket';
import { ruleset } from './ses-ruleset';
import { mailTopic, mailTopicPolicyAttachment } from './ses-topic';
import { mailQueue, mailQueuePolicyAttachment } from './ses-queue';
import { address } from './address';
import { domains } from './domains';

const queueSubscription = new aws.sns.TopicSubscription(
    "queue-subscription",
    {
        topic: mailTopic.arn,
        protocol: "sqs",
        endpoint: mailQueue.arn,
    },
    {
        provider: awsProvider,
        dependsOn: [ mailQueuePolicyAttachment ],
    }
);


export const bucketPolicy = pulumi.all([
    ruleset.arn, bucket.bucket
]).apply(
    ([arn, bucketName]) => {

        return JSON.stringify({
            "Version": "2012-10-17",
            "Statement": mailboxes.map(
                (address) => {

                    const tag = address.replace(/\./g, "-").replace(/@/g, "-");
                    const ruleArn = `${arn}:receipt-rule/${tag}`;

                    return {
                        "Sid": `SESPermissionToWriteEmail-${tag}`,
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ses.amazonaws.com"
                        },
                        "Action": "s3:PutObject",
                        "Resource": [
                            `arn:aws:s3:::${bucketName}/*`
                        ],
                        "Condition": {
                            "ArnEquals": {
                                "aws:SourceArn": ruleArn,
                            }
                        }
                    };
                }
            )
          
        });
       
    }
);

export const bucketPolicyAttachment = new aws.s3.BucketPolicy(
    "bucket-policy",
    {
        bucket: bucket.id,
        policy: bucketPolicy,
    },
    { provider: awsProvider }
);

let previous : string = "";
let previousResource : any = null;

export const rules =
    mailboxes.map(
        (address, ix) => {

            const tag = address.replace(/\./g, "-").replace(/@/g, "-");

            const rule = new aws.ses.ReceiptRule(
                `mail-rule-${tag}`,
                {
                    name: tag,
                    ruleSetName: ruleset.ruleSetName,
                    recipients: [
                        address
                    ],
                    enabled: true,
                    scanEnabled: true,
                    addHeaderActions: [
                        {
                            headerName: "X-Mailbox",
                            headerValue: address,
                            position: 1,
                        }
                    ],
                    s3Actions: [
                        {
                            bucketName: bucket.bucket,
                            position: 2,
                            objectKeyPrefix: address,
                            topicArn: mailTopic.arn,
                        }
                    ],
                    stopActions: [
                        {
                            position: 3,
                            scope: "RuleSet",
                        }
                    ],
                    ...(previous != "") && { after: previous },
                },
                {
                    provider: awsProvider,
                    dependsOn: [
                        bucketPolicyAttachment, mailQueuePolicyAttachment,
                        mailTopicPolicyAttachment,
                    ] + previousResource ? [previousResource] : []
                }
            );

            previous = tag;
            previousResource = rule;

        }

    );

const bounceRule = new aws.ses.ReceiptRule(
    `mail-rule-bounce`,
    {
        name: "bounce",
        after: previous,
        ruleSetName: ruleset.ruleSetName,
        bounceActions: [
            {
                position: 0,
                message: "Recipient not known",
                sender: "mailer-daemon@stanhope.house",
                smtpReplyCode: "550",
            }
        ],
        enabled: true,
        scanEnabled: true,
        stopActions: [
            {
                position: 1,
                scope: "RuleSet",
            }
        ],
    },
    {
        provider: awsProvider,
        dependsOn: [
            bucketPolicyAttachment, mailQueuePolicyAttachment,
            mailTopicPolicyAttachment,
        ],
    }
);

mailDomains.map(

    domain => {

        const tag = domain.replace(/\./g, "-");

        const zone = domains[domain];
        const identity = mailIdentities[domain];

        const mxRecord = new aws.route53.Record(
            `mx-record-${tag}`,
            {
                zoneId: zone.zoneId,
                name: zone.name,
                type: aws.route53.RecordType.MX,
                ttl: 600,
                records: [
                    `10 inbound-smtp.${region}.amazonaws.com.`
                ],
            },
            {
                provider: awsProvider,
            }
        );

        const dmarcRecord = new aws.route53.Record(
            `dmarc-record-${tag}`,
            {
                zoneId: zone.zoneId,
                name: zone.name.apply((d : string) => `_dmarc.${d}`),
                type: aws.route53.RecordType.TXT,
                ttl: 600,
                records: [ "v=DMARC1; p=reject;" ],
            },
            {
                provider: awsProvider,
            }
        );

        const mailRecord = new aws.route53.Record(
            `mail-record-${tag}`,
            {
                zoneId: zone.zoneId,
                name: zone.name.apply((d : string) => `mail.${d}`),
                type: aws.route53.RecordType.A,
                ttl: 600,
                records: [ address.publicIp ],
            },
            {
                provider: awsProvider,
            }
        );

        const smtpRecord = new aws.route53.Record(
            `smtp-record-${tag}`,
            {
                zoneId: zone.zoneId,
                name: zone.name.apply((d : string) => `smtp.${d}`),
                type: aws.route53.RecordType.A,
                ttl: 600,
                records: [ address.publicIp ],
            },
            {
                provider: awsProvider,
            }
        );

    }

);

