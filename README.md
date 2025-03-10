
# Postal Plexus

## Overview

This works for me managing email for a small number of email domains, and 
it 'just works' for me.  If you don't understand Dovecot, Postfix and
Pulumi, maybe give this a miss because you might struggle to diagnose
problems.  It helps to understand SES, but that's fairly straightforward
to fix with the AWS docs.  There may be easier ways to achieve this outcome.

This is a low-footprint mail system deployed to AWS:
- AWS SES is used to send/receive on the global email system
- Dovecot provides IMAP mailboxes
- Postfix relays SMTP to AWS SES.
- A delivery script takes the email from SES via an SQS queue and loads into
  Dovecot using LMTP.
- Uses Pulumi to deploy
- EFS is used for mailbox storage
- SES incoming email is delivered via SNS to an SQS queue.
- The hosted software is 3 containers: dovecot, postfix, deliver, the
  container build stuff is in this repo.
- Deploys an ECS cluster consisting of a single EC2 instance and runs the
  containers in that.  It's a small one (t4g-nano) so maybe the cheapest
  compute footprint in AWS.
  
## Setup

The setup would be...

- Install Pulumi (see pulumi.com & follow instructions)
- Create an AWS bucket for deploy state
- Add bucket name to pulumi/Pulumi.yaml
- make (to build containers)
- cd pulumi
- npm install
- pulumi stack init main (or whatever you want to call the stack)
- Edit pulumi/Pulumi.main.yaml (use Pulumi.prod.yaml as a template)
- pulumi up
- The mail domains should verify automatically, but you will need to apply
  for 'production' (which seems instant) to email from domains.

As it stands, this creates route53 zones for all the zones listed as mail
domains.  So, you need to update the nameserver settings for the domains
to point to the domains as they're created.  It takes a while for DNS to
propagate, so the pulumi deploy will probably fail on verification.

# Architecture

```

                              EFS
            ECS             volume
             |                 |
             |                 |
             |          ,-- dovecot <-.
             |          |             |
             |          |             |
        EC2 instance ---+-- deliver --'
             |          |      ^
            ENI         |      `---------SQS queue <-- SNS topic
             |          |                                 ^
         IP address     `-- postfix                       |
                               |                          |
                               |                          |
                               `-----------------------> SES

```

## Where is the mail stored?

It's on an EFS filesystem, mounted on the dovecot container.  Be careful,
`pulumi down` will destroy the stack including the EFS container.

You can boot an instance and mount the EFS filesystem on an instance.
Replace fs-XXXX with the filesystem ID which you can find in the EFS
section of the AWS console.

```
mkdir /efs
sudo mount -t nfs -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport fs-XXXX.efs.eu-west-2.amazonaws.com:/ /efs
```

