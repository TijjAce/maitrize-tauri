// L'appareil des pages d'un manuel : une photo, on ajuste, on garde.
//
// Le scanner de Notes (VisionKit) gardait toutes les pages en mémoire et ne
// les rendait qu'à « Enregistrer » : une application fermée en chemin —
// plantage, appel, iOS qui reprend sa mémoire — les perdait toutes. Et ses
// cadrages automatiques se reprenaient après coup, page par page.
//
// Ici, chaque photo s'ajuste aussitôt prise — les coins sont déjà posés sur
// la page que Vision a trouvée — et la page gardée est écrite tout de suite
// dans le dossier de l'application. Il n'y a jamais qu'une photo en mémoire.

import AVFoundation
import AVKit
import CoreImage
import UIKit

/// La couleur de Maitrize : le cadre de la page, le bouton qui garde.
private let accent = UIColor(red: 0.388, green: 0.400, blue: 0.945, alpha: 1)

final class AppareilPages: UIViewController, AVCapturePhotoCaptureDelegate {
  private let dossier: URL
  private let quandGardee: (String, Int) -> Void
  private let quandFini: (Int) -> Void

  private let session = AVCaptureSession()
  private let sortie = AVCapturePhotoOutput()
  /// La caméra se règle et se commande sur sa propre file, jamais sur celle de l'écran.
  private let fileCamera = DispatchQueue(label: "fr.clementsapp.maitrize.appareil")
  /// Les pages s'écrivent une à une, dans l'ordre où on les a gardées.
  private let fileEcriture = DispatchQueue(label: "fr.clementsapp.maitrize.pages", qos: .userInitiated)
  private let contexte = CIContext(options: [.cacheIntermediates: false])
  private var apercu: AVCaptureVideoPreviewLayer?
  private var camera: AVCaptureDevice?

  private var gardees = 0
  private var aEcrire = 0
  private var finir = false
  private var fini = false
  /// La dernière orientation franche du téléphone : tenu à plat au-dessus du livre, il ne dit plus rien.
  private var orientation = UIDeviceOrientation.portrait

  private let titre = UILabel()
  private let declencheur = UIButton(type: .custom)
  private let termine = UIButton(type: .system)
  private let vignette = UIImageView()
  private var ajustement: Ajustement?
  private var avisJusquA = Date.distantPast

  init(dossier: URL, quandGardee: @escaping (String, Int) -> Void, quandFini: @escaping (Int) -> Void) {
    self.dossier = dossier
    self.quandGardee = quandGardee
    self.quandFini = quandFini
    super.init(nibName: nil, bundle: nil)
    modalPresentationStyle = .fullScreen
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) n'est pas utilisé") }

  deinit {
    NotificationCenter.default.removeObserver(self)
    UIDevice.current.endGeneratingDeviceOrientationNotifications()
  }

  override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
  override var prefersStatusBarHidden: Bool { true }

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black

    // Toute la photo à l'écran, sans rien rogner : ce qu'on voit est ce qui sera pris.
    let couche = AVCaptureVideoPreviewLayer(session: session)
    couche.videoGravity = .resizeAspect
    view.layer.addSublayer(couche)
    apercu = couche

    titre.textColor = .white
    titre.font = .systemFont(ofSize: 17, weight: .semibold)
    titre.textAlignment = .center
    titre.numberOfLines = 2

