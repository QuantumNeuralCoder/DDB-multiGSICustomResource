import {
  CloudFormationCustomResourceCreateEvent,
  CloudFormationCustomResourceDeleteEvent,
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceResponse,
  CloudFormationCustomResourceUpdateEvent,
} from "aws-lambda";
import * as AWS from "aws-sdk";

const dynamodb = new AWS.DynamoDB();

// Helper: add a single GSI and wait until it is ACTIVE.
async function addGSI(tableName, gsi) {
  // First, check if the GSI already exists
  const tableData = await dynamodb.describeTable({ TableName: tableName }).promise();
  if (!tableData.Table) {
    throw new Error(`Unable to describe table ${tableName}. No table information returned.`);
  }
  const existingGsi = (tableData.Table.GlobalSecondaryIndexes || []).find(index => index.IndexName === gsi.IndexName);
  if (existingGsi) {
    console.log(`GSI ${gsi.IndexName} already exists.`);
    // If the index isn't ACTIVE yet, wait for it.
    if (existingGsi.IndexStatus !== 'ACTIVE') {
      console.log(`Waiting for GSI ${gsi.IndexName} to become ACTIVE...`);
      await waitForGSIActivation(tableName, gsi.IndexName);
    }
    return;
  }

  // If the GSI doesn't exist, attempt to create it.
  const params = {
    TableName: tableName,
    AttributeDefinitions: gsi.AttributeDefinitions,
    GlobalSecondaryIndexUpdates: [
      {
        Create: {
          IndexName: gsi.IndexName,
          KeySchema: gsi.KeySchema,
          Projection: gsi.Projection,
          ProvisionedThroughput: gsi.ProvisionedThroughput,
        },
      },
    ],
  };

  console.log(`Creating GSI ${gsi.IndexName} on table ${tableName}`);
  try {
    await dynamodb.updateTable(params).promise();
  } catch (error) {
    // If error indicates the index already exists, log and continue.
    if (error.message && error.message.includes('already exists')) {
      console.log(`GSI ${gsi.IndexName} already exists as per error message.`);
    } else {
      throw error;
    }
  }
  await waitForGSIActivation(tableName, gsi.IndexName);
}

// Helper: poll until the GSI becomes ACTIVE.
async function waitForGSIActivation(tableName: string, indexName: string): Promise<void> {
  let isActive = false;
  while (!isActive) {
    await new Promise(resolve => setTimeout(resolve, 10000)); // wait 10 seconds between polls
    const data = await dynamodb.describeTable({ TableName: tableName }).promise();
    const gsiInfo = (data.Table?.GlobalSecondaryIndexes || []).find(g => g.IndexName === indexName);
    if (gsiInfo && gsiInfo.IndexStatus === "ACTIVE") {
      isActive = true;
      console.log(`GSI ${indexName} is ACTIVE.`);
    } else {
      console.log(`Waiting for GSI ${indexName} to become ACTIVE...`);
    }
  }
}

// Common helper that handles both Create and Update events.
async function handleCreateOrUpdate(
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> {
  const tableName = event.ResourceProperties.TableName;
  const gsis = event.ResourceProperties.GSIs;

  for (const gsi of gsis) {
    await addGSI(tableName, gsi);
  }

  return {
    Status: "SUCCESS",
    PhysicalResourceId: event.RequestId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  };
}

export async function createResource(
  event: CloudFormationCustomResourceCreateEvent
): Promise<CloudFormationCustomResourceResponse> {
  return await handleCreateOrUpdate(event);
}

export async function updateResource(
  event: CloudFormationCustomResourceUpdateEvent
): Promise<CloudFormationCustomResourceResponse> {
  return await handleCreateOrUpdate(event);
}

export async function deleteResource(
  event: CloudFormationCustomResourceDeleteEvent
): Promise<CloudFormationCustomResourceResponse> {
  // No action is taken on deletion; adjust if you want to remove GSIs.
  return {
    Status: "SUCCESS",
    PhysicalResourceId: event.PhysicalResourceId || event.RequestId,
    StackId: event.StackId,
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    Data: {},
  };
}

// Main handler that routes based on RequestType.
export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceResponse> => {
  console.log("Received event:", JSON.stringify(event, null, 2));
  switch (event.RequestType) {
    case "Create":
      return await createResource(event as CloudFormationCustomResourceCreateEvent);
    case "Update":
      return await updateResource(event as CloudFormationCustomResourceUpdateEvent);
    case "Delete":
      return await deleteResource(event as CloudFormationCustomResourceDeleteEvent);
    default:
      // This point should never be reached.
      throw new Error(`Unsupported request type: ${(event as any).RequestType}`);
  }
};
