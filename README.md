# DynamoDB Multi-GSI Updater Custom Resource

This project provides a solution to work around DynamoDB's limitation of updating only one Global Secondary Index (GSI) per API call by using a Lambda-backed Custom Resource in AWS CDK. The solution sequentially creates multiple GSIs on an existing DynamoDB table. It is designed to be idempotent by checking if a GSI already exists before attempting creation and polling until the index becomes active.

> **Future Enhancement:**  
> A potential upgrade is to use AWS Step Functions to orchestrate the creation and activation of GSIs. This would be particularly beneficial for long-running GSI creation tasks that might exceed typical Lambda timeouts.

## Features

- **Sequential GSI Creation:**  
  Processes each GSI one at a time to conform with DynamoDB’s single-index update limitation.
- **Idempotency:**  
  Checks for the existence of a GSI before attempting creation, preventing duplicate creation errors during retries.
- **Polling Mechanism:**  
  Continuously polls the DynamoDB table until each new GSI reaches the `ACTIVE` state before moving to the next.
- **Lambda-backed Custom Resource:**  
  Integrates with AWS CDK and CloudFormation to automate the GSI creation during stack deployment.
- **Extensible Architecture:**  
  Designed for future enhancements, including replacing the Lambda orchestration with AWS Step Functions for better handling of long-running operations.

## DynamoDB GSI Updater - Project Structure

```
my-cdk-project/
├── bin/
│   └── my-cdk-project.ts   # CDK app entry point
├── lib/
│   ├── dynamodb-gsi-updater.ts   # Custom resource construct definition
│   └── my-stack.ts   # Sample stack using the custom resource
├── lambda/
│   └── index.js   # Lambda function code for GSI updates
├── package.json   # NPM configuration and dependencies
├── tsconfig.json   # TypeScript configuration
└── README.md   # This file
```

This project structure organizes the DynamoDB GSI Updater solution into standard CDK project directories:

- `bin/`: Contains the CDK app entry point
- `lib/`: Houses the main construct and stack definitions
- `lambda/`: Contains the Lambda function code that handles GSI updates
- Configuration files for TypeScript and NPM package management

## Prerequisites

- Node.js (v20.x or higher)
- AWS CDK CLI (install globally with `npm install -g aws-cdk`)
- AWS credentials configured (e.g., via `aws configure`)

## Setup and Deployment

1. **Clone the Repository:**

   ```bash
   git clone <repository-url>
   cd my-cdk-project
   ```
2. **Install Dependencies:**
   
   ```bash 
   npm install
   ```

3. **Build the Project (if necessary)**
    
    ```bash
    npm run build
    ```

4. **Synthesize the CloudFormation Template**

    ```bash
    npx cdk synth
    ```

5. **Deploy the Stack**

    ```bash
    npx cdk deploy
    ```

During deployment, the custom resource will:

- Create or update your DynamoDB table.
- Invoke the Lambda function that sequentially processes the defined GSIs.
- Wait until each GSI becomes active before proceeding to the next.
- You can keep adding GSIs to the DynamoDbGsiUpdater construct and deploying mutiple GSIs in one deploy  

## How It Works

### Custom Resource Construct:
The DynamoDbGsiUpdater construct accepts a DynamoDB table and an array of GSI definitions. It deploys a Lambda function and sets up a CloudFormation custom resource that triggers the Lambda during stack creation or updates.

### Lambda Function:
The Lambda function:

- Receives events from CloudFormation.
- Checks whether each specified GSI already exists by calling DescribeTable.
- If a GSI does not exist, calls UpdateTable to create it.
- Polls the table every 10 seconds until the GSI status is ACTIVE.
- Returns a success status to CloudFormation, ensuring that the custom resource is marked complete.

### Error Handling and Idempotency:
The solution is designed to be idempotent. Duplicate events (or retries) are handled gracefully by verifying if the GSI exists before attempting creation, thereby avoiding duplicate creation errors.

## Future Enhancements

### Step Functions Integration:
For environments where GSI creation might take longer than the Lambda timeout or where more robust error handling is needed, consider upgrading the solution to use AWS Step Functions. This approach would:
- Handle retries, delays, and errors more gracefully.
- Decouple the orchestration logic from a single Lambda execution.
- Provide detailed execution history and enhanced logging.

### Improved Rollback Logic:
Future improvements might include rollback functionality to ensure that partial updates do not leave the DynamoDB table in an inconsistent state if a GSI fails to become active.

## Contributing
Contributions, issues, and feature requests are welcome! Please open an issue or submit a pull request if you have suggestions or find any bugs.

## License
This project is licensed under the MIT License.


