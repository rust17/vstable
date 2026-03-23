mod commands;
mod grpc;
mod utils;

pub mod vstable {
    tonic::include_proto!("vstable");
}

use tauri_plugin_shell::ShellExt;
use std::sync::Arc;
use tokio::sync::Mutex;
use grpc::GrpcState;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .manage(GrpcState { client: Arc::new(Mutex::new(None)), port: 39082 })
    .invoke_handler(tauri::generate_handler![
      commands::db_connect,
      commands::db_query,
      commands::db_disconnect,
      commands::engine_ping,
      commands::window_toggle_maximize,
      commands::sql_generate_alter,
      commands::sql_generate_create
    ])
    .setup(|app| {
      // Start Go sidecar
      let sidecar_command = app.handle().shell().sidecar("vstable-engine").unwrap();
      let (mut rx, _child) = sidecar_command.spawn().expect("failed to spawn sidecar");

      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          if let tauri_plugin_shell::process::CommandEvent::Stdout(line) = event {
            println!("Sidecar: {}", String::from_utf8_lossy(&line));
          } else if let tauri_plugin_shell::process::CommandEvent::Stderr(line) = event {
            eprintln!("Sidecar Error: {}", String::from_utf8_lossy(&line));
          }
        }
      });

      // Give the sidecar some time to start before the frontend tries to connect
      std::thread::sleep(std::time::Duration::from_millis(500));

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
