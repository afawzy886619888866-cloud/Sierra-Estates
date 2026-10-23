import {
  LambdaClient,
  InvokeCommand,
  ListFunctionsCommand,
  type FunctionConfiguration,
} from "@aws-sdk/client-lambda";

// Reuses AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION from .env
// (see .env.example) via the SDK's default credential provider chain.
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION ?? "us-east-1" });

export async function invokeLambda<TPayload = unknown, TResult = unknown>(
  functionName: string,
  payload?: TPayload
): Promise<TResult> {
  const res = await lambdaClient.send(
    new InvokeCommand({
      FunctionName: functionName,
      Payload: payload !== undefined ? Buffer.from(JSON.stringify(payload)) : undefined,
    })
  );
  if (res.FunctionError) {
    throw new Error(
      `Lambda "${functionName}" returned ${res.FunctionError}: ${res.Payload ? Buffer.from(res.Payload).toString() : ""}`
    );
  }
  return res.Payload ? (JSON.parse(Buffer.from(res.Payload).toString()) as TResult) : (undefined as TResult);
}

export async function listFunctions(): Promise<FunctionConfiguration[]> {
  const res = await lambdaClient.send(new ListFunctionsCommand({}));
  return res.Functions ?? [];
}

export { lambdaClient };
