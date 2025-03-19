import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { DynamoDbGsiUpdater } from './dynamodb-gsi-updater';

export class DDBGSIUpdaterStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'DDBTablemultiGSI', {
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PROVISIONED,
      readCapacity: 5,
      writeCapacity: 5,
    });

    new DynamoDbGsiUpdater(this, 'GsiUpdater', {
      table,
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
        {
          IndexName: 'GSI3',
          AttributeDefinitions: [
            { AttributeName: 'gsi3pk', AttributeType: 'S' },
            { AttributeName: 'gsi3sk', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'gsi3pk', KeyType: 'HASH' },
            { AttributeName: 'gsi3sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
        {
          IndexName: 'GSI4',
          AttributeDefinitions: [
            { AttributeName: 'gsi4pk', AttributeType: 'S' },
            { AttributeName: 'gsi4sk', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'gsi4pk', KeyType: 'HASH' },
            { AttributeName: 'gsi4sk', KeyType: 'RANGE' },
          ],
          Projection: { ProjectionType: 'ALL' },
          ProvisionedThroughput: { ReadCapacityUnits: 5, WriteCapacityUnits: 5 },
        },
      ],
    });
  }
}
