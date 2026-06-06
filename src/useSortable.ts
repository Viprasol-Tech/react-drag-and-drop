import { useCallback, useRef, useState } from "react";
import { reorder } from "./reorder";

/** A change event emitted whenever the list order changes. */
export interface SortableChange<T> {
  /** The newly ordered list. */
  items: T[];
  /** Index the item was dragged from. */
  from: number;
  /** Index the item was dropped at. */
  to: number;
}

export interface UseSortableOptions<T> {
  /** The current ordered list of items. */
  items: T[];
  /** Called with the reordered list whenever a drag completes. */
  onReorder: (change: SortableChange<T>) => void;
}

/** Props to spread onto each draggable item element. */
export interface SortableItemProps {
  draggable: true;
  "data-sortable-index": number;
  "aria-grabbed": boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export interface UseSortableResult<T> {
  /** Index currently being dragged, or `null` when idle. */
  draggingIndex: number | null;
  /** Index currently hovered as a drop target, or `null`. */
  overIndex: number | null;
  /** Returns the event handlers/attributes for the item at `index`. */
  getItemProps: (index: number) => SortableItemProps;
  /** Imperatively move an item (used by keyboard handlers and tests). */
  move: (from: number, to: number) => void;
  /** The items passed in, exposed for convenience. */
  items: T[];
}

/**
 * Headless hook that wires HTML5 drag-and-drop events to list reordering.
 *
 * The hook owns only transient drag state (which index is being dragged and
 * which is hovered); the list itself stays controlled by the caller via
 * `items` / `onReorder`.
 */
export function useSortable<T>(
  options: UseSortableOptions<T>,
): UseSortableResult<T> {
  const { items, onReorder } = options;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = reorder(items, from, to);
      onReorder({ items: next, from, to });
    },
    [items, onReorder],
  );

  const getItemProps = useCallback(
    (index: number): SortableItemProps => ({
      draggable: true,
      "data-sortable-index": index,
      "aria-grabbed": draggingIndex === index,
      onDragStart: (e: React.DragEvent) => {
        dragFrom.current = index;
        setDraggingIndex(index);
        // Required for Firefox to initiate a drag.
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = "move";
          try {
            e.dataTransfer.setData("text/plain", String(index));
          } catch {
            // jsdom and some browsers restrict setData; safe to ignore.
          }
        }
      },
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      },
      onDragEnter: (e: React.DragEvent) => {
        e.preventDefault();
        setOverIndex(index);
      },
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        const from = dragFrom.current;
        if (from !== null && from !== index) {
          move(from, index);
        }
        dragFrom.current = null;
        setDraggingIndex(null);
        setOverIndex(null);
      },
      onDragEnd: () => {
        dragFrom.current = null;
        setDraggingIndex(null);
        setOverIndex(null);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        // Keyboard reordering: Ctrl/Meta + Arrow moves the focused item.
        if (!(e.ctrlKey || e.metaKey)) return;
        if (e.key === "ArrowUp" && index > 0) {
          e.preventDefault();
          move(index, index - 1);
        } else if (e.key === "ArrowDown" && index < items.length - 1) {
          e.preventDefault();
          move(index, index + 1);
        }
      },
    }),
    [draggingIndex, items.length, move],
  );

  return { draggingIndex, overIndex, getItemProps, move, items };
}
