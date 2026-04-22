import React, { useState, useCallback, useEffect } from "react";

import { useExcalidrawAPI } from "@excalidraw/excalidraw";

import {
  restoreElements,
  restoreAppState,
} from "@excalidraw/excalidraw/data/restore";

import { CaptureUpdateAction } from "@excalidraw/excalidraw";

import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";

import { useAtom } from "../app-jotai";

import {
  getDrawings,
  createDrawing,
  deleteDrawing,
  updateDrawingMeta,
  moveDrawing,
  loadScene,
  saveScene,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  moveFolder,
} from "../data/firebase";
import {
  clientsAtom,
  currentClientIdAtom,
  currentDrawingIdAtom,
  drawingsAtom,
  foldersAtom,
  isSavingAtom,
  isLoadingAtom,
  isSidebarPinnedAtom,
} from "../store/drawingState";

import { FolderTree } from "./FolderTree";

export const DrawingList: React.FC<{
  onDrawingSelected?: () => void;
  showPinButton?: boolean;
}> = ({ onDrawingSelected, showPinButton = true }) => {
  const excalidrawAPI = useExcalidrawAPI();
  const [clients] = useAtom(clientsAtom);
  const [currentClientId, setCurrentClientId] = useAtom(currentClientIdAtom);
  const [currentDrawingId, setCurrentDrawingId] = useAtom(currentDrawingIdAtom);
  const [drawings, setDrawings] = useAtom(drawingsAtom);
  const [folders, setFolders] = useAtom(foldersAtom);
  const [isSaving] = useAtom(isSavingAtom);
  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [isSidebarPinned, setIsSidebarPinned] = useAtom(isSidebarPinnedAtom);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleTogglePin = useCallback(() => {
    const next = !isSidebarPinned;
    setIsSidebarPinned(next);
    localStorage.setItem("consulti-sidebar-pinned", String(next));
  }, [isSidebarPinned, setIsSidebarPinned]);

  const currentClient = clients.find((c) => c.id === currentClientId);

  // ---------------------------------------------------------------------------
  // Data refresh
  // ---------------------------------------------------------------------------

  const refreshAll = useCallback(async () => {
    if (!currentClientId) {
      return;
    }
    const [drawingsResult, foldersResult] = await Promise.allSettled([
      getDrawings(currentClientId),
      getFolders(currentClientId),
    ]);
    if (drawingsResult.status === "fulfilled") {
      setDrawings(drawingsResult.value);
    } else {
      console.error("Error loading drawings:", drawingsResult.reason);
    }
    if (foldersResult.status === "fulfilled") {
      setFolders(foldersResult.value);
    } else {
      console.error("Error loading folders:", foldersResult.reason);
    }
  }, [currentClientId, setDrawings, setFolders]);

  // Load on mount if client is already set (e.g. after returning to sidebar)
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // ---------------------------------------------------------------------------
  // Save helper
  // ---------------------------------------------------------------------------

  const saveCurrentDrawing = useCallback(
    async (api: ExcalidrawImperativeAPI) => {
      if (!currentClientId || !currentDrawingId) {
        return;
      }
      try {
        await saveScene(
          currentClientId,
          currentDrawingId,
          api.getSceneElements(),
          api.getAppState(),
          api.getFiles(),
        );
      } catch (error) {
        console.error("Error saving current drawing:", error);
      }
    },
    [currentClientId, currentDrawingId],
  );

  // ---------------------------------------------------------------------------
  // Select / load a drawing
  // ---------------------------------------------------------------------------

  const handleSelectDrawing = async (drawingId: string) => {
    // Prevent re-entering while already loading or selecting the same drawing
    if (
      !currentClientId ||
      !excalidrawAPI ||
      drawingId === currentDrawingId ||
      isLoading
    ) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      // Save current drawing first (with a tight timeout so it never blocks the load)
      if (currentDrawingId) {
        await Promise.race([
          saveCurrentDrawing(excalidrawAPI),
          new Promise<void>((_, reject) =>
            setTimeout(() => reject(new Error("Save timed out")), 8_000),
          ),
        ]).catch((err) => {
          // Non-fatal: log and continue to load the new drawing
          console.warn("Could not save current drawing before switching:", err);
        });
      }

      // Load the selected drawing with a 20-second timeout
      const scene = await Promise.race([
        loadScene(currentClientId, drawingId),
        new Promise<never>((_, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  "Loading timed out. Check your network or Firebase configuration.",
                ),
              ),
            20_000,
          ),
        ),
      ]);

      setCurrentDrawingId(drawingId);
      onDrawingSelected?.();

      if (scene) {
        const elements = restoreElements(scene.elements, null, {
          repairBindings: true,
        });
        const appState = restoreAppState(scene.appState, null);

        excalidrawAPI.updateScene({
          elements,
          appState: {
            ...appState,
            name:
              drawings.find((d) => d.id === drawingId)?.name || appState.name,
          },
          captureUpdate: CaptureUpdateAction.IMMEDIATELY,
        });

        if (scene.files && Object.keys(scene.files).length) {
          excalidrawAPI.addFiles(Object.values(scene.files));
        }
      } else {
        // New empty drawing
        excalidrawAPI.resetScene();
        const drawing = drawings.find((d) => d.id === drawingId);
        if (drawing) {
          excalidrawAPI.updateScene({
            appState: { name: drawing.name },
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load drawing.";
      console.error("Error loading drawing:", error);
      setLoadError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Create drawing
  // ---------------------------------------------------------------------------

  const handleCreateDrawing = useCallback(
    async (name: string, folderId: string | null) => {
      if (!currentClientId) {
        return;
      }
      try {
        if (excalidrawAPI && currentDrawingId) {
          await saveCurrentDrawing(excalidrawAPI);
        }

        const drawing = await createDrawing(currentClientId, name, folderId);
        setCurrentDrawingId(drawing.id);

        if (excalidrawAPI) {
          excalidrawAPI.resetScene();
          excalidrawAPI.updateScene({
            appState: { name: drawing.name },
            captureUpdate: CaptureUpdateAction.NEVER,
          });
        }

        await refreshAll();
      } catch (error) {
        console.error("Error creating drawing:", error);
      }
    },
    [
      currentClientId,
      currentDrawingId,
      excalidrawAPI,
      saveCurrentDrawing,
      setCurrentDrawingId,
      refreshAll,
    ],
  );

  // ---------------------------------------------------------------------------
  // Rename drawing
  // ---------------------------------------------------------------------------

  const handleRenameDrawing = useCallback(
    async (drawingId: string, name: string) => {
      if (!currentClientId) {
        return;
      }
      try {
        await updateDrawingMeta(currentClientId, drawingId, name);
        await refreshAll();
      } catch (error) {
        console.error("Error renaming drawing:", error);
      }
    },
    [currentClientId, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Delete drawing
  // ---------------------------------------------------------------------------

  const handleDeleteDrawing = useCallback(
    async (drawingId: string, name: string) => {
      if (!currentClientId) {
        return;
      }
      if (!window.confirm(`Delete drawing "${name}"?`)) {
        return;
      }
      try {
        await deleteDrawing(currentClientId, drawingId);
        if (currentDrawingId === drawingId) {
          setCurrentDrawingId(null);
          if (excalidrawAPI) {
            excalidrawAPI.resetScene();
          }
        }
        await refreshAll();
      } catch (error) {
        console.error("Error deleting drawing:", error);
      }
    },
    [
      currentClientId,
      currentDrawingId,
      excalidrawAPI,
      setCurrentDrawingId,
      refreshAll,
    ],
  );

  // ---------------------------------------------------------------------------
  // Move drawing
  // ---------------------------------------------------------------------------

  const handleMoveDrawing = useCallback(
    async (drawingId: string, targetFolderId: string | null) => {
      if (!currentClientId) {
        return;
      }
      try {
        await moveDrawing(currentClientId, drawingId, targetFolderId);
        await refreshAll();
      } catch (error) {
        console.error("Error moving drawing:", error);
      }
    },
    [currentClientId, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Create folder
  // ---------------------------------------------------------------------------

  const handleCreateFolder = useCallback(
    async (name: string, parentId: string | null) => {
      if (!currentClientId) {
        return;
      }
      try {
        await createFolder(currentClientId, name, parentId);
        await refreshAll();
      } catch (error) {
        console.error("Error creating folder:", error);
      }
    },
    [currentClientId, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Rename folder
  // ---------------------------------------------------------------------------

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string) => {
      if (!currentClientId) {
        return;
      }
      try {
        await updateFolder(currentClientId, folderId, name);
        await refreshAll();
      } catch (error) {
        console.error("Error renaming folder:", error);
      }
    },
    [currentClientId, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Delete folder
  // ---------------------------------------------------------------------------

  const handleDeleteFolder = useCallback(
    async (folderId: string, name: string) => {
      if (!currentClientId) {
        return;
      }
      if (
        !window.confirm(
          `Delete folder "${name}"? Its contents will be moved to the parent folder.`,
        )
      ) {
        return;
      }
      try {
        const folder = folders.find((f) => f.id === folderId);
        await deleteFolder(currentClientId, folderId, folder?.parentId ?? null);
        await refreshAll();
      } catch (error) {
        console.error("Error deleting folder:", error);
      }
    },
    [currentClientId, folders, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Move folder
  // ---------------------------------------------------------------------------

  const handleMoveFolder = useCallback(
    async (folderId: string, targetParentId: string | null) => {
      if (!currentClientId) {
        return;
      }
      try {
        await moveFolder(currentClientId, folderId, targetParentId);
        await refreshAll();
      } catch (error) {
        console.error("Error moving folder:", error);
      }
    },
    [currentClientId, refreshAll],
  );

  // ---------------------------------------------------------------------------
  // Back
  // ---------------------------------------------------------------------------

  const handleBack = () => {
    setCurrentClientId(null);
    setCurrentDrawingId(null);
    setDrawings([]);
    setFolders([]);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      style={{
        padding: "0.5rem",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.5rem",
          flexShrink: 0,
        }}
      >
        <button
          onClick={handleBack}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1rem",
            padding: "0.2rem",
            color: "var(--color-on-surface, #333)",
          }}
          title="Back to clients"
        >
          ←
        </button>
        <div
          style={{
            fontWeight: 600,
            fontSize: "0.9rem",
            color: "var(--color-on-surface, #333)",
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentClient?.name || "Drawings"}
        </div>
        {(isSaving || isLoading) && (
          <span
            style={{
              fontSize: "0.7rem",
              color: "#6965db",
              flexShrink: 0,
            }}
          >
            {isLoading ? "Loading…" : "Saving…"}
          </span>
        )}
        {showPinButton && (
          <button
            onClick={handleTogglePin}
            title={isSidebarPinned ? "Unpin panel" : "Pin panel open"}
            style={{
              background: isSidebarPinned
                ? "var(--color-primary-light, #e8e7fc)"
                : "none",
              border: "none",
              cursor: "pointer",
              padding: "0.2rem 0.3rem",
              fontSize: "0.8rem",
              borderRadius: "4px",
              color: isSidebarPinned
                ? "#6965db"
                : "var(--color-on-surface, #999)",
              flexShrink: 0,
              lineHeight: 1,
            }}
          >
            📌
          </button>
        )}
      </div>

      {/* Error banner */}
      {loadError && (
        <div
          style={{
            padding: "0.4rem 0.5rem",
            marginBottom: "0.5rem",
            background: "#fff5f5",
            border: "1px solid #feb2b2",
            borderRadius: "4px",
            fontSize: "0.75rem",
            color: "#c53030",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <span>{loadError}</span>
          <button
            onClick={() => setLoadError(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "0.8rem",
              color: "#c53030",
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Tree */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {drawings.length === 0 && folders.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "var(--color-on-surface, #999)",
              fontSize: "0.8rem",
              padding: "1.5rem 0",
            }}
          >
            No drawings yet.
            <br />
            Use the buttons below to get started.
          </div>
        ) : null}

        <FolderTree
          drawings={drawings}
          folders={folders}
          currentDrawingId={currentDrawingId}
          isLoading={isLoading}
          onSelectDrawing={handleSelectDrawing}
          onCreateDrawing={handleCreateDrawing}
          onCreateFolder={handleCreateFolder}
          onRenameDrawing={handleRenameDrawing}
          onRenameFolder={handleRenameFolder}
          onDeleteDrawing={handleDeleteDrawing}
          onDeleteFolder={handleDeleteFolder}
          onMoveDrawing={handleMoveDrawing}
          onMoveFolder={handleMoveFolder}
        />
      </div>
    </div>
  );
};
