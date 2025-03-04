
/****************************************************************************

Entry point.
                       
****************************************************************************/

import * as fs from 'fs';

import * as domains from './domains';
import * as ses from './ses';
import * as sesRuleset from './ses-ruleset';
import * as sesReception from './ses-reception';
import * as sesUser from './ses-user';
import * as topic from './ses-topic';
import * as bucket from './bucket';
import * as queue from './ses-queue';
import * as efs from './efs';
import * as instance from './instance';
import * as cluster from './cluster';
import * as serviceDiscovery from './service-discovery';
import * as dovecotTask from './dovecot-task';
import * as deliverTask from './deliver-task';
import * as postfixTask from './postfix-task';

import { caCert } from './certs';

caCert.certPem.apply(
    (cert) => {
        fs.writeFile(
            "mail-ca.crt",
            cert,
            err => {
                if (err) {
                    console.log(err);
                    throw(err);
                } else {
                    console.log("Wrote CA cert to mail-ca.crt.");
                }
            }
        );
    }
);

const resources = [
    domains,
    ses,
    sesRuleset,
    topic,
    queue,
    bucket,
    sesReception,
    sesUser,
    efs,
    cluster,
    instance,
    serviceDiscovery,
    deliverTask,
    dovecotTask,
    postfixTask,
];

