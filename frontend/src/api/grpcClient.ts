import {
  type CallOptions,
  ClientError,
  type ClientMiddlewareCall,
  createChannel,
  createClient,
} from 'nice-grpc-web';
import { type EngineServiceClient, EngineServiceDefinition } from '../types/vstable';

// Middleware to log requests and handle errors uniformly
async function* loggingAndErrorInterceptor<Request, Response>(
  call: ClientMiddlewareCall<Request, Response>,
  options: CallOptions
) {
  const traceId = crypto.randomUUID();
  console.log(`[${traceId}] gRPC Call: ${call.method.path}`, call.request);

  // Inject trace-id into metadata
  options.metadata = options.metadata || new Headers();
  if (options.metadata instanceof Headers) {
    options.metadata.set('x-trace-id', traceId);
  } else if (typeof options.metadata.set === 'function') {
    options.metadata.set('x-trace-id', traceId);
  }

  try {
    return yield* call.next(call.request, options);
  } catch (error: unknown) {
    if (error instanceof ClientError) {
      console.error(`[${traceId}] gRPC Error: ${call.method.path}`, error.code, error.details);
      const apiError = new Error(`[${error.code}] ${error.details}`);
      (apiError as any).code = error.code;
      (apiError as any).originalMessage = error.details;
      throw apiError;
    }
    throw error;
  }
}

// Create the gRPC-Web channel pointing to the local Go engine
const channel = createChannel('http://localhost:39082');

// Create the client with the interceptor
export const grpcClient: EngineServiceClient = createClient(EngineServiceDefinition, channel, {
  '*': {
    interceptors: [loggingAndErrorInterceptor],
  },
});
