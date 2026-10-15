// swift-tools-version:5.5
import PackageDescription

// Le chiffrement du relais sur l'iPhone, par CryptoKit. Voir Sources/Chiffre.swift.
let package = Package(
  name: "maitrize-relais-apple",
  platforms: [
    .iOS(.v15),
    .macOS(.v10_15),
  ],
  products: [
    .library(name: "maitrize-relais-apple", type: .static, targets: ["maitrize-relais-apple"])
  ],
  targets: [
    .target(name: "maitrize-relais-apple", path: "Sources")
  ]
)
