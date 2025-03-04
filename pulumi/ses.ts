
import * as aws from "@pulumi/aws";
import { awsProvider } from './aws-provider';
import { prefix, tags, mailDomains } from './config';
import { domains } from './domains';
import { mailIdentities } from './ses-identity';

export const mailDkims =

    mailDomains.map(

        domain => {

            const tag = domain.replace(/\./g, "-");

            const dkim = new aws.ses.DomainDkim(
                `dkim-${tag}`,
                {
                    domain: mailIdentities[domain].domain,
                },
                { provider: awsProvider }
            );

            const zone = domains[domain];

            dkim.dkimTokens.apply(

                tokens => {

                    const dkimRecords = tokens.map(

                        (token, ix) => {

                            return new aws.route53.Record(
                                `dkim-rr-${tag}-${ix}`,
                                {
                                    zoneId: zone.zoneId,
                                    name: `${token}._domainkey`,
                                    type: aws.route53.RecordType.CNAME,
                                    ttl: 600,
                                    records: [
                                        `${token}.dkim.amazonses.com`
                                    ],
                                }
                            );

                        }
                    )
                }

            );

            return dkim;

        }

    );



