// Windows : `firebase emulators:exec` laisse parfois tourner le Java de l'émulateur Firestore,
// et le lancement suivant échoue (« port taken »). Lancé avant les émulateurs pour nettoyer.
// Ne tue que les processus java de l'émulateur Firestore. Sans effet hors Windows.
import { execFileSync } from 'node:child_process';

if (process.platform === 'win32') {
  const out = execFileSync(
    'powershell',
    [
      '-NoProfile',
      '-Command',
      "Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | " +
        "Where-Object { $_.CommandLine -like '*cloud-firestore-emulator*' } | " +
        'ForEach-Object { Stop-Process -Id $_.ProcessId -Force; $_.ProcessId }',
    ],
    { encoding: 'utf8' },
  ).trim();
  if (out) console.log(`Émulateur Firestore orphelin arrêté (PID ${out.split(/\s+/).join(', ')}).`);
}
