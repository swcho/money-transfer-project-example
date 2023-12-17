// @@@SNIPSTART money-transfer-project-template-ts-start-workflow

import { Connection, WorkflowClient } from '@temporalio/client';
import { moneyTransfer } from './workflows';
import type { PaymentDetails } from './shared';

import { namespace, taskQueueName } from './shared';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { OpenTelemetryWorkflowClientInterceptor } from '@temporalio/interceptors-opentelemetry';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { InterceptingCall, Interceptor } from '@grpc/grpc-js';

const interceptor: Interceptor = function(options, nextCall) {
  return new InterceptingCall(nextCall(options), {
      sendMessage(message, next) {
          console.log('GRPC.sendMessage', message);
          next(message);
      }
  });
};

async function run() {

  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'interceptors-sample-client',
  });
  // Export spans to console for simplicity
  const exporter = new ConsoleSpanExporter();

  const otel = new NodeSDK({ traceExporter: exporter, resource });
  await otel.start();

  const connection = await Connection.connect({
    interceptors: [interceptor]
  });
  const client = new WorkflowClient({ connection, namespace, interceptors: [
    new OpenTelemetryWorkflowClientInterceptor()
  ] });

  const details: PaymentDetails = {
    amount: 400,
    sourceAccount: '85-150',
    targetAccount: '43-812',
    referenceId: '12345',
  };

  console.log(
    `Starting transfer from account ${details.sourceAccount} to account ${details.targetAccount} for $${details.amount}`
  );

  const handle = await client.start(moneyTransfer, {
    args: [details],
    taskQueue: taskQueueName,
    workflowId: 'pay-invoice-801',
  });

  console.log(
    `Started Workflow ${handle.workflowId} with RunID ${handle.firstExecutionRunId}`
  );
  console.log(await handle.result());
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
// @@@SNIPEND
