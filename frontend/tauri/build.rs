fn main() {
    tonic_build::configure()
        .build_server(false)
        .compile_protos(
            &["../../backend/api/vstable.proto"],
            &["../../backend/api/"],
        )
        .expect("failed to compile protos");

    tauri_build::build()
}