    // Le déclencheur : un rond blanc cerclé, comme l'appareil photo de l'iPhone.
    declencheur.backgroundColor = .white
    declencheur.layer.cornerRadius = 34
    declencheur.layer.borderWidth = 5
    declencheur.layer.borderColor = UIColor(white: 0.72, alpha: 1).cgColor
    declencheur.accessibilityLabel = "Photographier la page"
    declencheur.addTarget(self, action: #selector(declencher), for: .touchUpInside)

    termine.setTitle("Terminé", for: .normal)
    termine.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
    termine.setTitleColor(.white, for: .normal)
    termine.setTitleColor(UIColor(white: 1, alpha: 0.4), for: .disabled)
    termine.addTarget(self, action: #selector(terminer), for: .touchUpInside)

    vignette.contentMode = .scaleAspectFill
    vignette.clipsToBounds = true
    vignette.layer.cornerRadius = 6
    vignette.layer.borderWidth = 1.5
    vignette.layer.borderColor = UIColor.white.cgColor
    vignette.isHidden = true
    vignette.accessibilityLabel = "Dernière page gardée"

    for v in [titre, declencheur, termine, vignette] as [UIView] {
      v.translatesAutoresizingMaskIntoConstraints = false
      view.addSubview(v)
    }
    let g = view.safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      titre.topAnchor.constraint(equalTo: g.topAnchor, constant: 14),
      titre.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 16),
      titre.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -16),
      declencheur.centerXAnchor.constraint(equalTo: g.centerXAnchor),
      declencheur.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -22),
      declencheur.widthAnchor.constraint(equalToConstant: 68),
      declencheur.heightAnchor.constraint(equalToConstant: 68),
      termine.centerYAnchor.constraint(equalTo: declencheur.centerYAnchor),
      termine.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -22),
      vignette.centerYAnchor.constraint(equalTo: declencheur.centerYAnchor),
      vignette.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 22),
      vignette.widthAnchor.constraint(equalToConstant: 46),
      vignette.heightAnchor.constraint(equalToConstant: 60),
    ])

    // Toucher l'image fait la mise au point à cet endroit.
    view.addGestureRecognizer(UITapGestureRecognizer(target: self, action: #selector(mettreAuPoint(_:))))
    // Les boutons du volume déclenchent aussi : on tient le téléphone à deux mains au-dessus du livre.
    if #available(iOS 17.2, *) {
      view.addInteraction(AVCaptureEventInteraction { [weak self] evenement in
        if evenement.phase == .ended { self?.declencher() }
      })
    }
    UIDevice.current.beginGeneratingDeviceOrientationNotifications()
    NotificationCenter.default.addObserver(
      self, selector: #selector(orientationChangee), name: UIDevice.orientationDidChangeNotification, object: nil)
    majTitre()
    configurer()
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    apercu?.frame = view.bounds
  }

  // ── La caméra ──────────────────────────────────────────────────────────

  private func configurer() {
    fileCamera.async { [weak self] in
      guard let self else { return }
      let s = self.session
      s.beginConfiguration()
      s.sessionPreset = .photo
      guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
        let entree = try? AVCaptureDeviceInput(device: camera), s.canAddInput(entree), s.canAddOutput(self.sortie)
      else {
        s.commitConfiguration()
        DispatchQueue.main.async {
          self.declencheur.isEnabled = false
          self.dire("La caméra n'est pas disponible.", pendant: 3600)
        }
        return
      }
      s.addInput(entree)
      s.addOutput(self.sortie)
      self.sortie.maxPhotoQualityPrioritization = .balanced
      s.commitConfiguration()
      if (try? camera.lockForConfiguration()) != nil {
        if camera.isFocusModeSupported(.continuousAutoFocus) { camera.focusMode = .continuousAutoFocus }
        // Un livre se photographie de près.
        if camera.isAutoFocusRangeRestrictionSupported { camera.autoFocusRangeRestriction = .near }
        camera.unlockForConfiguration()
      }
      self.camera = camera
      s.startRunning()
      DispatchQueue.main.async {
        if let c = self.apercu?.connection { Self.orienter(c, angle: 90) }
      }
    }
  }

  /// L'angle qui met la photo droite, d'après la façon dont on tient le téléphone.
  private func angleDeCapture() -> CGFloat {
    switch orientation {
    case .landscapeLeft: return 0
    case .landscapeRight: return 180
    case .portraitUpsideDown: return 270
    default: return 90
    }
  }

  private static func orienter(_ c: AVCaptureConnection, angle: CGFloat) {
    if #available(iOS 17.0, *) {
      if c.isVideoRotationAngleSupported(angle) { c.videoRotationAngle = angle }
    } else if c.isVideoOrientationSupported {
      switch angle {
      case 0: c.videoOrientation = .landscapeRight
      case 180: c.videoOrientation = .landscapeLeft
      case 270: c.videoOrientation = .portraitUpsideDown
      default: c.videoOrientation = .portrait
      }
    }
  }

  @objc private func orientationChangee() {
    let o = UIDevice.current.orientation
    if o.isPortrait || o.isLandscape { orientation = o }
  }

  @objc private func mettreAuPoint(_ geste: UITapGestureRecognizer) {
    guard ajustement == nil, let couche = apercu else { return }
    let point = couche.captureDevicePointConverted(fromLayerPoint: geste.location(in: view))
    fileCamera.async { [weak self] in
      guard let camera = self?.camera, (try? camera.lockForConfiguration()) != nil else { return }
      if camera.isFocusPointOfInterestSupported, camera.isFocusModeSupported(.continuousAutoFocus) {
        camera.focusPointOfInterest = point
        camera.focusMode = .continuousAutoFocus
      }
      if camera.isExposurePointOfInterestSupported, camera.isExposureModeSupported(.continuousAutoExposure) {
        camera.exposurePointOfInterest = point
        camera.exposureMode = .continuousAutoExposure
      }
      camera.unlockForConfiguration()
    }
  }

  @objc private func declencher() {
    guard ajustement == nil, declencheur.isEnabled, !finir else { return }
    declencheur.isEnabled = false
    UIImpactFeedbackGenerator(style: .light).impactOccurred()
    let angle = angleDeCapture()
    fileCamera.async { [weak self] in
      guard let self else { return }
      guard self.session.isRunning else {
        DispatchQueue.main.async { self.declencheur.isEnabled = true }
        return
      }
      if let c = self.sortie.connection(with: .video) { Self.orienter(c, angle: angle) }
      let reglages = AVCapturePhotoSettings()
      // Pas d'éclair : il fait un reflet blanc au milieu d'une page glacée.
      if self.sortie.supportedFlashModes.contains(.off) { reglages.flashMode = .off }
      reglages.photoQualityPrioritization = .balanced
      self.sortie.capturePhoto(with: reglages, delegate: self)
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    guard error == nil, let donnees = photo.fileDataRepresentation() else {
      DispatchQueue.main.async {
        self.declencheur.isEnabled = true
        self.dire("La photo n'a pas pu être prise : réessayez.")
      }
      return
    }
    traiter(donnees)
  }

  /// La photo réduite pour l'écran, et la page que Vision y trouve : de quoi ajuster aussitôt.
  private func traiter(_ donnees: Data) {
    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
      guard let self else { return }
      let ecran = CIImage(data: donnees, options: [.applyOrientationProperty: true])
        .flatMap { PagesDuManuel.reduite($0, cote: 1600, contexte: self.contexte) }
      let coins = ecran.flatMap { PagesDuManuel.pageTrouvee(dans: $0) } ?? PagesDuManuel.parDefaut
      DispatchQueue.main.async {
        self.declencheur.isEnabled = !self.finir
        guard let ecran else {
          self.dire("La photo est illisible : réessayez.")
          return
        }
        self.ajuster(donnees: donnees, ecran: ecran, coins: coins)
      }
    }
  }

  // ── L'ajustement, puis la page écrite ───────────────────────────────────

  private func ajuster(donnees: Data, ecran: CGImage, coins: [CGPoint]) {
    let a = Ajustement(photo: ecran, coins: coins, contexte: contexte)
    a.quandReprendre = { [weak self] in self?.fermerAjustement() }
    a.quandGarder = { [weak self] coins, quarts in self?.garder(donnees: donnees, coins: coins, quarts: quarts) }
    a.translatesAutoresizingMaskIntoConstraints = false
    view.addSubview(a)
    NSLayoutConstraint.activate([
      a.leadingAnchor.constraint(equalTo: view.leadingAnchor),
      a.trailingAnchor.constraint(equalTo: view.trailingAnchor),
      a.topAnchor.constraint(equalTo: view.topAnchor),
      a.bottomAnchor.constraint(equalTo: view.bottomAnchor),
    ])
    ajustement = a
  }

  private func fermerAjustement() {
    ajustement?.removeFromSuperview()
    ajustement = nil
  }

  private func garder(donnees: Data, coins: [CGPoint], quarts: Int) {
    fermerAjustement()
    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    aEcrire += 1
    majTitre()
    fileEcriture.async { [weak self] in
      guard let self else { return }
      var ecrite: (nom: String, vignette: CGImage?)?
      autoreleasepool {
        guard let photo = CIImage(data: donnees, options: [.applyOrientationProperty: true]),
          let jpeg = PagesDuManuel.page(depuis: photo, coins: coins, quarts: quarts, contexte: self.contexte)
        else { return }
        // Le nom dit l'heure à la milliseconde : deux pages ne le partagent pas, et leur ordre est celui des prises.
        var quand = Date()
        var nom = PagesDuManuel.nom(le: quand)
        while FileManager.default.fileExists(atPath: self.dossier.appendingPathComponent(nom).path) {
          quand.addTimeInterval(0.001)
          nom = PagesDuManuel.nom(le: quand)
        }
        guard (try? jpeg.write(to: self.dossier.appendingPathComponent(nom), options: .atomic)) != nil else { return }
        ecrite = (nom, PagesDuManuel.vignette(de: jpeg, cote: 160))
      }
      DispatchQueue.main.async {
        self.aEcrire -= 1
        if let ecrite {
          self.gardees += 1
          if let v = ecrite.vignette {
            self.vignette.image = UIImage(cgImage: v)
            self.vignette.isHidden = false
          }
          self.quandGardee(ecrite.nom, self.gardees)
        } else {
          self.dire("Cette page n'a pas pu être enregistrée : reprenez-la.")
        }
        self.majTitre()
        self.finirSiPret()
      }
    }
  }

  @objc private func terminer() {
    guard !finir else { return }
    finir = true
    declencheur.isEnabled = false
    termine.isEnabled = false
    majTitre()
    finirSiPret()
  }

  /// On ne referme qu'une fois toutes les pages gardées écrites : aucune ne reste en route.
  private func finirSiPret() {
    guard finir, aEcrire == 0, !fini else { return }
    fini = true
    fileCamera.async { [session] in session.stopRunning() }
    dismiss(animated: true) { [gardees, quandFini] in quandFini(gardees) }
  }

  // ── Ce que l'écran dit ──────────────────────────────────────────────────

  private func majTitre() {
    guard Date() >= avisJusquA else { return }
    titre.textColor = .white
    let n = gardees + aEcrire
    if finir {
      titre.text = aEcrire > 0 ? "Enregistrement des pages…" : ""
    } else if n == 0 {
      titre.text = "Cadrez la page, puis déclenchez."
    } else {
      titre.text = n == 1 ? "1 page gardée" : "\(n) pages gardées"
    }
  }

  private func dire(_ message: String, pendant secondes: TimeInterval = 3) {
    avisJusquA = Date().addingTimeInterval(secondes)
    titre.textColor = .systemYellow
    titre.text = message
    DispatchQueue.main.asyncAfter(deadline: .now() + secondes) { [weak self] in self?.majTitre() }
  }
}

