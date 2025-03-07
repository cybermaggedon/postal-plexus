
all: containers

VERSION=0.11.2
ARCH=--platform linux/arm64

containers:
	podman build ${ARCH} -f Containerfile.dovecot -t dovecot:${VERSION} .
	podman build ${ARCH} -f Containerfile.postfix -t postfix:${VERSION} .
	podman build ${ARCH} -f Containerfile.deliver -t deliver:${VERSION} .

