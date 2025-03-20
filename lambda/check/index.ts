import * as AWS from 'aws-sdk';

const dynamodb = new AWS.DynamoDB();

interface CheckEvent {
  TableName: string;
  IndexName: string;
}

export const handler = async (event: CheckEvent): Promise<{ indexStatus: string }> => {
  console.log('Check event:', JSON.stringify(event, null, 2));
  const { TableName, IndexName } = event;

  try {
    const data = await dynamodb.describeTable({ TableName }).promise();
    const gsi = (data.Table?.GlobalSecondaryIndexes || []).find(item => item.IndexName === IndexName);
    const indexStatus = gsi ?.IndexStatus ?? 'NOT_FOUND';
    console.log(`GSI ${IndexName} status: ${indexStatus}`);
    return { indexStatus };
  } catch (error) {
    console.error('Error checking GSI:', error);
    throw error;
  }
};