// ── L'ajustement d'une photo ────────────────────────────────────────────────
//
// Les quatre coins de la page, posés là où Vision l'a trouvée, à tirer du
// doigt ; une loupe montre ce qu'il y a sous le doigt. « Garder » écrit la
// page, « Reprendre » la refait.

final class Ajustement: UIView {
  var quandReprendre: (() -> Void)?
  var quandGarder: (([CGPoint], Int) -> Void)?

  private var photo: CGImage
  private var coins: [CGPoint]
  private var quarts = 0
  private let contexte: CIContext
  private let vue = UIImageView()
  private let voile = CAShapeLayer()
  private let trait = CAShapeLayer()
  private var poignees: [CAShapeLayer] = []
  private let loupe = UIView()
  private let contenuLoupe = CALayer()
  private var saisi: Int?
  private var decalage = CGPoint.zero

  init(photo: CGImage, coins: [CGPoint], contexte: CIContext) {
    self.photo = photo
    self.coins = coins
    self.contexte = contexte
    super.init(frame: .zero)
    backgroundColor = .black

    vue.contentMode = .scaleAspectFit
    vue.image = UIImage(cgImage: photo)
    addSubview(vue)

    // Hors de la page, la photo s'assombrit : on voit d'un coup d'œil ce qui sera gardé.
    voile.fillRule = .evenOdd
    voile.fillColor = UIColor(white: 0, alpha: 0.55).cgColor
    trait.fillColor = UIColor.clear.cgColor
    trait.strokeColor = accent.cgColor
    trait.lineWidth = 3
    trait.lineJoin = .round
    layer.addSublayer(voile)
    layer.addSublayer(trait)
    for _ in 0..<4 {
      let p = CAShapeLayer()
      p.fillColor = UIColor.white.cgColor
      p.strokeColor = accent.cgColor
      p.lineWidth = 3
      layer.addSublayer(p)
      poignees.append(p)
    }

    loupe.frame = CGRect(x: 0, y: 0, width: 116, height: 116)
    loupe.layer.cornerRadius = 58
    loupe.layer.borderWidth = 3
    loupe.layer.borderColor = UIColor.white.cgColor
    loupe.clipsToBounds = true
    loupe.isHidden = true
    loupe.isUserInteractionEnabled = false
    contenuLoupe.frame = loupe.bounds
    contenuLoupe.contents = photo
    contenuLoupe.contentsGravity = .resize
    loupe.layer.addSublayer(contenuLoupe)
    let croix = CAShapeLayer()
    let c = UIBezierPath()
    c.move(to: CGPoint(x: 58, y: 44)); c.addLine(to: CGPoint(x: 58, y: 72))
    c.move(to: CGPoint(x: 44, y: 58)); c.addLine(to: CGPoint(x: 72, y: 58))
    croix.path = c.cgPath
    croix.strokeColor = accent.cgColor
    croix.lineWidth = 2
    loupe.layer.addSublayer(croix)
    addSubview(loupe)

    let toute = Self.bouton("Toute la photo")
    toute.addTarget(self, action: #selector(prendreToute), for: .touchUpInside)
    let tourner = Self.bouton("", symbole: "rotate.right")
    tourner.accessibilityLabel = "Tourner d'un quart de tour"
    tourner.addTarget(self, action: #selector(tournerUnQuart), for: .touchUpInside)
    let consigne = UILabel()
    consigne.text = "Ajustez les coins"
    consigne.textColor = UIColor(white: 1, alpha: 0.75)
    consigne.font = .systemFont(ofSize: 15, weight: .medium)
    let reprendre = Self.bouton("Reprendre")
    reprendre.addTarget(self, action: #selector(refaire), for: .touchUpInside)
    let garder = Self.bouton("Garder", plein: true)
    garder.addTarget(self, action: #selector(garderLaPage), for: .touchUpInside)

    for v in [toute, consigne, tourner, reprendre, garder] as [UIView] {
      v.translatesAutoresizingMaskIntoConstraints = false
      addSubview(v)
    }
    let g = safeAreaLayoutGuide
    NSLayoutConstraint.activate([
      toute.topAnchor.constraint(equalTo: g.topAnchor, constant: 8),
      toute.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 8),
      consigne.centerYAnchor.constraint(equalTo: toute.centerYAnchor),
      consigne.centerXAnchor.constraint(equalTo: g.centerXAnchor),
      tourner.centerYAnchor.constraint(equalTo: toute.centerYAnchor),
      tourner.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -8),
      reprendre.bottomAnchor.constraint(equalTo: g.bottomAnchor, constant: -18),
      reprendre.leadingAnchor.constraint(equalTo: g.leadingAnchor, constant: 14),
      garder.centerYAnchor.constraint(equalTo: reprendre.centerYAnchor),
      garder.trailingAnchor.constraint(equalTo: g.trailingAnchor, constant: -18),
    ])

    addGestureRecognizer(UIPanGestureRecognizer(target: self, action: #selector(tirer(_:))))
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) n'est pas utilisé") }

  private static func bouton(_ titre: String, plein: Bool = false, symbole: String? = nil) -> UIButton {
    var c = plein ? UIButton.Configuration.filled() : UIButton.Configuration.plain()
    c.baseForegroundColor = .white
    if !titre.isEmpty { c.title = titre }
    if let symbole { c.image = UIImage(systemName: symbole, withConfiguration: UIImage.SymbolConfiguration(pointSize: 20, weight: .semibold)) }
    c.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { a in
      var a = a
      a.font = .systemFont(ofSize: 17, weight: plein ? .bold : .semibold)
      return a
    }
    if plein {
      c.baseBackgroundColor = accent
      c.cornerStyle = .capsule
      c.contentInsets = NSDirectionalEdgeInsets(top: 12, leading: 34, bottom: 12, trailing: 34)
    }
    return UIButton(configuration: c)
  }

  /// Où la photo se tient à l'écran : entre la barre du haut et celle du bas.
  private var zoneImage: CGRect {
    AVMakeRect(aspectRatio: CGSize(width: photo.width, height: photo.height), insideRect: vue.frame)
  }

  private func aLEcran(_ p: CGPoint) -> CGPoint {
    let r = zoneImage
    return CGPoint(x: r.minX + p.x * r.width, y: r.minY + p.y * r.height)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    let haut = safeAreaInsets.top + 56
    let bas = safeAreaInsets.bottom + 86
    vue.frame = CGRect(x: 14, y: haut, width: bounds.width - 28, height: max(0, bounds.height - haut - bas))
    dessiner()
  }

  private func dessiner() {
    let r = zoneImage
    guard r.width > 0, r.height > 0 else { return }
    // Le contour suit les coins dans leur ordre : un coin tiré au-delà d'un autre ne fait pas de nœud.
    let ordre = PagesDuManuel.ordonnes(coins).map(aLEcran)
    let cadre = UIBezierPath()
    cadre.move(to: ordre[0])
    for p in ordre.dropFirst() { cadre.addLine(to: p) }
    cadre.close()
    let tout = UIBezierPath(rect: r)
    tout.append(cadre)
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    voile.path = tout.cgPath
    trait.path = cadre.cgPath
    for (i, p) in coins.map(aLEcran).enumerated() {
      poignees[i].path = UIBezierPath(ovalIn: CGRect(x: p.x - 12, y: p.y - 12, width: 24, height: 24)).cgPath
    }
    CATransaction.commit()
  }

  @objc private func tirer(_ geste: UIPanGestureRecognizer) {
    let doigt = geste.location(in: self)
    switch geste.state {
    case .began:
      // Le coin le plus proche du doigt, s'il est assez près ; il suit le doigt sans sauter dessous.
      let proches = coins.map(aLEcran).enumerated().map { ($0.offset, $0.element, hypot($0.element.x - doigt.x, $0.element.y - doigt.y)) }
      guard let plus = proches.min(by: { $0.2 < $1.2 }), plus.2 < 70 else { saisi = nil; return }
      saisi = plus.0
      decalage = CGPoint(x: plus.1.x - doigt.x, y: plus.1.y - doigt.y)
    case .changed:
      guard let i = saisi else { return }
      let r = zoneImage
      let p = CGPoint(x: doigt.x + decalage.x, y: doigt.y + decalage.y)
      coins[i] = CGPoint(x: min(max((p.x - r.minX) / r.width, 0), 1), y: min(max((p.y - r.minY) / r.height, 0), 1))
      dessiner()
      montrerLoupe(sur: coins[i], doigt: doigt)
    default:
      saisi = nil
      loupe.isHidden = true
    }
  }

  /// La loupe, au-dessus du doigt : le coin s'y voit, que le doigt cache.
  private func montrerLoupe(sur coin: CGPoint, doigt: CGPoint) {
    let r = zoneImage
    let vu = loupe.bounds.width / 2.5
    let l = vu / r.width, h = vu / r.height
    var centre = CGPoint(x: doigt.x, y: doigt.y - 120)
    if centre.y < safeAreaInsets.top + 70 { centre.y = doigt.y + 120 }
    centre.x = min(max(centre.x, 64), bounds.width - 64)
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    contenuLoupe.contentsRect = CGRect(x: coin.x - l / 2, y: coin.y - h / 2, width: l, height: h)
    loupe.center = centre
    CATransaction.commit()
    loupe.isHidden = false
  }

  @objc private func prendreToute() {
    coins = PagesDuManuel.toutePhoto
    dessiner()
  }

  @objc private func tournerUnQuart() {
    let tournee = PagesDuManuel.tournee(CIImage(cgImage: photo), quarts: 1)
    guard let image = contexte.createCGImage(tournee, from: tournee.extent) else { return }
    photo = image
    coins = coins.map(PagesDuManuel.apresUnQuart)
    quarts = (quarts + 1) % 4
    vue.image = UIImage(cgImage: image)
    contenuLoupe.contents = image
    setNeedsLayout()
  }

  @objc private func refaire() { quandReprendre?() }

  @objc private func garderLaPage() { quandGarder?(coins, quarts) }
}
