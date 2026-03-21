use crate::vstable::engine_service_client::EngineServiceClient;
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct GrpcState {
    pub client: Arc<Mutex<Option<EngineServiceClient<tonic::transport::Channel>>>>,
    pub port: u16,
}
