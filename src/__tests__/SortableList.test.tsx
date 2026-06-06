import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SortableList } from "../SortableList";
import {
  useSortable,
  useDragContext,
  type SortableChange,
  type DragStartInfo,
  type DragEndInfo,
} from "../useSortable";
import { moveBetween } from "../reorder";

function Harness({
  onChange,
  isDisabled,
  onDragStart,
  onDragEnd,
  useHandle,
}: {
  onChange?: (c: SortableChange<string>) => void;
  isDisabled?: (item: string, index: number) => boolean;
  onDragStart?: (info: DragStartInfo) => void;
  onDragEnd?: (info: DragEndInfo) => void;
  useHandle?: boolean;
}) {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry"]);
  return (
    <SortableList
      items={items}
      getKey={(item) => item}
      isDisabled={isDisabled}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      useHandle={useHandle}
      renderItem={(item, { handleProps }) =>
        useHandle ? (
          <span>
            <button {...handleProps}>::</button>
            {item}
          </span>
        ) : (
          <span>{item}</span>
        )
      }
      onReorder={(change) => {
        setItems(change.items);
        onChange?.(change);
      }}
    />
  );
}

function rendered(): string[] {
  return screen.getAllByRole("listitem").map((el) => el.textContent ?? "");
}

describe("<SortableList /> rendering", () => {
  it("renders all items in order", () => {
    render(<Harness />);
    expect(rendered()).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("marks each item draggable", () => {
    render(<Harness />);
    for (const li of screen.getAllByRole("listitem")) {
      expect(li).toHaveAttribute("draggable", "true");
    }
  });

  it("exposes a list role on the container", () => {
    render(<Harness />);
    expect(screen.getByRole("list")).toBeInTheDocument();
  });
});

describe("<SortableList /> drag interaction", () => {
  it("reorders the rendered items when dragging index 0 to index 2", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.dragEnter(lis[2]);
    fireEvent.dragOver(lis[2]);
    fireEvent.drop(lis[2]);
    fireEvent.dragEnd(lis[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ from: 0, to: 2 });
    expect(rendered()).toEqual(["Banana", "Cherry", "Apple"]);
  });

  it("does nothing when dropped on itself", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const lis = screen.getAllByRole("listitem");

    fireEvent.dragStart(lis[1]);
    fireEvent.drop(lis[1]);
    fireEvent.dragEnd(lis[1]);

    expect(onChange).not.toHaveBeenCalled();
    expect(rendered()).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("sets aria-grabbed on the item being dragged", () => {
    render(<Harness />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    expect(lis[0]).toHaveAttribute("aria-grabbed", "true");
    fireEvent.dragEnd(lis[0]);
    expect(lis[0]).toHaveAttribute("aria-grabbed", "false");
  });
});

describe("<SortableList /> lifecycle callbacks", () => {
  it("fires onDragStart with the source index", () => {
    const onDragStart = vi.fn();
    render(<Harness onDragStart={onDragStart} />);
    fireEvent.dragStart(screen.getAllByRole("listitem")[1]);
    expect(onDragStart).toHaveBeenCalledWith(
      expect.objectContaining({ index: 1 }),
    );
  });

  it("fires onDragEnd with dropped:true after a drop", () => {
    const onDragEnd = vi.fn();
    render(<Harness onDragEnd={onDragEnd} />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.drop(lis[2]);
    expect(onDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, dropped: true }),
    );
  });

  it("fires onDragEnd with dropped:false when the drag is cancelled", () => {
    const onDragEnd = vi.fn();
    render(<Harness onDragEnd={onDragEnd} />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.dragEnd(lis[0]);
    expect(onDragEnd).toHaveBeenCalledWith(
      expect.objectContaining({ index: 0, dropped: false }),
    );
  });
});

describe("<SortableList /> disabled items", () => {
  const disableBanana = (item: string) => item === "Banana";

  it("marks disabled items as non-draggable", () => {
    render(<Harness isDisabled={disableBanana} />);
    const lis = screen.getAllByRole("listitem");
    expect(lis[1]).toHaveAttribute("draggable", "false");
    expect(lis[1]).toHaveAttribute("aria-disabled", "true");
  });

  it("does not start a drag from a disabled item", () => {
    const onDragStart = vi.fn();
    render(<Harness isDisabled={disableBanana} onDragStart={onDragStart} />);
    fireEvent.dragStart(screen.getAllByRole("listitem")[1]);
    expect(onDragStart).not.toHaveBeenCalled();
  });

  it("does not drop onto a disabled target", () => {
    const onChange = vi.fn();
    render(<Harness isDisabled={disableBanana} onChange={onChange} />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.drop(lis[1]); // Banana is disabled
    expect(onChange).not.toHaveBeenCalled();
    expect(rendered()).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("gives disabled items tabIndex -1", () => {
    render(<Harness isDisabled={disableBanana} />);
    expect(screen.getAllByRole("listitem")[1]).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });
});

describe("<SortableList /> drag handle", () => {
  it("makes the item non-draggable and the handle draggable", () => {
    render(<Harness useHandle />);
    const lis = screen.getAllByRole("listitem");
    expect(lis[0]).toHaveAttribute("draggable", "false");
    const handle = within(lis[0]).getByRole("button");
    expect(handle).toHaveAttribute("draggable", "true");
    expect(handle).toHaveAttribute("aria-label", "Drag to reorder");
  });

  it("reorders when dragging via the handle", () => {
    const onChange = vi.fn();
    render(<Harness useHandle onChange={onChange} />);
    const lis = screen.getAllByRole("listitem");
    const handle = within(lis[0]).getByRole("button");
    fireEvent.dragStart(handle);
    fireEvent.drop(lis[2]);
    expect(rendered()).toEqual(["::Banana", "::Cherry", "::Apple"]);
  });
});

describe("<SortableList /> drop placeholder", () => {
  it("renders a placeholder element while hovering a target", () => {
    render(<Harness />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.dragEnter(lis[2]);
    expect(
      document.querySelector("[data-sortable-placeholder]"),
    ).not.toBeNull();
  });

  it("removes the placeholder after the drop completes", () => {
    render(<Harness />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.dragStart(lis[0]);
    fireEvent.dragEnter(lis[2]);
    fireEvent.drop(lis[2]);
    expect(document.querySelector("[data-sortable-placeholder]")).toBeNull();
  });
});

describe("<SortableList /> keyboard reorder", () => {
  it("moves an item down with Ctrl+ArrowDown", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("listitem")[0], {
      key: "ArrowDown",
      ctrlKey: true,
    });
    expect(rendered()).toEqual(["Banana", "Apple", "Cherry"]);
  });

  it("moves an item up with Meta+ArrowUp", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("listitem")[2], {
      key: "ArrowUp",
      metaKey: true,
    });
    expect(rendered()).toEqual(["Apple", "Cherry", "Banana"]);
  });

  it("ignores arrow keys without a modifier", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("listitem")[0], { key: "ArrowDown" });
    expect(rendered()).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("does not move past the first item", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getAllByRole("listitem")[0], {
      key: "ArrowUp",
      ctrlKey: true,
    });
    expect(rendered()).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("skips a disabled neighbour when reordering with the keyboard", () => {
    render(<Harness isDisabled={(item) => item === "Banana"} />);
    // Apple moves down, jumping past the disabled Banana to Cherry's slot.
    fireEvent.keyDown(screen.getAllByRole("listitem")[0], {
      key: "ArrowDown",
      ctrlKey: true,
    });
    expect(rendered()).toEqual(["Banana", "Cherry", "Apple"]);
  });
});

describe("<SortableList /> multi-list move", () => {
  function MultiHarness() {
    const ctx = useDragContext();
    const [left, setLeft] = useState(["A", "B"]);
    const [right, setRight] = useState(["X"]);

    const onDropped = (
      from: string,
      to: string,
      drop: { fromIndex: number; toIndex: number },
    ) => {
      const src = from === "left" ? left : right;
      const dst = to === "left" ? left : right;
      const res = moveBetween(src, dst, drop.fromIndex, drop.toIndex);
      if (from === "left") setLeft(res.source);
      else setRight(res.source);
      if (to === "left") setLeft(res.destination);
      else setRight(res.destination);
    };

    return (
      <div>
        <div data-testid="left">
          <SortableList
            items={left}
            listId="left"
            context={ctx}
            getKey={(i) => i}
            renderItem={(i) => <span>{i}</span>}
            onReorder={(c) => setLeft(c.items)}
            onItemDropped={(d) =>
              onDropped(d.fromListId, d.toListId, d)
            }
          />
        </div>
        <div data-testid="right">
          <SortableList
            items={right}
            listId="right"
            context={ctx}
            getKey={(i) => i}
            renderItem={(i) => <span>{i}</span>}
            onReorder={(c) => setRight(c.items)}
            onItemDropped={(d) =>
              onDropped(d.fromListId, d.toListId, d)
            }
          />
        </div>
      </div>
    );
  }

  it("moves an item from the left list to the right list", () => {
    render(<MultiHarness />);
    const leftItems = within(screen.getByTestId("left")).getAllByRole(
      "listitem",
    );
    const rightItems = within(screen.getByTestId("right")).getAllByRole(
      "listitem",
    );

    fireEvent.dragStart(leftItems[0]); // "A" from left
    fireEvent.dragEnter(rightItems[0]);
    fireEvent.drop(rightItems[0]);

    const leftAfter = within(screen.getByTestId("left"))
      .getAllByRole("listitem")
      .map((e) => e.textContent);
    const rightAfter = within(screen.getByTestId("right"))
      .getAllByRole("listitem")
      .map((e) => e.textContent);

    expect(leftAfter).toEqual(["B"]);
    expect(rightAfter).toEqual(["A", "X"]);
  });
});

describe("useSortable", () => {
  it("exposes an imperative move() that triggers onReorder", () => {
    const onReorder = vi.fn();
    function Probe() {
      const s = useSortable({ items: ["x", "y", "z"], onReorder });
      return (
        <button onClick={() => s.move(0, 2)} aria-label="move">
          move
        </button>
      );
    }
    render(<Probe />);
    fireEvent.click(within(document.body).getByLabelText("move"));
    expect(onReorder).toHaveBeenCalledWith({
      items: ["y", "z", "x"],
      from: 0,
      to: 2,
    });
  });

  it("reports isDragging state", () => {
    function Probe() {
      const s = useSortable({ items: ["x", "y"], onReorder: () => {} });
      return (
        <ul>
          <li {...s.getItemProps(0)}>x</li>
          <li data-testid="status">{String(s.isDragging)}</li>
        </ul>
      );
    }
    render(<Probe />);
    expect(screen.getByTestId("status")).toHaveTextContent("false");
    fireEvent.dragStart(screen.getByText("x"));
    expect(screen.getByTestId("status")).toHaveTextContent("true");
  });

  it("does not move via move() when from === to", () => {
    const onReorder = vi.fn();
    function Probe() {
      const s = useSortable({ items: ["x", "y"], onReorder });
      return <button onClick={() => s.move(1, 1)}>noop</button>;
    }
    render(<Probe />);
    fireEvent.click(screen.getByText("noop"));
    expect(onReorder).not.toHaveBeenCalled();
  });
});
