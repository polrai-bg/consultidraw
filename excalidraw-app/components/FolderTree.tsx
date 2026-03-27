import React, { useState, useRef } from "react";

import type { Drawing, Folder } from "../data/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DragState {
  type: "drawing" | "folder";
  id: string;
}

interface FolderTreeProps {
  drawings: Drawing[];
  folders: Folder[];
  currentDrawingId: string | null;
  isLoading: boolean;
  onSelectDrawing: (id: string) => void;
  onCreateDrawing: (name: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onRenameDrawing: (id: string, name: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteDrawing: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string, name: string) => Promise<void>;
  onMoveDrawing: (drawingId: string, targetFolderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Shared styles
// ---------------------------------------------------------------------------

const ROW_BASE: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  borderRadius: "5px",
  fontSize: "0.82rem",
  cursor: "pointer",
  userSelect: "none",
  gap: "2px",
};

const ICON_BTN: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  padding: "0.15rem 0.3rem",
  fontSize: "0.72rem",
  opacity: 0,
  borderRadius: "3px",
  flexShrink: 0,
  lineHeight: 1,
};

// ---------------------------------------------------------------------------
// Inline create input (shared for folders and drawings)
// ---------------------------------------------------------------------------

const InlineCreate: React.FC<{
  placeholder: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  depth: number;
}> = ({ placeholder, onSubmit, onCancel, depth }) => {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && value.trim()) {
      onSubmit(value.trim());
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.25rem",
        paddingLeft: `${depth * 16 + 20}px`,
        paddingRight: "4px",
        paddingTop: "2px",
        paddingBottom: "2px",
      }}
    >
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => onCancel()}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: "0.25rem 0.4rem",
          fontSize: "0.8rem",
          border: "1px solid #6965db",
          borderRadius: "4px",
          outline: "none",
          background: "var(--color-surface-high, #fff)",
          color: "var(--color-on-surface, #333)",
          minWidth: 0,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Drawing row
// ---------------------------------------------------------------------------

