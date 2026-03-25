import { atom } from "../app-jotai";

import type { Client, Drawing } from "../data/types";
import type { User } from "firebase/auth";

// Auth state
export const currentUserAtom = atom<User | null>(null);
export const isAuthenticatedAtom = atom<boolean>(false);
export const authErrorAtom = atom<string | null>(null);

// UI state
export const currentClientIdAtom = atom<string | null>(null);
export const currentDrawingIdAtom = atom<string | null>(null);
export const clientsAtom = atom<Client[]>([]);
export const drawingsAtom = atom<Drawing[]>([]);
export const isSavingAtom = atom<boolean>(false);
export const isLoadingAtom = atom<boolean>(false);
