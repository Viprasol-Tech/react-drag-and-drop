# Changelog

Format based on [Keep a Changelog](https://keepachangelog.com/); versioning
follows [SemVer](https://semver.org/).

## [0.2.0] - 2025

### Added
- **Drag handles** — `useHandle` prop plus `getHandleProps`/`helpers.handleProps`
  so only a dedicated handle initiates a drag.
- **Multi-list moves** — `useDragContext` plus `listId`, `context`, and
  `onItemDropped` for moving items between independent lists, backed by the new
  pure `moveBetween` helper.
- **Drop placeholder** — an explicit gap element rendered at the drop target,
  customizable via `renderPlaceholder` and `placeholderClassName`. New
  `placeholderIndex` exposed from `useSortable`.
- **Disabled items** — `isDisabled` predicate marks items as non-draggable and
  non-droppable, sets `aria-disabled`/`tabIndex=-1`, and is skipped by keyboard
  reordering.
- **Lifecycle callbacks** — `onDragStart` and `onDragEnd` with structured
  `DragStartInfo` / `DragEndInfo` payloads (including a `dropped` flag).
- `isDragging` convenience flag and richer `RenderItemHelpers` passed to
  `renderItem`.

### Changed
- `renderItem` now receives `(item, helpers)` where `helpers` carries
  `index`, `isDragging`, `isDisabled`, `isOver`, and `handleProps`.
- Keyboard reordering now jumps over disabled neighbours.

### Fixed
- Disabled items can no longer be used as drop targets.

## [0.1.0] - 2025

### Added
- Initial release of react-drag-and-drop: Lightweight drag-and-drop list reordering for React.
