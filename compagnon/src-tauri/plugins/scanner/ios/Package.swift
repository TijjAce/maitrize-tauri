// swift-tools-version:5.3
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

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
