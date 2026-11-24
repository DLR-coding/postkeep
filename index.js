// Le runner du service des résumés IA doit être enregistré au chargement du bundle, avant
// le routeur : notify-kit peut démarrer le JS sans écran (ARCHITECTURE.md §13).
import './src/lib/ai-runner';
import 'expo-router/entry';
