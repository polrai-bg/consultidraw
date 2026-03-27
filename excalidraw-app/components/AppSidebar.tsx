import React from "react";

import { DefaultSidebar } from "@excalidraw/excalidraw";

import { useAtomValue } from "../app-jotai";

import { currentClientIdAtom } from "../store/drawingState";

import { ClientList } from "./ClientList";
import { DrawingList } from "./DrawingList";

import "./AppSidebar.scss";

export const PINNED_PANEL_WIDTH = 320;

export const PinnedPanel: React.FC = () => {
  const currentClientId = useAtomValue(currentClientIdAtom);

  return (
    <div
      style={{
        width: PINNED_PANEL_WIDTH,
        height: "100%",
        borderLeft: "1px solid var(--color-border-outline, #e0e0e0)",
        background: "var(--color-surface, #fff)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        flexShrink: 0,
      }}
    >
      {currentClientId ? <DrawingList /> : <ClientList />}
    </div>
  );
};

export const AppSidebar = () => {
  const currentClientId = useAtomValue(currentClientIdAtom);

  return (
    <DefaultSidebar>
      {currentClientId ? <DrawingList /> : <ClientList />}
    </DefaultSidebar>
  );
};
