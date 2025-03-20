#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DDBGSIUpdaterStack } from '../lib/my-stack';
import { DDBGSIUpdaterStackUsingSF } from '../lib/my-stack-using-sf-cr';

const app = new cdk.App();

new DDBGSIUpdaterStackUsingSF(app, 'DDBGSIUpdaterStackUsingSF', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
});

new DDBGSIUpdaterStack(app, 'DDBGSIUpdaterStack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */
});

