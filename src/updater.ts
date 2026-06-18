// Mises à jour automatiques (distribution directe hors stores).
// Vérifie le endpoint configuré dans tauri.conf.json (GitHub Releases),
// propose l'installation, puis relance l'app. Tout est vérifié par la
// signature minisign (clé publique dans tauri.conf.json).
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { ask, message } from "@tauri-apps/plugin-dialog";

/**
 * @param silencieux  Si true (démarrage), ne dit rien quand l'app est à jour
 *                    ou en cas d'erreur réseau. Si false (bouton Réglages),
 *                    affiche toujours un retour à l'utilisateur.
 */
export async function verifierMisesAJour(silencieux = true): Promise<void> {
  try {
    const update = await check();
    if (!update) {
      if (!silencieux) {
        await message("Maitrize V2 est à jour.", { title: "Mises à jour" });
      }
      return;
    }

    const installer = await ask(
      `La version ${update.version} est disponible (actuelle : ${update.currentVersion}).` +
        (update.body ? `\n\n${update.body}` : "") +
        `\n\nVoulez-vous l'installer maintenant ? L'application redémarrera.`,
      { title: "Mise à jour disponible", kind: "info" }
    );
    if (!installer) return;

    await update.downloadAndInstall();
    await relaunch();
  } catch (e) {
    console.error("updater:", e);
    if (!silencieux) {
      await message(`Impossible de vérifier les mises à jour : ${e}`, {
        title: "Mises à jour",
        kind: "error",
      });
    }
  }
}
