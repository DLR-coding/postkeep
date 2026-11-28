import { Keyboard } from 'react-native';
import { create } from 'zustand';

type PostDetailStore = {
  postId: string | null;
  open: (id: string) => void;
  close: () => void;
};

export const usePostDetailStore = create<PostDetailStore>((set) => ({
  postId: null,
  open: (id) => {
    // Les listes gardent le clavier ouvert au tap (`keyboardShouldPersistTaps`) pour
    // qu'un seul appui ouvre le post : sans ce dismiss, la feuille s'ouvrait sous le
    // clavier de la recherche. Ici plutôt que dans chaque carte, pour tous les appelants.
    // Le texte de la recherche (nav-search-store) reste intact.
    Keyboard.dismiss();
    set({ postId: id });
  },
  close: () => set({ postId: null }),
}));
