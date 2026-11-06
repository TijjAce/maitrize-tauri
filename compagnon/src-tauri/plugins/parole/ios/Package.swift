// swift-tools-version:5.3
// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Clément Titet — voir LICENSE et NOTICE à la racine du projet.

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
