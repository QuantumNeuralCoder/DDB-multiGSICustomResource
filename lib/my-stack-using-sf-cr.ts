import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoDbGsiUpdaterStepFunction } from './dynamodb-gsi-updater-stepfunction';

export class DDBGSIUpdaterStackUsingSF extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a DynamoDB table.
    const table = new dynamodb.Table(this, 'DDBTablemultiGSIUSF', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    // Use the Step Functions custom resource construct to add GSIs.
    new DynamoDbGsiUpdaterStepFunction(this, 'GsiUpdaterStepFunction', {
      tableName: table.tableName,
      gsis: [
        {
          IndexName: 'GSI1',
          AttributeDefinitions: [
            { AttributeName: 'gsi1pk', AttributeType: 'S' },
            { AttributeName: 'gsi1sk', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'gsi1pk', KeyType: 'HASH' },
            { AttributeName: 'gsi1sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
        {
          IndexName: 'GSI2',
          AttributeDefinitions: [
            { AttributeName: 'gsi2pk', AttributeType: 'S' },
            { AttributeName: 'gsi2sk', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'gsi2pk', KeyType: 'HASH' },
            { AttributeName: 'gsi2sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
    });
  }
}
