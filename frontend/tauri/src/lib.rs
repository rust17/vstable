mod commands;
mod error;

use std::sync::Mutex;
use tauri::Manager;
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandChild;
use tauri_plugin_log::{Target, TargetKind, RotationStrategy};

struct SidecarState(Mutex<Option<CommandChild>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  let log_dir = std::env::var("HOME")
    .map(|h| std::path::PathBuf::from(h).join(".vstable").join("logs"))
    .unwrap_or_else(|_| std::env::temp_dir().join("vstable").join("logs"));

  tauri::Builder::default()
    .plugin(
        tauri_plugin_log::Builder::new()
            .targets([
                Target::new(TargetKind::Stdout),
                Target::new(TargetKind::Folder {
                    path: log_dir,
                    file_name: Some("vstable".to_string()),
                }),
                Target::new(TargetKind::Webview),
            ])
            .rotation_strategy(RotationStrategy::KeepAll)
            .max_file_size(50 * 1024 * 1024)
            .build()
    )
    .plugin(tauri_plugin_shell::init())
    .plugin(tauri_plugin_store::Builder::default().build())
    .manage(SidecarState(Mutex::new(None)))
    .invoke_handler(tauri::generate_handler![
      commands::window_toggle_maximize
    ])
    .setup(|app| {
      // Start Go sidecar
      let sidecar_command = app.handle().shell().sidecar("vstable-engine").unwrap();
      let (mut rx, child) = sidecar_command.spawn().expect("failed to spawn sidecar");

      // Store the child handle so we can kill it on exit
      let state = app.handle().state::<SidecarState>();
      *state.0.lock().unwrap() = Some(child);

      tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
          if let tauri_plugin_shell::process::CommandEvent::Stdout(line) = event {
            log::info!("Sidecar: {}", String::from_utf8_lossy(&line));
          } else if let tauri_plugin_shell::process::CommandEvent::Stderr(line) = event {
            log::error!("Sidecar Error: {}", String::from_utf8_lossy(&line));
          }
        }
      });

      // Give the sidecar some time to start before the frontend tries to connect
      std::thread::sleep(std::time::Duration::from_millis(500));

      Ok(())
    })
    .build(tauri::generate_context!())
    .expect("error while building tauri application")
    .run(|app, event| {
      if let tauri::RunEvent::Exit = event {
        let child = app.state::<SidecarState>().0.lock().unwrap().take();
        if let Some(child) = child {
          log::info!("Killing sidecar process...");
          let _: Result<(), _> = child.kill();
        }
      }
    });
}