const DrawingRow: React.FC<{
  drawing: Drawing;
  depth: number;
  isActive: boolean;
  isLoading: boolean;
  dragOver: boolean;
  onSelect: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragLeave: () => void;
}> = ({
  drawing,
  depth,
  isActive,
  isLoading,
  dragOver,
  onSelect,
  onRename,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragLeave,
}) => {
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(drawing.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    if (editVal.trim() && editVal.trim() !== drawing.name) {
      onRename(editVal.trim());
    }
    setEditing(false);
  };

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart();
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDragOver(e);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave();
      }}
      onClick={!editing ? onSelect : undefined}
      style={{
        ...ROW_BASE,
        paddingLeft: `${depth * 16 + 6}px`,
        paddingRight: "4px",
        paddingTop: "4px",
        paddingBottom: "4px",
        background: isActive
          ? "var(--color-primary-light, #e8e7fc)"
          : dragOver
          ? "var(--color-surface-lowest, #e8e7fc55)"
          : "transparent",
        borderLeft: isActive ? "3px solid #6965db" : "3px solid transparent",
        opacity: isLoading && isActive ? 0.6 : 1,
      }}
      className="folder-tree-row"
    >
      {/* indent spacer + file icon */}
      <span style={{ fontSize: "0.75rem", flexShrink: 0, marginRight: "2px" }}>
        📄
      </span>

      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          value={editVal}
          onChange={(e) => setEditVal(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setEditing(false);
          }}
          onClick={(e) => e.stopPropagation()}
          style={{
            flex: 1,
            padding: "0.1rem 0.3rem",
            fontSize: "0.82rem",
            border: "1px solid #6965db",
            borderRadius: "3px",
            background: "var(--color-surface-high, #fff)",
            color: "var(--color-on-surface, #333)",
            minWidth: 0,
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: "var(--color-on-surface, #333)",
          }}
        >
          {drawing.name}
        </span>
      )}

      <button
        className="row-action"
        title="Rename"
        style={{ ...ICON_BTN, color: "var(--color-on-surface, #555)" }}
        onClick={(e) => {
          e.stopPropagation();
          setEditVal(drawing.name);
          setEditing(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
      >
        ✎
      </button>
      <button
        className="row-action"
        title="Delete"
        style={{ ...ICON_BTN, color: "#e53e3e" }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        ✕
      </button>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Folder row (recursive)
// ---------------------------------------------------------------------------

const FolderNode: React.FC<{
  folder: Folder;
  allFolders: Folder[];
  allDrawings: Drawing[];
  depth: number;
  currentDrawingId: string | null;
  isLoading: boolean;
  dragState: DragState | null;
  dragOverId: string | null;
  onSelectDrawing: (id: string) => void;
  onRenameDrawing: (id: string, name: string) => Promise<void>;
  onDeleteDrawing: (id: string, name: string) => Promise<void>;
  onRenameFolder: (id: string, name: string) => Promise<void>;
  onDeleteFolder: (id: string, name: string) => Promise<void>;
  onCreateDrawing: (name: string, folderId: string | null) => Promise<void>;
  onCreateFolder: (name: string, parentId: string | null) => Promise<void>;
  onMoveDrawing: (drawingId: string, targetFolderId: string | null) => Promise<void>;
  onMoveFolder: (folderId: string, targetParentId: string | null) => Promise<void>;
  onDragStart: (state: DragState) => void;
  onDragOver: (id: string) => void;
  onDragLeave: () => void;
  onDrop: (targetFolderId: string | null) => void;
}> = ({
  folder,
  allFolders,
  allDrawings,
  depth,
  currentDrawingId,
  isLoading,
  dragState,
  dragOverId,
  onSelectDrawing,
  onRenameDrawing,
  onDeleteDrawing,
  onRenameFolder,
  onDeleteFolder,
  onCreateDrawing,
  onCreateFolder,
  onMoveDrawing,
  onMoveFolder,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}) => {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(folder.name);
  const [creatingType, setCreatingType] = useState<"drawing" | "folder" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const childFolders = allFolders.filter((f) => f.parentId === folder.id);
  const childDrawings = allDrawings.filter((d) => d.folderId === folder.id);
  const hasChildren = childFolders.length > 0 || childDrawings.length > 0;

  const commitRename = () => {
    if (editVal.trim() && editVal.trim() !== folder.name) {
      onRenameFolder(folder.id, editVal.trim());
    }
    setEditing(false);
  };

  const isDragOver = dragOverId === folder.id;

  return (
    <div>
      {/* Folder header row */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          onDragStart({ type: "folder", id: folder.id });
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          // Don't allow dropping a folder into itself or its descendant
          if (dragState?.type === "folder" && dragState.id === folder.id) return;
          onDragOver(folder.id);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(folder.id);
        }}
        onDragLeave={(e) => {
          e.stopPropagation();
          onDragLeave();
        }}
        style={{
          ...ROW_BASE,
          paddingLeft: `${depth * 16 + 4}px`,
          paddingRight: "4px",
          paddingTop: "4px",
          paddingBottom: "4px",
          background: isDragOver
            ? "var(--color-primary-light, #e8e7fc)"
            : "transparent",
          border: isDragOver ? "1px dashed #6965db" : "1px solid transparent",
          borderRadius: "5px",
        }}
        className="folder-tree-row"
      >
        {/* Expand toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0 3px",
            fontSize: "0.65rem",
            color: "var(--color-on-surface, #666)",
            flexShrink: 0,
            width: "14px",
            textAlign: "center",
          }}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : " "}
        </button>

        <span style={{ fontSize: "0.8rem", flexShrink: 0, marginRight: "3px" }}>
          {expanded ? "📂" : "📁"}
        </span>

        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            value={editVal}
            onChange={(e) => setEditVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              flex: 1,
              padding: "0.1rem 0.3rem",
              fontSize: "0.82rem",
              border: "1px solid #6965db",
              borderRadius: "3px",
              background: "var(--color-surface-high, #fff)",
              color: "var(--color-on-surface, #333)",
              minWidth: 0,
            }}
          />
        ) : (
          <span
            style={{
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "var(--color-on-surface, #333)",
              fontWeight: 500,
            }}
            onClick={() => setExpanded((v) => !v)}
          >
            {folder.name}
          </span>
        )}

        {/* Add drawing in folder */}
        <button
          className="row-action"
          title="New drawing here"
          style={{ ...ICON_BTN, fontSize: "0.7rem", color: "#6965db" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
            setCreatingType("drawing");
          }}
        >
          📄+
        </button>
        {/* Add sub-folder */}
        <button
          className="row-action"
          title="New folder here"
          style={{ ...ICON_BTN, fontSize: "0.7rem", color: "#6965db" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
            setCreatingType("folder");
          }}
        >
          📁+
        </button>
        <button
          className="row-action"
          title="Rename folder"
          style={{ ...ICON_BTN, color: "var(--color-on-surface, #555)" }}
          onClick={(e) => {
            e.stopPropagation();
            setEditVal(folder.name);
            setEditing(true);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
        >
          ✎
        </button>
        <button
          className="row-action"
          title="Delete folder"
          style={{ ...ICON_BTN, color: "#e53e3e" }}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteFolder(folder.id, folder.name);
          }}
        >
          ✕
        </button>
      </div>

      {/* Children */}
      {expanded && (
        <div>
          {childFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              allFolders={allFolders}
              allDrawings={allDrawings}
              depth={depth + 1}
              currentDrawingId={currentDrawingId}
              isLoading={isLoading}
              dragState={dragState}
              dragOverId={dragOverId}
              onSelectDrawing={onSelectDrawing}
              onRenameDrawing={onRenameDrawing}
              onDeleteDrawing={onDeleteDrawing}
              onRenameFolder={onRenameFolder}
              onDeleteFolder={onDeleteFolder}
              onCreateDrawing={onCreateDrawing}
              onCreateFolder={onCreateFolder}
              onMoveDrawing={onMoveDrawing}
              onMoveFolder={onMoveFolder}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
          {childDrawings.map((drawing) => (
            <DrawingRow
              key={drawing.id}
              drawing={drawing}
              depth={depth + 1}
              isActive={drawing.id === currentDrawingId}
              isLoading={isLoading}
              dragOver={dragOverId === drawing.id}
              onSelect={() => onSelectDrawing(drawing.id)}
              onRename={(name) => onRenameDrawing(drawing.id, name)}
              onDelete={() => onDeleteDrawing(drawing.id, drawing.name)}
              onDragStart={() => onDragStart({ type: "drawing", id: drawing.id })}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOver(drawing.id);
              }}
              onDrop={() => {
                // Drop onto a drawing → move to that drawing's parent folder
                onDrop(drawing.folderId ?? null);
              }}
              onDragLeave={onDragLeave}
            />
          ))}

          {/* Inline create form */}
          {creatingType === "drawing" && (
            <InlineCreate
              placeholder="Drawing name…"
              depth={depth + 1}
              onSubmit={async (name) => {
                setCreatingType(null);
                await onCreateDrawing(name, folder.id);
              }}
              onCancel={() => setCreatingType(null)}
            />
          )}
          {creatingType === "folder" && (
            <InlineCreate
              placeholder="Folder name…"
              depth={depth + 1}
              onSubmit={async (name) => {
                setCreatingType(null);
                await onCreateFolder(name, folder.id);
              }}
              onCancel={() => setCreatingType(null)}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Public: FolderTree
// ---------------------------------------------------------------------------

export const FolderTree: React.FC<FolderTreeProps> = ({
  drawings,
  folders,
  currentDrawingId,
  isLoading,
  onSelectDrawing,
  onCreateDrawing,
  onCreateFolder,
  onRenameDrawing,
  onRenameFolder,
  onDeleteDrawing,
  onDeleteFolder,
  onMoveDrawing,
  onMoveFolder,
}) => {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [creatingAtRoot, setCreatingAtRoot] = useState<"drawing" | "folder" | null>(null);

  const rootFolders = folders.filter((f) => f.parentId === null);
  const rootDrawings = drawings.filter((d) => d.folderId === null);

  const handleDrop = async (targetFolderId: string | null) => {
    if (!dragState) return;
    setDragOverId(null);

    if (dragState.type === "drawing") {
      const drawing = drawings.find((d) => d.id === dragState.id);
      if (drawing && drawing.folderId !== targetFolderId) {
        await onMoveDrawing(dragState.id, targetFolderId);
      }
    } else {
      const folder = folders.find((f) => f.id === dragState.id);
      if (
        folder &&
        folder.parentId !== targetFolderId &&
        // Prevent dropping a folder into itself
        dragState.id !== targetFolderId
      ) {
        await onMoveFolder(dragState.id, targetFolderId);
      }
    }

    setDragState(null);
  };

  return (
    <>
      <style>{`
        .folder-tree-row:hover .row-action {
          opacity: 0.6 !important;
        }
        .folder-tree-row .row-action:hover {
          opacity: 1 !important;
          background: var(--color-surface-lowest, #eee);
        }
      `}</style>

      {/* Root level drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOverId("__root__");
        }}
        onDrop={(e) => {
          e.preventDefault();
          handleDrop(null);
        }}
        onDragLeave={() => setDragOverId(null)}
        style={{
          minHeight: "4px",
          borderRadius: "4px",
          background: dragOverId === "__root__" ? "#e8e7fc55" : "transparent",
          border: dragOverId === "__root__" ? "1px dashed #6965db" : "1px solid transparent",
          marginBottom: "2px",
        }}
      />

      {/* Root folders */}
      {rootFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          allFolders={folders}
          allDrawings={drawings}
          depth={0}
          currentDrawingId={currentDrawingId}
          isLoading={isLoading}
          dragState={dragState}
          dragOverId={dragOverId}
          onSelectDrawing={onSelectDrawing}
          onRenameDrawing={onRenameDrawing}
          onDeleteDrawing={onDeleteDrawing}
          onRenameFolder={onRenameFolder}
          onDeleteFolder={onDeleteFolder}
          onCreateDrawing={onCreateDrawing}
          onCreateFolder={onCreateFolder}
          onMoveDrawing={onMoveDrawing}
          onMoveFolder={onMoveFolder}
          onDragStart={setDragState}
          onDragOver={setDragOverId}
          onDragLeave={() => setDragOverId(null)}
          onDrop={handleDrop}
        />
      ))}

      {/* Root drawings */}
      {rootDrawings.map((drawing) => (
        <DrawingRow
          key={drawing.id}
          drawing={drawing}
          depth={0}
          isActive={drawing.id === currentDrawingId}
          isLoading={isLoading}
          dragOver={dragOverId === drawing.id}
          onSelect={() => onSelectDrawing(drawing.id)}
          onRename={(name) => onRenameDrawing(drawing.id, name)}
          onDelete={() => onDeleteDrawing(drawing.id, drawing.name)}
          onDragStart={() => setDragState({ type: "drawing", id: drawing.id })}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverId(drawing.id);
          }}
          onDrop={() => handleDrop(null)}
          onDragLeave={() => setDragOverId(null)}
        />
      ))}

      {/* Inline create at root */}
      {creatingAtRoot === "drawing" && (
        <InlineCreate
          placeholder="Drawing name…"
          depth={0}
          onSubmit={async (name) => {
            setCreatingAtRoot(null);
            await onCreateDrawing(name, null);
          }}
          onCancel={() => setCreatingAtRoot(null)}
        />
      )}
      {creatingAtRoot === "folder" && (
        <InlineCreate
          placeholder="Folder name…"
          depth={0}
          onSubmit={async (name) => {
            setCreatingAtRoot(null);
            await onCreateFolder(name, null);
          }}
          onCancel={() => setCreatingAtRoot(null)}
        />
      )}

      {/* Root-level add buttons */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginTop: "6px",
          paddingTop: "6px",
          borderTop: "1px solid var(--color-border-outline, #eee)",
        }}
      >
        <button
          onClick={() => setCreatingAtRoot("drawing")}
          title="New drawing"
          style={{
            flex: 1,
            padding: "0.3rem 0.4rem",
            fontSize: "0.75rem",
            background: "var(--color-surface-high, #f5f5f5)",
            border: "1px solid var(--color-border-outline, #ddd)",
            borderRadius: "4px",
            cursor: "pointer",
            color: "var(--color-on-surface, #555)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
          }}
        >
          📄 New drawing
        </button>
        <button
          onClick={() => setCreatingAtRoot("folder")}
          title="New folder"
          style={{
            flex: 1,
            padding: "0.3rem 0.4rem",
            fontSize: "0.75rem",
            background: "var(--color-surface-high, #f5f5f5)",
            border: "1px solid var(--color-border-outline, #ddd)",
            borderRadius: "4px",
            cursor: "pointer",
            color: "var(--color-on-surface, #555)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "3px",
          }}
        >
          📁 New folder
        </button>
      </div>
    </>
  );
};
