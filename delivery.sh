#!/bin/bash
#
# chkconfig: - 90 10
# description: Delivery server
#
# Get function from functions library
. /etc/init.d/functions

# Start the service Delivery
start() {
        echo -n "Starting Delivery server: "
        su -s /bin/bash vmail -c /usr/local/bin/delivery
        ### Create the lock file ###
        touch /var/lock/subsys/delivery
        success $"Delivery server startup"
        echo
}

# Restart the service Delivery
stop() {
        echo -n "Stopping Deliery server: "
	ps -ef | grep /usr/local/bin/delivery | grep -v grep | awk '{print $2}' | xargs -i@ kill @
        ### Now, delete the lock file ###
        rm -f /var/lock/subsys/delivery
        success $"Delivery server stop"
        echo
}
### main logic ###
case "$1" in
  start)
        start
        ;;
  stop)
        stop
        ;;
  status)
        status delivery
        ;;
  restart|reload|condrestart)
        stop
        start
        ;;
  *)
        echo $"Usage: $0 {start|stop|restart|reload|status}"
        exit 1
esac
exit 0

