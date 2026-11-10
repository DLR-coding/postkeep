import { create } from 'zustand';

/** Texte de la recherche de la barre du bas (refonte, tâche 4). Interface seulement :
 *  rien n'est persisté. Les écrans All posts et Collections le lisent pour filtrer. */
type NavSearchStore = {
  query: string;
  setQuery: (query: string) => void;
  clear: () => void;
};

export const useNavSearchStore = create<NavSearchStore>((set) => ({
  query: '',
  setQuery: (query) => set({ query }),
  clear: () => set({ query: '' }),
}));
