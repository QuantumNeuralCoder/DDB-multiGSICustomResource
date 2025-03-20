import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

export interface DynamoDbGsiUpdaterStepFunctionProps {
  readonly tableName: string;
  readonly gsis: Array<{
    IndexName: string;
    AttributeDefinitions: Array<{ AttributeName: string; AttributeType: string }>;
    KeySchema: Array<{ AttributeName: string; KeyType: string }>;
    Projection: { ProjectionType: string; NonKeyAttributes?: string[] };
    ProvisionedThroughput: { ReadCapacityUnits: number; WriteCapacityUnits: number };
  }>;
}

export class DynamoDbGsiUpdaterStepFunction extends Construct {
  constructor(scope: Construct, id: string, props: DynamoDbGsiUpdaterStepFunctionProps) {
    super(scope, id);

    // Lambda to check the status of a GSI.
    const checkGsiLambda = new NodejsFunction(this, 'CheckGsiLambdaSF', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/check/index.ts',    // Path to your trigger lambda TypeScript file
      handler: 'handler',                // The exported function name
      timeout: Duration.seconds(300),
      
    });
    // Lambda to update a single GSI.
    const updateGsiLambda = new NodejsFunction(this, 'UpdateGsiLambdaSF', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/update/index.ts',
      handler: 'handler',                // The exported function name
      timeout: Duration.seconds(300),
      
    });


    // TASK: Invoke updateGsiLambda to start a GSI update.
    const updateTask = new tasks.LambdaInvoke(this, 'Update GSI', {
      lambdaFunction: updateGsiLambda,
      payload: sfn.TaskInput.fromObject({
        TableName: props.tableName,
        GSI: sfn.JsonPath.stringAt('$'),
      }),
      resultPath: '$.updateResult',
    });
    

    // Wait state for a fixed delay after the update.
    const initialWaitState = new sfn.Wait(this, 'Initial Wait 10 Seconds', {
      time: sfn.WaitTime.duration(Duration.seconds(10)),
    });

    // TASK: Invoke checkGsiLambda to check the GSI status (for the initial check).
    const checkTask = new tasks.LambdaInvoke(this, 'Check GSI Status', {
      lambdaFunction: checkGsiLambda,
      payload: sfn.TaskInput.fromObject({
        TableName: props.tableName,
        IndexName: sfn.JsonPath.stringAt('$.GSI.IndexName'),
      }),
      resultPath: '$.checkResult',
    });

    // Create a new check task for the loop branch.
    const checkTaskLoop = new tasks.LambdaInvoke(this, 'Check GSI Status Loop', {
      lambdaFunction: checkGsiLambda,
      payload: sfn.TaskInput.fromObject({
        TableName: props.tableName,
        IndexName: sfn.JsonPath.stringAt('$.GSI.IndexName'),
      }),
      resultPath: '$.checkResult',
    });

    

     // Choice state: if the index is ACTIVE, succeed; otherwise, wait and re-check.
     const isActiveChoice = new sfn.Choice(this, 'Is GSI Active?');
     const succeedState = new sfn.Succeed(this, 'GSI is Active');
 
     isActiveChoice.when(
       sfn.Condition.stringEquals('$.checkResult.Payload.indexStatus', 'ACTIVE'),
       succeedState
     );
 
     // A separate wait state for the loop branch.
     const loopWaitState = new sfn.Wait(this, 'Loop Wait 10 Seconds', {
       time: sfn.WaitTime.duration(Duration.seconds(10)),
     });
     
 
     // In the otherwise branch, wait then re-check using the new check task instance.
     isActiveChoice.otherwise(loopWaitState.next(checkTaskLoop).next(isActiveChoice));
 
     // Build the workflow for a single GSI update:
     const singleGsiWorkflow = updateTask.next(initialWaitState).next(checkTask).next(isActiveChoice);
 
     // Map state to iterate over all GSIs.
     const mapState = new sfn.Map(this, 'Process GSIs', {
       itemsPath: sfn.JsonPath.stringAt('$.GSIs'),
       resultPath: '$.results',
     });
     mapState.iterator(singleGsiWorkflow);

    // Create the state machine with the Map state as the root.
    const stateMachine = new sfn.StateMachine(this, 'GsiUpdaterStateMachine', {
      definition: mapState,
      timeout: Duration.minutes(15),
    });

    // Create a trigger Lambda that will start the state machine execution.
    const triggerLambda = new NodejsFunction(this, 'TriggerStateMachineLambda', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: 'lambda/trigger/index.ts',  // Path to your trigger lambda TypeScript file
      handler: 'handler',                // The exported function name
      timeout: Duration.seconds(300),
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
      },
    });

    // Grant the trigger Lambda permission to start executions of the state machine.
    stateMachine.grantStartExecution(triggerLambda);

    // Create a custom resource provider backed by the trigger Lambda.
    const provider = new cr.Provider(this, 'StepFunctionProvider', {
      onEventHandler: triggerLambda,
      logRetention: RetentionDays.ONE_DAY,
    });

    // Create the custom resource that uses this provider.
    new cdk.CustomResource(this, 'GsiUpdaterCustomResource', {
      serviceToken: provider.serviceToken,
      properties: {
        TableName: props.tableName,
        GSIs: props.gsis,
      },
      resourceType: 'Custom::DynamoDbGsiUpdaterStepFunction',
    });
  }
}
