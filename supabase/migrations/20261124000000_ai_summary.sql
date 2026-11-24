-- Résumé IA de la vidéo (ARCHITECTURE.md §13). Nullable : les APK antérieurs ne l'envoient
-- pas, et leurs upserts (colonnes fournies seulement) ne l'écrasent pas.
alter table public.posts add column ai_summary text;
