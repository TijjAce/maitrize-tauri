// Compile le paquet Swift (CryptoKit) et le lie, pour l'iPhone seulement :
// ailleurs, le relais chiffre en Rust et ce paquet n'est jamais demandé.
fn main() {
    println!("cargo:rerun-if-changed=swift");
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() != Ok("ios") {
        return;
    }
    // Comme Tauri pour ses greffons : le SDKROOT posé par Xcode égarerait `swift build`.
    let sdk = std::env::var_os("SDKROOT");
    std::env::remove_var("SDKROOT");
    swift_rs::SwiftLinker::new("10.15")
        .with_ios(&std::env::var("IPHONEOS_DEPLOYMENT_TARGET").unwrap_or_else(|_| "15.0".into()))
        .with_package("maitrize-relais-apple", "swift")
        .link();
    if let Some(sdk) = sdk {
        std::env::set_var("SDKROOT", sdk);
    }
}
