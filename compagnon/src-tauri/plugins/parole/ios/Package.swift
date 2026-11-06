// swift-tools-version:5.3
import PackageDescription

let package = Package(
  name: "tauri-plugin-parole",
  platforms: [
    .iOS(.v13),
  ],
  products: [
    .library(
      name: "tauri-plugin-parole",
      type: .static,
      targets: ["tauri-plugin-parole"])
  ],
  dependencies: [
    .package(name: "Tauri", path: "../.tauri/tauri-api")
  ],
  targets: [
    .target(
      name: "tauri-plugin-parole",
      dependencies: [
        .byName(name: "Tauri")
      ],
      path: "Sources")
  ]
)
