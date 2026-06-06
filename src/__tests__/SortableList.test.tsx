import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { SortableList } from "../SortableList";
import { useSortable, type SortableChange } from "../useSortable";

function Harness({ onChange }: { onChange?: (c: SortableChange<string>) => void }) {
  const [items, setItems] = useState(["Apple", "Banana", "Cherry"]);
  return (
    <SortableList
      items={items}
      getKey={(item) => item}
      renderItem={(item) => <span>{item}</span>}
      onReorder={(change) => {
        setItems(change.items);
        onChange?.(change);
      }}
    />
  );
}

function rendered(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((el) => el.textContent ?? "");
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
});

describe("<SortableList /> drag interaction", () => {
  it("reorders the rendered items when dragging index 0 to index 2", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    let lis = screen.getAllByRole("listitem");
    const source = lis[0]; // Apple
    const target = lis[2]; // Cherry

    // Simulate the HTML5 drag sequence.
    fireEvent.dragStart(source);
    fireEvent.dragEnter(target);
    fireEvent.dragOver(target);
    fireEvent.drop(target);
    fireEvent.dragEnd(source);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toMatchObject({ from: 0, to: 2 });

    // The DOM now reflects the new order: Apple moved to the end.
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
});

describe("<SortableList /> keyboard reorder", () => {
  it("moves an item down with Ctrl+ArrowDown", () => {
    render(<Harness />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.keyDown(lis[0], { key: "ArrowDown", ctrlKey: true });
    expect(rendered()).toEqual(["Banana", "Apple", "Cherry"]);
  });

  it("moves an item up with Meta+ArrowUp", () => {
    render(<Harness />);
    const lis = screen.getAllByRole("listitem");
    fireEvent.keyDown(lis[2], { key: "ArrowUp", metaKey: true });
    expect(rendered()).toEqual(["Apple", "Cherry", "Banana"]);
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
});
