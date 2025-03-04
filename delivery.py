#!/usr/bin/env python

import simplejson, boto
import time
import smtplib
import syslog
import sys
import os

syslog.openlog("delivery", 0, syslog.LOG_DAEMON)

try:
    pid = os.fork()
    if pid > 0:
        sys.exit(0)
except OSError, e:
    syslog.syslog(syslog.LOG_NOTICE, 
                  "fork #1 failed: %d (%s)" % (e.errno, e.strerror))
    sys.exit(1)

os.chdir("/")
os.setsid()
os.umask(0)

try:
    pid = os.fork()
    if pid > 0:
        sys.exit(0)
except OSError, e:
    syslog.syslog(syslog.LOG_NOTICE, 
                  "fork #1 failed: %d (%s)" % (e.errno, e.strerror))
    sys.exit(1)

try:
    syslog.syslog(syslog.LOG_NOTICE, "Delivery starting.")
    
    sqs = boto.connect_sqs()
    s3 = boto.connect_s3()
    q = sqs.get_queue('mail')

except Exception, e:
    syslog.syslog(syslog.LOG_ERR, "Error: " + str(e))

while True:

    try:

        message = q.read()

        if message is not None:

            syslog.syslog(syslog.LOG_NOTICE, "Message received.")
            msg_data = simplejson.loads(message.get_body())

            msg = simplejson.loads(msg_data["Message"])
            key = msg["receipt"]["action"]["objectKey"]
            bucket = msg["receipt"]["action"]["bucketName"]
            prefix = msg["receipt"]["action"]["objectKeyPrefix"]
            
            objid = s3.get_bucket(bucket).get_key(key)
            body = objid.get_contents_as_string()

            s = smtplib.LMTP('localhost', 24)
            s.sendmail("localhost", ["mail." + prefix], body)
            s.quit()
        
            objid.delete()
            
            q.delete_message(message)

            syslog.syslog(syslog.LOG_NOTICE, "Delivered message for " + prefix)

    except Exception, e:

        syslog.syslog(syslog.LOG_ERR, "Error: " + str(e))
        time.sleep(5)

