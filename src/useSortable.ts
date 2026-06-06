import { useCallback, useMemo, useRef, useState } from "react";
import { reorder } from "./reorder";

/** A change event emitted whenever a single list reorders within itself. */
export interface SortableChange<T> {
  /** The newly ordered list. */
  items: T[];
  /** Index the item was dragged from. */
  from: number;
  /** Index the item was dropped at. */
  to: number;
}

/** Information about a drag that is starting. */
export interface DragStartInfo {
  /** Index of the item that began the drag. */
  index: number;
  /** Identifier of the list the drag started in (multi-list only). */
  listId?: string;
}

/**
 * Information about a drag that has ended, regardless of whether it resulted in
 * a reorder. `dropped` is true when the drag finished over a valid target.
 */
export interface DragEndInfo {
  /** Index the drag started from. */
  index: number;
  /** Identifier of the source list (multi-list only). */
  listId?: string;
  /** Whether the item was dropped on a valid target. */
  dropped: boolean;
}

export interface UseSortableOptions<T> {
  /** The current ordered list of items. */
  items: T[];
  /** Called with the reordered list whenever a drag (or keyboard move) completes. */
  onReorder: (change: SortableChange<T>) => void;
  /**
   * Optional predicate marking an item as non-draggable and non-droppable.
   * Disabled items stay in place and are skipped by keyboard reordering.
   */
  isDisabled?: (item: T, index: number) => boolean;
  /** Fired when a drag begins on a draggable item. */
  onDragStart?: (info: DragStartInfo) => void;
  /** Fired when a drag ends, whether or not the order changed. */
  onDragEnd?: (info: DragEndInfo) => void;
  /**
   * Stable identifier for this list. Required to move items between lists via a
   * shared {@link useDragContext}; optional for single-list usage.
   */
  listId?: string;
  /**
   * Shared cross-list context from {@link useDragContext}. When provided,
   * dragging an item onto another list registered with the same context moves
   * it across lists instead of reordering in place.
   */
  context?: DragContext;
  /**
   * Called when an item is dropped onto this list from a different list. The
   * caller is responsible for applying the change to both lists' state.
   */
  onItemDropped?: (info: CrossListDrop) => void;
}

/** Payload for a cross-list drop, delivered to the destination list. */
export interface CrossListDrop {
  /** Identifier of the list the item came from. */
  fromListId: string;
  /** Identifier of the list receiving the item (this list). */
  toListId: string;
  /** Index of the item in the source list. */
  fromIndex: number;
  /** Index in this list the item should be inserted at. */
  toIndex: number;
}

/** Props to spread onto each draggable item element. */
export interface SortableItemProps {
  draggable: boolean;
  "data-sortable-index": number;
  "data-sortable-disabled"?: "" | undefined;
  "aria-grabbed": boolean;
  "aria-disabled"?: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragEnter: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * Props to spread onto a dedicated drag handle element. When a handle is used,
 * spread {@link SortableItemProps} with `draggable` overridden to `false` onto
 * the item and these props onto the handle so only the handle initiates drags.
 */
export interface DragHandleProps {
  draggable: true;
  "aria-label": string;
  role: "button";
  tabIndex: number;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export interface UseSortableResult<T> {
  /** Index currently being dragged within this list, or `null` when idle. */
  draggingIndex: number | null;
  /** Index currently hovered as a drop target, or `null`. */
  overIndex: number | null;
  /**
   * Index at which a placeholder/gap should be rendered while dragging, or
   * `null` when idle. Equals {@link overIndex} but is exposed separately so the
   * UI can render an explicit drop indicator.
   */
  placeholderIndex: number | null;
  /** Returns the event handlers/attributes for the item at `index`. */
  getItemProps: (index: number) => SortableItemProps;
  /**
   * Returns props for an optional dedicated drag handle for the item at
   * `index`. Pair with `getItemProps(index)` spread with `draggable: false`.
   */
  getHandleProps: (index: number) => DragHandleProps;
  /** Imperatively move an item (used by keyboard handlers and tests). */
  move: (from: number, to: number) => void;
  /** True while an item is being dragged within this list. */
  isDragging: boolean;
  /** The items passed in, exposed for convenience. */
  items: T[];
}

/** Internal shape of a drag currently tracked by a {@link DragContext}. */
interface ActiveDrag {
  listId: string;
  index: number;
}

/**
 * Shared state allowing several {@link useSortable} lists to coordinate
 * cross-list moves. Create one with {@link useDragContext} and pass it to each
 * participating list.
 */
export interface DragContext {
  /** Read the drag currently in flight, or `null` when idle. */
  get: () => ActiveDrag | null;
  /** Register the start of a drag. */
  begin: (drag: ActiveDrag) => void;
  /** Clear the active drag. */
  end: () => void;
}

/**
 * Creates a {@link DragContext} for moving items between multiple sortable
 * lists. The returned object is stable across renders.
 */
export function useDragContext(): DragContext {
  const ref = useRef<ActiveDrag | null>(null);
  return useMemo<DragContext>(
    () => ({
      get: () => ref.current,
      begin: (drag) => {
        ref.current = drag;
      },
      end: () => {
        ref.current = null;
      },
    }),
    [],
  );
}

/**
 * Headless hook that wires HTML5 drag-and-drop events to list reordering.
 *
 * The hook owns only transient drag state (which index is being dragged and
 * which is hovered); the list itself stays controlled by the caller via
 * `items` / `onReorder`. Supports drag handles, disabled items, drop
 * placeholders, lifecycle callbacks, keyboard reordering, and — via a shared
 * {@link DragContext} — moving items between lists.
 */
export function useSortable<T>(
  options: UseSortableOptions<T>,
): UseSortableResult<T> {
  const {
    items,
    onReorder,
    isDisabled,
    onDragStart,
    onDragEnd,
    listId,
    context,
    onItemDropped,
  } = options;

  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const dragFrom = useRef<number | null>(null);

  const disabledAt = useCallback(
    (index: number): boolean => {
      const item = items[index];
      return isDisabled ? isDisabled(item, index) : false;
    },
    [isDisabled, items],
  );

  const move = useCallback(
    (from: number, to: number) => {
      if (from === to) return;
      const next = reorder(items, from, to);
      onReorder({ items: next, from, to });
    },
    [items, onReorder],
  );

  const clearDrag = useCallback(() => {
    dragFrom.current = null;
    setDraggingIndex(null);
    setOverIndex(null);
  }, []);

  const beginDrag = useCallback(
    (index: number, e: React.DragEvent) => {
      dragFrom.current = index;
      setDraggingIndex(index);
      context?.begin({ listId: listId ?? "", index });
      onDragStart?.({ index, listId });
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData("text/plain", String(index));
        } catch {
          // jsdom and some browsers restrict setData; safe to ignore.
        }
      }
    },
    [context, listId, onDragStart],
  );

