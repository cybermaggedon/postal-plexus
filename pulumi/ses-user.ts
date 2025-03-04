
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { awsProvider } from './aws-provider';
import { prefix, tags, region } from './config';

const emailUsername = `${prefix}-email`;

export const emailUser = new aws.iam.User(
    "ses-user",
    {
      name: emailUsername,
      path: "/",
      tags: tags,
    },
    { provider: awsProvider }
);

// Email Access key
const emailAccessKey = new aws.iam.AccessKey(
    "ses-user-key",
    { user: emailUser.name },
    { provider: awsProvider }
);

export const emailSmtpUsername = emailAccessKey.id;
export const emailSmtpPassword = emailAccessKey.sesSmtpPasswordV4;

const policy = JSON.stringify({
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowSesMailSend",
            "Effect": "Allow",
            "Action": [
                "ses:SendRawEmail"
            ],
            "Resource": "*",
        },
    ]
});

export const emailUserPolicy = new aws.iam.UserPolicy(
    "ses-user-policy",
    {
        user: emailUser.name,
        policy: policy,
    },
    { provider: awsProvider }
);

