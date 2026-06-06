import type { ReactNode } from "react";
import { useSortable, type SortableChange } from "./useSortable";

export interface SortableListProps<T> {
  /** The ordered list of items to render. */
  items: T[];
  /** Stable key for an item (defaults to its index). */
  getKey?: (item: T, index: number) => string | number;
  /** Render the content of a single item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Called with the reordered list whenever a drag (or keyboard move) ends. */
  onReorder: (change: SortableChange<T>) => void;
  /** Optional class for the wrapping list element. */
  className?: string;
  /** Optional class applied to each item element. */
  itemClassName?: string;
  /** Optional class applied to the item currently being dragged. */
  draggingClassName?: string;
  /** Optional class applied to the current drop-target item. */
  overClassName?: string;
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
 * mouse, or with the keyboard via Ctrl/Cmd + Arrow Up/Down on a focused item.
 */
export function SortableList<T>(props: SortableListProps<T>): JSX.Element {
  const {
    items,
    getKey,
    renderItem,
    onReorder,
    className,
    itemClassName,
    draggingClassName,
    overClassName,
    as: Container = "ul",
    itemAs: Item = "li",
  } = props;

  const { getItemProps, draggingIndex, overIndex } = useSortable<T>({
    items,
    onReorder,
  });

  return (
    <Container className={className} role="list" data-sortable-root="">
      {items.map((item, index) => {
        const key = getKey ? getKey(item, index) : index;
        return (
          <Item
            key={key}
            role="listitem"
            tabIndex={0}
            className={cx(
              itemClassName,
              draggingIndex === index && draggingClassName,
              overIndex === index && overClassName,
            )}
            {...getItemProps(index)}
          >
            {renderItem(item, index)}
          </Item>
        );
      })}
    </Container>
  );
}
