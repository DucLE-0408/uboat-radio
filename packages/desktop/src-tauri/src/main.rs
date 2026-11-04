// Release builds on Windows are GUI-subsystem apps (no console window).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // The whole game is the static radio-ui bundle served from the app itself; Rust only hosts the window.
    if let Err(err) = tauri::Builder::default().run(tauri::generate_context!()) {
        eprintln!("uboat-radio: cannot start the window: {err}");
        std::process::exit(1);
    }
}
