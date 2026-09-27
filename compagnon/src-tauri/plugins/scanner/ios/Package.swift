// swift-tools-version:5.3
import PackageDescription

let package = Package(
  name: "tauri-plugin-scanner",
  platforms: [
    .iOS(.v13),
  ],
  products: [
    .library(
      name: "tauri-plugin-scanner",
      type: .static,
      targets: ["tauri-plugin-scanner"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-scanner",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
