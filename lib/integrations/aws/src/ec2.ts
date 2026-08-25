import {
  EC2Client,
  DescribeInstancesCommand,
  StartInstancesCommand,
  StopInstancesCommand,
  type Instance,
} from "@aws-sdk/client-ec2";

// Reuses AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION from .env
// (see .env.example) via the SDK's default credential provider chain.
const ec2Client = new EC2Client({ region: process.env.AWS_REGION ?? "us-east-1" });

export async function listInstances(): Promise<Instance[]> {
  const res = await ec2Client.send(new DescribeInstancesCommand({}));
  return (res.Reservations ?? []).flatMap((r) => r.Instances ?? []);
}

export async function getInstanceStatus(instanceId: string): Promise<string | undefined> {
  const res = await ec2Client.send(
    new DescribeInstancesCommand({ InstanceIds: [instanceId] })
  );
  return res.Reservations?.[0]?.Instances?.[0]?.State?.Name;
}

export async function startInstance(instanceId: string) {
  return ec2Client.send(new StartInstancesCommand({ InstanceIds: [instanceId] }));
}

export async function stopInstance(instanceId: string) {
  return ec2Client.send(new StopInstancesCommand({ InstanceIds: [instanceId] }));
}

export { ec2Client };
