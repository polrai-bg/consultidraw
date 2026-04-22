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

import {
  saveScene,
  createDrawing,
  getOrCreateUncategorizedClient,
  getDrawings,
  getFolders,
} from "../data/firebase";
import {
  currentClientIdAtom,
  currentDrawingIdAtom,
  drawingsAtom,
  foldersAtom,
  isSavingAtom,
} from "../store/drawingState";
import { useAtom } from "../app-jotai";

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
  const [currentClientId, setCurrentClientId] = useAtom(currentClientIdAtom);
  const [currentDrawingId, setCurrentDrawingId] = useAtom(currentDrawingIdAtom);
  const [, setDrawings] = useAtom(drawingsAtom);
  const [, setFolders] = useAtom(foldersAtom);
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

  const createUncategorizedProject = useCallback(
    async (promptName = true) => {
      const name = promptName
        ? window.prompt(
            "Enter project name:",
            `Untitled ${new Date().toLocaleString()}`,
          )
        : `Untitled ${new Date().toLocaleString()}`;
      if (!name) {
        return;
      }

      if (excalidrawAPI && currentClientId && currentDrawingId) {
        try {
          await saveScene(
            currentClientId,
            currentDrawingId,
            excalidrawAPI.getSceneElements(),
            excalidrawAPI.getAppState(),
            excalidrawAPI.getFiles(),
          );
        } catch (error) {
          console.warn(
            "Could not save current drawing before switching:",
            error,
          );
        }
      }

      try {
        const client = await getOrCreateUncategorizedClient();
        const drawing = await createDrawing(client.id, name, null);
        setCurrentClientId(client.id);
        setCurrentDrawingId(drawing.id);
        const [drawingsResult, foldersResult] = await Promise.allSettled([
          getDrawings(client.id),
          getFolders(client.id),
        ]);
        if (drawingsResult.status === "fulfilled") {
          setDrawings(drawingsResult.value);
        }
        if (foldersResult.status === "fulfilled") {
          setFolders(foldersResult.value);
        }
        if (excalidrawAPI) {
          excalidrawAPI.resetScene();
          excalidrawAPI.updateScene({
            appState: { name: drawing.name },
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        }
      } catch (error) {
        console.error("Error creating project:", error);
        window.alert("Error creating project");
      }
    },
    [
      excalidrawAPI,
      currentClientId,
      currentDrawingId,
      setCurrentClientId,
      setCurrentDrawingId,
      setDrawings,
      setFolders,
    ],
  );

  return (
    <>
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
          <MainMenu.Item
            icon={PlusIcon}
            onSelect={() => createUncategorizedProject(true)}
          >
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

      {isWorkspaceModalOpen && (
        <Dialog
          title="Open Project"
          onCloseRequest={() => setIsWorkspaceModalOpen(false)}
          size="regular"
          closeOnClickOutside={false}
        >
          <div style={{ display: "flex", height: "60vh", gap: "1rem" }}>
            <div
              style={{
                flex: 1,
                borderRight: "1px solid var(--color-border-outline, #e0e0e0)",
                paddingRight: "1rem",
                overflowY: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem" }}>Clients</h3>
              <button
                onClick={async () => {
                  setIsWorkspaceModalOpen(false);
                  await createUncategorizedProject(false);
                }}
                style={{
                  width: "100%",
                  marginBottom: "0.75rem",
                  padding: "0.5rem",
                  fontSize: "0.8rem",
                  background: "#6965db",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                + Start blank project (Uncategorized)
              </button>
              <ClientList showPinButton={false} />
            </div>
            <div
              style={{
                flex: 2,
                paddingLeft: "1rem",
                overflowY: "auto",
              }}
            >
              <h3 style={{ margin: "0 0 0.5rem" }}>Drawings</h3>
              {currentClientId ? (
                <DrawingList
                  showPinButton={false}
                  onDrawingSelected={() => setIsWorkspaceModalOpen(false)}
                />
              ) : (
                <p style={{ color: "var(--color-on-surface, #999)" }}>
                  Select a client to view their drawings, or start a blank
                  project.
                </p>
              )}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
});
