import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB();

interface UpdateEvent {
  TableName: string;
  GSI: {
    IndexName: string;
    AttributeDefinitions: Array<{ AttributeName: string; AttributeType: string }>;
    KeySchema: Array<{ AttributeName: string; KeyType: string }>;
    Projection: { ProjectionType: string; NonKeyAttributes?: string[] };
    ProvisionedThroughput: { ReadCapacityUnits: number; WriteCapacityUnits: number };
  };
}

export const handler = async (event: UpdateEvent): Promise<{ status: string }> => {
  console.log('Update event:', JSON.stringify(event, null, 2));
  const { TableName, GSI } = event;

  try {
    const params: AWS.DynamoDB.UpdateTableInput = {
      TableName,
      AttributeDefinitions: GSI.AttributeDefinitions,
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: GSI.IndexName,
            KeySchema: GSI.KeySchema,
            Projection: GSI.Projection,
            ProvisionedThroughput: GSI.ProvisionedThroughput,
          },
        },
      ],
    };
    console.log(`Creating GSI ${GSI.IndexName} on table ${TableName}`);
    await dynamodb.updateTable(params).promise();
    return { status: 'Update initiated' };
  } catch (error) {
    console.error('Error updating GSI:', error);
    throw error;
  }
};
