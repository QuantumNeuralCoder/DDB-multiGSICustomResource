import { Construct } from "constructs";
import { Provider } from "aws-cdk-lib/custom-resources";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { CustomResource, Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";

export interface DynamoDbGsiUpdaterProps {
  /**
   * The DynamoDB table to update.
   */
  readonly table: ITable;
  /**
   * An array of GSI definitions.
   */
  readonly gsis: Array<{
    IndexName: string;
    AttributeDefinitions: Array<{ AttributeName: string; AttributeType: string }>;
    KeySchema: Array<{ AttributeName: string; KeyType: string }>;
    Projection: { ProjectionType: string; NonKeyAttributes?: string[] };
    ProvisionedThroughput: { ReadCapacityUnits: number; WriteCapacityUnits: number };
  }>;
}

export class DynamoDbGsiUpdater extends Construct {
  constructor(scope: Construct, id: string, props: DynamoDbGsiUpdaterProps) {
    super(scope, id);

    // Create the Lambda function that will handle the custom resource events.
    const onEventHandlerFunction = new NodejsFunction(this, "CustomResourceOnEventHandlerFunction", {
      timeout: Duration.seconds(900), // allow up to 15 minutes for sequential updates
      runtime: Runtime.NODEJS_20_X,
      // Update the path to your Lambda handler file (relative to your project root)
      entry: "lambda/index.ts",
    });

    // Grant the Lambda function the necessary permissions on the table.
    props.table.grant(onEventHandlerFunction, "dynamodb:UpdateTable", "dynamodb:DescribeTable");

    // Create the custom resource provider using the Lambda function.
    const customResourceProvider = new Provider(this, "CustomResourceProvider", {
      onEventHandler: onEventHandlerFunction,
      logRetention: RetentionDays.ONE_DAY,
    });

    // Create the custom resource. Pass the table name and the array of GSI definitions.
    new CustomResource(this, "YourCustomResource", {
      serviceToken: customResourceProvider.serviceToken,
      properties: {
        TableName: props.table.tableName,
        GSIs: props.gsis,
      },
      resourceType: "Custom::DynamoDbGsiUpdater",
    });
  }
}
