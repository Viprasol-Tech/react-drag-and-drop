import type { ReactNode } from "react";
import {
  useSortable,
  type SortableChange,
  type DragStartInfo,
  type DragEndInfo,
  type DragContext,
  type CrossListDrop,
  type DragHandleProps,
} from "./useSortable";

/** Render-prop helpers passed to a custom item renderer. */
export interface RenderItemHelpers {
  /** Index of the item being rendered. */
  index: number;
  /** Whether this item is currently being dragged. */
  isDragging: boolean;
  /** Whether this item is disabled (non-draggable). */
  isDisabled: boolean;
  /** Whether the drop placeholder is currently shown before this item. */
  isOver: boolean;
  /** Props to spread onto a dedicated drag handle element. */
  handleProps: DragHandleProps;
}

export interface SortableListProps<T> {
  /** The ordered list of items to render. */
  items: T[];
  /** Stable key for an item (defaults to its index). */
  getKey?: (item: T, index: number) => string | number;
  /** Render the content of a single item. */
  renderItem: (item: T, helpers: RenderItemHelpers) => ReactNode;
  /** Called with the reordered list whenever a drag (or keyboard move) ends. */
  onReorder: (change: SortableChange<T>) => void;
  /** Marks an item as non-draggable and non-droppable. */
  isDisabled?: (item: T, index: number) => boolean;
  /** Fired when a drag begins. */
  onDragStart?: (info: DragStartInfo) => void;
  /** Fired when a drag ends, whether or not the order changed. */
  onDragEnd?: (info: DragEndInfo) => void;
  /**
   * When true, only a dedicated handle (rendered via `helpers.handleProps`)
   * initiates a drag; the item body itself is not draggable.
   */
  useHandle?: boolean;
  /** Stable id for this list, required for cross-list moves. */
  listId?: string;
  /** Shared cross-list drag context (see `useDragContext`). */
  context?: DragContext;
  /** Called when an item is dropped onto this list from another list. */
  onItemDropped?: (drop: CrossListDrop) => void;
  /** Render a custom drop placeholder; defaults to a thin divider element. */
  renderPlaceholder?: () => ReactNode;
  /** Optional class for the wrapping list element. */
  className?: string;
  /** Optional class applied to each item element. */
  itemClassName?: string;
  /** Optional class applied to the item currently being dragged. */
  draggingClassName?: string;
  /** Optional class applied to the current drop-target item. */
  overClassName?: string;
  /** Optional class applied to disabled items. */
  disabledClassName?: string;
  /** Optional class applied to the placeholder element. */
  placeholderClassName?: string;
  /** Tag used for the container element. Defaults to "ul". */
  as?: "ul" | "ol" | "div";
  /** Tag used for each item element. Defaults to "li". */
  itemAs?: "li" | "div";
}

function cx(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/**
 * A ready-to-use sortable list. Items can be reordered by dragging with the
 * mouse (optionally via a dedicated handle), or with the keyboard via
 * Ctrl/Cmd + Arrow Up/Down on a focused item. Supports disabled items, a drop
 * placeholder, lifecycle callbacks, and moving items between lists that share a
 * `useDragContext`.
 */
export function SortableList<T>(props: SortableListProps<T>): JSX.Element {
  const {
    items,
    getKey,
    renderItem,
    onReorder,
    isDisabled,
    onDragStart,
    onDragEnd,
    useHandle = false,
    listId,
    context,
    onItemDropped,
    renderPlaceholder,
    className,
    itemClassName,
    draggingClassName,
    overClassName,
    disabledClassName,
    placeholderClassName,
    as: Container = "ul",
    itemAs: Item = "li",
  } = props;

  const {
    getItemProps,
    getHandleProps,
    draggingIndex,
    overIndex,
    placeholderIndex,
  } = useSortable<T>({
    items,
    onReorder,
    isDisabled,
    onDragStart,
    onDragEnd,
    listId,
    context,
    onItemDropped,
  });

  const placeholder = (
    <Item
      key="__sortable_placeholder__"
      aria-hidden="true"
      data-sortable-placeholder=""
      className={placeholderClassName}
    >
      {renderPlaceholder ? renderPlaceholder() : null}
    </Item>
  );

  return (
    <Container className={className} role="list" data-sortable-root="">
      {items.map((item, index) => {
        const key = getKey ? getKey(item, index) : index;
        const disabled = isDisabled ? isDisabled(item, index) : false;
        const itemProps = getItemProps(index);
        const overrides = useHandle ? { draggable: false } : {};
        const isOver = placeholderIndex === index && draggingIndex !== index;
        return (
          <Fragmentish key={key}>
            {isOver ? placeholder : null}
            <Item
              role="listitem"
              tabIndex={disabled ? -1 : 0}
              className={cx(
                itemClassName,
                draggingIndex === index && draggingClassName,
                overIndex === index && overClassName,
                disabled && disabledClassName,
              )}
              {...itemProps}
              {...overrides}
            >
              {renderItem(item, {
                index,
                isDragging: draggingIndex === index,
                isDisabled: disabled,
                isOver,
                handleProps: getHandleProps(index),
              })}
            </Item>
          </Fragmentish>
        );
      })}
    </Container>
  );
}

/**
 * Tiny keyed-fragment wrapper. React fragments cannot take the `key` we need on
 * the placeholder+item pair, so we use this thin passthrough instead.
 */
function Fragmentish(props: { children: ReactNode }): JSX.Element {
  return <>{props.children}</>;
}
