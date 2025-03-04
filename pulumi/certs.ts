
import * as pulumi from "@pulumi/pulumi";
import * as tls from "@pulumi/tls";

import { endpointHostname, endpointDomain } from './config';

const caKey = new tls.PrivateKey(
    "ca-key",
    {
        algorithm: "ECDSA",
        ecdsaCurve: "P256"
    }
);

export const caCert = new tls.SelfSignedCert(
    "ca-cert",
    {
        isCaCertificate: true,
        allowedUses: [
            "digital_signature", "cert_signing", "ocsp_signing",
            "crl_signing", "server_auth", "client_auth"
        ],
        privateKeyPem: caKey.privateKeyPem,
        subject: {
            commonName: "Postal Plexus CA",
            organizationalUnit: "Mail",
            organization: "Postal Plexus"
        },
        validityPeriodHours: 100000,
    }
);

export const serviceKey = new tls.PrivateKey(
    "service-key",
    {
        algorithm: "ECDSA",
        ecdsaCurve: "P256"
    }
);

const serviceReq = new tls.CertRequest(
    "service-req",
    {
        privateKeyPem: serviceKey.privateKeyPem,
        subject: {
            commonName: "Mail service",
            organizationalUnit: "Mail",
            organization: "Postal Plexus"
        },
        dnsNames: [
            endpointHostname,
        ],
});

export const serviceCert = new tls.LocallySignedCert(
    "service-cert",
    {
        allowedUses: ["server_auth"],
        caCertPem: caCert.certPem,
        caPrivateKeyPem: caKey.privateKeyPem,
        certRequestPem: serviceReq.certRequestPem,
        validityPeriodHours: 100000,
    }
);

export const serviceCertBundle = pulumi.all([
    serviceCert.certPem, caCert.certPem
]).apply(
    ([cert, ca]) => `${cert}${ca}`
);

export const serviceKeypairBundle = pulumi.all([
    serviceCert.certPem, serviceKey.privateKeyPem
]).apply(
    ([cert, key]) => `${cert}${key}`
);

