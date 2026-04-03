use tauri::{State, Window};
use crate::grpc::GrpcState;
use crate::vstable::{ConnectRequest, DisconnectRequest, QueryRequest, PingRequest};
use crate::vstable::engine_service_client::EngineServiceClient;
use crate::utils::{json_to_prost_value, prost_struct_to_json, json_to_diff_request};

fn inject_trace_id<T>(mut req: tonic::Request<T>, trace_id: &str) -> tonic::Request<T> {
    if let Ok(meta_value) = trace_id.parse() {
        req.metadata_mut().insert("x-trace-id", meta_value);
    }
    req
}

#[tauri::command]
pub async fn db_connect(
    state: State<'_, GrpcState>,
    trace_id: String,
    id: String,
    dialect: String,
    dsn: String,
) -> Result<serde_json::Value, String> {
    log::info!("[{}] Received IPC: db_connect | id: {}, dialect: {}", trace_id, id, dialect);
    let mut client_lock = state.client.lock().await;
    let addr = format!("http://127.0.0.1:{}", state.port);
    let channel = tonic::transport::Endpoint::from_shared(addr)
        .map_err(|e| e.to_string())?
        .connect()
        .await
        .map_err(|e| e.to_string())?;

    let mut client = EngineServiceClient::new(channel);
    let request = inject_trace_id(tonic::Request::new(ConnectRequest { id, dialect, dsn }), &trace_id);
    let response = client.db_connect(request).await.map_err(|e| e.to_string())?;
    let inner = response.into_inner();

    *client_lock = Some(client);
    Ok(serde_json::json!({ "success": inner.success }))
}

#[tauri::command]
pub async fn db_query(
    state: State<'_, GrpcState>,
    trace_id: String,
    id: String,
    sql: String,
    params: Option<Vec<serde_json::Value>>,
) -> Result<serde_json::Value, String> {
    log::info!("[{}] Received IPC: db_query | id: {}, sql length: {}", trace_id, id, sql.len());
    let mut client_lock = state.client.lock().await;
    let client = client_lock.as_mut().ok_or("Not connected")?;

    let pb_params = params.map(|p| prost_types::ListValue {
        values: p.into_iter().map(json_to_prost_value).collect(),
    });

    let request = inject_trace_id(tonic::Request::new(QueryRequest { id, sql, params: pb_params }), &trace_id);
    let response = client.query(request).await.map_err(|e| e.to_string())?;
    let inner = response.into_inner();

    Ok(serde_json::json!({
        "success": inner.success,
        "rows": inner.rows.into_iter().map(prost_struct_to_json).collect::<Vec<_>>(),
        "fields": inner.fields.into_iter().map(|f| serde_json::json!({"name": f.name, "type": f.r#type})).collect::<Vec<_>>(),
    }))
}

#[tauri::command]
pub async fn db_disconnect(state: State<'_, GrpcState>, trace_id: String, id: String) -> Result<(), String> {
    log::info!("[{}] Received IPC: db_disconnect | id: {}", trace_id, id);
    let mut client_lock = state.client.lock().await;
    let client = client_lock.as_mut().ok_or("Not connected")?;
    let request = inject_trace_id(tonic::Request::new(DisconnectRequest { id }), &trace_id);
    client.disconnect(request).await.map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn engine_ping(state: State<'_, GrpcState>, trace_id: String) -> Result<bool, String> {
    log::info!("[{}] Received IPC: engine_ping", trace_id);
    let mut client_lock = state.client.lock().await;
    let addr = format!("http://127.0.0.1:{}", state.port);
    let channel = tonic::transport::Endpoint::from_shared(addr)
        .map_err(|e| e.to_string())?
        .connect()
        .await
        .map_err(|e| e.to_string())?;

    let mut client = EngineServiceClient::new(channel);
    let request = inject_trace_id(tonic::Request::new(PingRequest {}), &trace_id);
    let result = client.ping(request).await.is_ok();
    *client_lock = Some(client);
    Ok(result)
}

#[tauri::command]
pub async fn sql_generate_alter(state: State<'_, GrpcState>, trace_id: String, req: serde_json::Value) -> Result<serde_json::Value, String> {
    log::info!("[{}] Received IPC: sql_generate_alter | req: {}", trace_id, req);
    let mut client_lock = state.client.lock().await;
    let client = client_lock.as_mut().ok_or("Not connected")?;
    let diff_req = json_to_diff_request(req)?;
    let request = inject_trace_id(tonic::Request::new(diff_req), &trace_id);
    let response = client.generate_alter_table(request).await.map_err(|e| e.to_string())?;
    let inner = response.into_inner();
    Ok(serde_json::json!({ "success": inner.success, "sqls": inner.sqls }))
}

#[tauri::command]
pub async fn sql_generate_create(state: State<'_, GrpcState>, trace_id: String, req: serde_json::Value) -> Result<serde_json::Value, String> {
    log::info!("[{}] Received IPC: sql_generate_create | req: {}", trace_id, req);
    let mut client_lock = state.client.lock().await;
    let client = client_lock.as_mut().ok_or("Not connected")?;
    let diff_req = json_to_diff_request(req)?;
    let request = inject_trace_id(tonic::Request::new(diff_req), &trace_id);
    let response = client.generate_create_table(request).await.map_err(|e| e.to_string())?;
    let inner = response.into_inner();
    Ok(serde_json::json!({ "success": inner.success, "sqls": inner.sqls }))
}

#[tauri::command]
pub fn window_toggle_maximize(window: Window) -> Result<(), String> {
  if window.is_maximized().unwrap_or(false) {
    window.unmaximize().map_err(|e| e.to_string())
  } else {
    window.maximize().map_err(|e| e.to_string())
  }
}