  const finishDragEnd = useCallback(
    (dropped: boolean) => {
      const index = dragFrom.current;
      if (index !== null) onDragEnd?.({ index, listId, dropped });
      context?.end();
      clearDrag();
    },
    [clearDrag, context, listId, onDragEnd],
  );

  /** Find the next non-disabled index in a direction, or null if none. */
  const nextEnabledIndex = useCallback(
    (start: number, step: 1 | -1): number | null => {
      for (let i = start + step; i >= 0 && i < items.length; i += step) {
        if (!disabledAt(i)) return i;
      }
      return null;
    },
    [disabledAt, items.length],
  );

  const handleDrop = useCallback(
    (index: number) => {
      // A cross-list drop takes priority when a foreign list is dragging.
      const active = context?.get();
      if (
        active &&
        listId !== undefined &&
        active.listId !== "" &&
        active.listId !== listId
      ) {
        onItemDropped?.({
          fromListId: active.listId,
          toListId: listId,
          fromIndex: active.index,
          toIndex: index,
        });
        context?.end();
        clearDrag();
        return true;
      }
      // Same-list reorder.
      const from = dragFrom.current;
      if (from !== null && from !== index && !disabledAt(index)) {
        move(from, index);
      }
      return false;
    },
    [clearDrag, context, disabledAt, listId, move, onItemDropped],
  );

  const getItemProps = useCallback(
    (index: number): SortableItemProps => {
      const disabled = disabledAt(index);
      return {
        draggable: !disabled,
        "data-sortable-index": index,
        "data-sortable-disabled": disabled ? "" : undefined,
        "aria-grabbed": draggingIndex === index,
        "aria-disabled": disabled || undefined,
        onDragStart: (e: React.DragEvent) => {
          if (disabled) {
            e.preventDefault();
            return;
          }
          beginDrag(index, e);
        },
        onDragOver: (e: React.DragEvent) => {
          if (disabled) return;
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
        },
        onDragEnter: (e: React.DragEvent) => {
          if (disabled) return;
          e.preventDefault();
          setOverIndex(index);
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          handleDrop(index);
          finishDragEnd(true);
        },
        onDragEnd: () => {
          finishDragEnd(false);
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          // Keyboard reordering: Ctrl/Meta + Arrow moves the focused item,
          // skipping over disabled neighbours.
          if (disabled) return;
          if (!(e.ctrlKey || e.metaKey)) return;
          if (e.key === "ArrowUp") {
            const to = nextEnabledIndex(index, -1);
            if (to !== null) {
              e.preventDefault();
              move(index, to);
            }
          } else if (e.key === "ArrowDown") {
            const to = nextEnabledIndex(index, 1);
            if (to !== null) {
              e.preventDefault();
              move(index, to);
            }
          }
        },
      };
    },
    [
      beginDrag,
      disabledAt,
      draggingIndex,
      finishDragEnd,
      handleDrop,
      move,
      nextEnabledIndex,
    ],
  );

  const getHandleProps = useCallback(
    (index: number): DragHandleProps => ({
      draggable: true,
      "aria-label": "Drag to reorder",
      role: "button",
      tabIndex: 0,
      onDragStart: (e: React.DragEvent) => {
        if (disabledAt(index)) {
          e.preventDefault();
          return;
        }
        beginDrag(index, e);
      },
      onDragEnd: () => {
        finishDragEnd(false);
      },
      onKeyDown: (e: React.KeyboardEvent) => {
        if (disabledAt(index)) return;
        if (!(e.ctrlKey || e.metaKey)) return;
        if (e.key === "ArrowUp") {
          const to = nextEnabledIndex(index, -1);
          if (to !== null) {
            e.preventDefault();
            move(index, to);
          }
        } else if (e.key === "ArrowDown") {
          const to = nextEnabledIndex(index, 1);
          if (to !== null) {
            e.preventDefault();
            move(index, to);
          }
        }
      },
    }),
    [beginDrag, disabledAt, finishDragEnd, move, nextEnabledIndex],
  );

  return {
    draggingIndex,
    overIndex,
    placeholderIndex: overIndex,
    getItemProps,
    getHandleProps,
    move,
    isDragging: draggingIndex !== null,
    items,
  };
}
