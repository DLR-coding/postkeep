import { create } from 'zustand';

type PostDetailStore = {
  postId: string | null;
  open: (id: string) => void;
  close: () => void;
};

export const usePostDetailStore = create<PostDetailStore>((set) => ({
  postId: null,
  open: (id) => set({ postId: id }),
  close: () => set({ postId: null }),
}));
