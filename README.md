<p align="center">
  <img src="docs/assets/logo.png" width="120" alt="Viprasol Tech logo">
</p>

<h1 align="center">react-drag-and-drop</h1>

<p align="center">
  <strong>Lightweight, dependency-free drag-and-drop list reordering for React.</strong><br>
  A <code>useSortable</code> hook + <code>&lt;SortableList&gt;</code> with a real, tested reorder core.
</p>

<p align="center">
  <em>Built and maintained by <a href="https://viprasol.com">Viprasol Tech</a> — Fintech Experts. Full-Stack Builders.</em>
</p>

<p align="center">
  <a href="https://github.com/Viprasol-Tech/react-drag-and-drop/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/Viprasol-Tech/react-drag-and-drop/ci.yml?style=flat-square&logo=githubactions&logoColor=white&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Viprasol-Tech/react-drag-and-drop?style=flat-square&color=blue" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/TypeScript-strict-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript">
  <a href="https://t.me/viprasol_help"><img src="https://img.shields.io/badge/Telegram-support-26A5E4?style=flat-square&logo=telegram&logoColor=white" alt="Telegram"></a>
</p>

---

## ✨ Features

- 🪶 **Zero runtime dependencies** — native HTML5 drag-and-drop.
- 🧩 **Hook + component** — `useSortable` for full control, `<SortableList>` for drop-in.
- 🧮 **Real reorder core** — pure `reorder()` / `getDropIndex()` helpers, fully unit-tested.
- 🔒 **Strictly typed** — TypeScript `strict`, ships `.d.ts`.

## 📦 Install

```bash
npm install react-drag-and-drop
```

## 🚀 Usage

```tsx
import { SortableList } from "react-drag-and-drop";

export function Demo() {
  const [items, setItems] = useState(["Alpha", "Beta", "Gamma"]);
  return (
    <SortableList
      items={items}
      getKey={(it) => it}
      onReorder={setItems}
      renderItem={(it) => <div>{it}</div>}
    />
  );
}
```

Pure helper for your own UI:

```ts
import { reorder } from "react-drag-and-drop";
reorder(["a", "b", "c"], 0, 2); // ["b", "c", "a"]
```

## 🤝 Contributing

PRs welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) and our [Code of Conduct](CODE_OF_CONDUCT.md).

## Contact — Viprasol Tech Private Limited

- 🌐 Website: [viprasol.com](https://viprasol.com)
- ✉️ Email: [support@viprasol.com](mailto:support@viprasol.com)
- 💬 Telegram: [t.me/viprasol_help](https://t.me/viprasol_help) · 📱 WhatsApp: +91 96336 52112
- 🐙 GitHub: [@Viprasol-Tech](https://github.com/Viprasol-Tech) · 💼 [LinkedIn](https://www.linkedin.com/in/viprasol/) · 𝕏 [@viprasol](https://twitter.com/viprasol)

> *Viprasol Tech — fintech software, web & SaaS apps, algorithmic trading systems, and AI agents. Need a custom build? [Get in touch](mailto:support@viprasol.com).*

## License

[MIT](LICENSE) © 2025 Viprasol Tech Private Limited
