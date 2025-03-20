import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { CloudFormationCustomResourceEvent } from 'aws-lambda';

const client = new SFNClient({});

interface TriggerResponse {
  PhysicalResourceId: string;
}

export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<TriggerResponse> => {
  console.log('Trigger event:', JSON.stringify(event, null, 2));

  const stateMachineArn = process.env.STATE_MACHINE_ARN;
  if (!stateMachineArn) {
    throw new Error('STATE_MACHINE_ARN environment variable not set.');
  }

  // The custom resource properties become the input for the state machine.
  const input = JSON.stringify({
    GSIs: event.ResourceProperties.GSIs,
    TableName: event.ResourceProperties.TableName,
  });

  const command = new StartExecutionCommand({
    stateMachineArn,
    input,
  });

  try {
    const response = await client.send(command);
    console.log('State machine started:', response);
    // Return a PhysicalResourceId (using the RequestId as a fallback).
    return { PhysicalResourceId: event.RequestId };
  } catch (error) {
    console.error('Error starting state machine:', error);
    throw error;
  }
};
