import { eyeIcon } from "@excalidraw/excalidraw/components/icons";
import { MainMenu } from "@excalidraw/excalidraw/index";
import React from "react";
import { useState, useCallback } from "react";

import { useExcalidrawAPI } from "@excalidraw/excalidraw";
import { Dialog } from "@excalidraw/excalidraw/components/Dialog";

import {
  LoadIcon,
  PlusIcon,
  save,
} from "@excalidraw/excalidraw/components/icons";
import { CaptureUpdateAction } from "@excalidraw/excalidraw";

import { isDevEnv } from "@excalidraw/common";

import type { Theme } from "@excalidraw/element/types";

import { saveScene, createDrawing } from "../data/firebase";
import {
  currentClientIdAtom,
  currentDrawingIdAtom,
  isSavingAtom,
} from "../store/drawingState";
import { useAtomValue, useAtom } from "../app-jotai";

import { LanguageList } from "../app-language/LanguageList";
import { logoutUser } from "../data/firebase";

import { DrawingList } from "./DrawingList";
import { ClientList } from "./ClientList";

import { saveDebugState } from "./DebugCanvas";

export const AppMainMenu: React.FC<{
  theme: Theme | "system";
  setTheme: (theme: Theme | "system") => void;
  refresh: () => void;
}> = React.memo((props) => {
  const excalidrawAPI = useExcalidrawAPI();
  const currentClientId = useAtomValue(currentClientIdAtom);
  const [currentDrawingId, setCurrentDrawingId] = useAtom(currentDrawingIdAtom);
  const [, setIsSaving] = useAtom(isSavingAtom);
  const [isWorkspaceModalOpen, setIsWorkspaceModalOpen] = useState(false);

  const handleSaveProject = useCallback(async () => {
    if (!excalidrawAPI || !currentClientId || !currentDrawingId) {
      return;
    }
    setIsSaving(true);
    try {
      const elements = excalidrawAPI.getSceneElements();
      const appState = excalidrawAPI.getAppState();
      const files = excalidrawAPI.getFiles();
      await saveScene(
        currentClientId,
        currentDrawingId,
        elements,
        appState,
        files,
      );
      window.alert("Project saved successfully.");
    } catch (error) {
      console.error("Error saving project:", error);
      window.alert("Error saving project");
    } finally {
      setIsSaving(false);
    }
  }, [excalidrawAPI, currentClientId, currentDrawingId, setIsSaving]);

  const handleNewProject = useCallback(async () => {
    if (!currentClientId) {
      window.alert("Please select a client from 'Open Project' first.");
      return;
    }
    const name = window.prompt("Enter new project name:");
    if (!name) {
      return;
    }

    if (excalidrawAPI && currentDrawingId) {
      // Auto-save current
      handleSaveProject();
    }

    try {
      const drawing = await createDrawing(currentClientId, name, null);
      setCurrentDrawingId(drawing.id);
      if (excalidrawAPI) {
        excalidrawAPI.resetScene();
        excalidrawAPI.updateScene({
          appState: { name: drawing.name },
          captureUpdate: CaptureUpdateAction.NEVER,
        });
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  }, [
    currentClientId,
    currentDrawingId,
    excalidrawAPI,
    handleSaveProject,
    setCurrentDrawingId,
  ]);

  return (
    <MainMenu>
      <MainMenu.DefaultItems.LoadScene />
      <MainMenu.DefaultItems.SaveToActiveFile />
      <MainMenu.DefaultItems.Export />
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.DefaultItems.CommandPalette className="highlighted" />
      <MainMenu.DefaultItems.SearchMenu />
      <MainMenu.DefaultItems.Help />
      <MainMenu.DefaultItems.ClearCanvas />

      <MainMenu.Group title="Workspace">
        <MainMenu.Item icon={PlusIcon} onSelect={handleNewProject}>
          New Project
        </MainMenu.Item>
        <MainMenu.Item icon={save} onSelect={handleSaveProject}>
          Save Project
        </MainMenu.Item>
        <MainMenu.Item
          icon={LoadIcon}
          onSelect={() => setIsWorkspaceModalOpen(true)}
        >
          Open Project
        </MainMenu.Item>
      </MainMenu.Group>

      {isWorkspaceModalOpen && (
        <Dialog
          title="Open Project"
          onCloseRequest={() => setIsWorkspaceModalOpen(false)}
          size="regular"
        >
          <div style={{ display: "flex", height: "60vh", gap: "1rem" }}>
            <div
              style={{
                flex: 1,
                borderRight: "1px solid var(--color-border-outline, #e0e0e0)",
                paddingRight: "1rem",
              }}
            >
              <h3>Clients</h3>
              <ClientList />
            </div>
            <div style={{ flex: 2, paddingLeft: "1rem" }}>
              <h3>Drawings</h3>
              {currentClientId ? (
                <DrawingList />
              ) : (
                <p>Select a client to view their drawings.</p>
              )}
            </div>
          </div>
        </Dialog>
      )}
      <MainMenu.Separator />

      {isDevEnv() && (
        <MainMenu.Item
          icon={eyeIcon}
          onSelect={() => {
            if (window.visualDebug) {
              delete window.visualDebug;
              saveDebugState({ enabled: false });
            } else {
              window.visualDebug = { data: [] };
              saveDebugState({ enabled: true });
            }
            props?.refresh();
          }}
        >
          Visual Debug
        </MainMenu.Item>
      )}
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Preferences />
      <MainMenu.DefaultItems.ToggleTheme
        allowSystemTheme
        theme={props.theme}
        onSelect={props.setTheme}
      />
      <MainMenu.ItemCustom>
        <LanguageList style={{ width: "100%" }} />
      </MainMenu.ItemCustom>
      <MainMenu.DefaultItems.ChangeCanvasBackground />
      <MainMenu.Separator />
      <MainMenu.Item
        onSelect={async () => {
          await logoutUser();
        }}
      >
        Sign out
      </MainMenu.Item>
    </MainMenu>
  );
});
