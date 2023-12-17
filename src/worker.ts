// @@@SNIPSTART money-transfer-project-template-ts-worker
import { Worker, defaultSinks } from '@temporalio/worker';
import * as activities from './activities';
import { namespace, taskQueueName } from './shared';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-base';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OpenTelemetryActivityInboundInterceptor, makeWorkflowExporter } from '@temporalio/interceptors-opentelemetry';

async function run() {
  const resource = new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'interceptors-sample-worker',
  });
  // Export spans to console for simplicity
  const exporter = new ConsoleSpanExporter();

  const otel = new NodeSDK({ traceExporter: exporter, resource });
  await otel.start();

  // const logger = new DefaultLogger('TRACE', ({ level, message, meta }) => {
  //   console.log(`${level}: ${message}`, meta);
  // })
  // Runtime.install({ logger })

  // Register Workflows and Activities with the Worker and connect to
  // the Temporal server.
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    namespace,
    taskQueue: taskQueueName,
    sinks: {
      ...defaultSinks,
      exporter: makeWorkflowExporter(exporter, resource),
    },
    interceptors: {
      workflowModules: [require.resolve('./workflows')],
      activityInbound: [(ctx) => new OpenTelemetryActivityInboundInterceptor(ctx)]
    },
    debugMode: true,
  });

  // Start accepting tasks from the Task Queue.
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
// @@@SNIPEND
