
import * as aws from "@pulumi/aws";
import { awsProvider } from './aws-provider';
import { prefix, tags, mailDomains } from './config';
import { domains } from './domains';

const identities =
    mailDomains.map(
        domain => {

            const tag = domain.replace(/\./g, "-");

            const identity = new aws.ses.DomainIdentity(
                `mail-identity-${tag}`,
                {
                    domain: domain
                },
                { provider: awsProvider }
            );

            const zone = domains[domain];

            const verificationRecord = new aws.route53.Record(
                `verification-record-${tag}`,
                {
                    zoneId: zone.zoneId,
                    name: zone.name.apply(
                        (x : string) => `_amazonses.${x}.`
                    ),
                    type: aws.route53.RecordType.TXT,
                    ttl: 600,
                    records: [ identity.verificationToken ],
                },
                {
                    provider: awsProvider,
                    dependsOn: [ identity ],
                }
            );

            const verification = new aws.ses.DomainIdentityVerification(
                `verification-${tag}`,
                {
                    domain: identity.domain
                },
                {
                    provider: awsProvider,
                    dependsOn: [ verificationRecord ],
                }
            );

            return { [domain]: identity };

        }
    );

export const mailIdentities = Object.assign({}, ...identities);

