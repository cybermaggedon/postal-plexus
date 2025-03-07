
// Configuration stuff, largely loading stuff from the configuration file

import * as pulumi from "@pulumi/pulumi";

const cfg = new pulumi.Config();

function get(tag : string) {

    let val = cfg.get(tag);

    if (!val) {
        console.log("ERROR: The '" + tag + "' config is mandatory");
        throw "The '" + tag + "' config is mandatory";
    }

    return val;

}

// Get 'environment', should be something like live, dev, ref etc.
export const environment = get("environment");

// Get 'region', should be something like live, dev, ref etc.
export const region = get("region");

// Default tags
export const tags : { [key : string] : string } = {
};

export const tagsSep = Object.entries(tags).map(
    (x : string[]) => (x[0] + "=" + x[1])
).join(",");

// Make up a prefix
export const prefix = "postal-plexus-" + environment;

// VPC configuration
export const vpcCidr = get("vpc-cidr");
export const pubSubnetCidr = cfg.require("pub-subnet-cidr");

type User = {user:string;password:string};
export const users = cfg.requireObject<User[]>("users");

export const mailDomains = cfg.requireObject<string[]>("mail-domains");

export const mailboxes = cfg.requireObject<string[]>("mailboxes");

type Alias = {alias:string;destination:string};
export const aliases = cfg.requireObject<Alias[]>("aliases");

export const version = "0.11.2";

export const volumeSize = "10";

