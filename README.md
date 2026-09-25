<p align="center">
  <img src=".github/banner.svg" alt="Pin UI — static designs, turned into components" width="100%">
</p>

<p align="center">
  <a href="https://pinui.xyz"><b>pinui.xyz</b></a>
  &nbsp;·&nbsp;
  <a href="https://in.pinterest.com/rachitrampage23/pin-ui/">Pinterest board</a>
  &nbsp;·&nbsp;
  <a href="https://x.com/RachitThakur146">@RachitThakur146</a>
</p>

# Pin UI

Interface designs from Pinterest, rebuilt as real React components — animated,
interactive, and ready to paste into your project. Three new ones every week.

## Components

| Component | Description | Slug |
| :-- | :-- | :-- |
| **Chips** | 3D chips that press into the surface. Light and dark. | `chips` |
| **Egg OTP** | A one-time-code field whose eggs crack on a wrong code. Light and dark. | `otp-input` |
| **Add Member** | A people picker with search, gooey toggles and a flying stack. Light and dark. | `add-member` |
| **Count down** | A session in blocks, counting down in real time. | `session-list` |
| **Balance Card** | A counting balance with a liquid currency selector. | `balance-card` |
| **Add To Cart** | A product card that opens into a drag-to-confirm checkout. | `cart-card` |

Preview every one live at [pinui.xyz](https://pinui.xyz).

## Install

Each component is served as a shadcn registry item — no package to add:

```bash
npx shadcn@latest add "https://pinui.xyz/r/<slug>.json"
```

This writes the component and its stylesheet to `components/pinui/`. The only
dependency is [Motion](https://motion.dev).

## Development

```bash
npm install
npm run dev      # http://localhost:3100
npm run build
```

Requires Node 20.9+. Built with Next.js 16, React 19, TypeScript and Motion.

Optional environment variables: `NEXT_PUBLIC_SITE_URL`, and `SUPABASE_URL` with
`SUPABASE_PUBLISHABLE_KEY` for the waitlist and updates signups. Without them the
site runs as normal and skips the signup writes.

## License

The components are MIT licensed — use them freely, including commercially. The
Pin UI name, logo and demo media are not included. See the
[terms](https://pinui.xyz/terms).

<p align="center">
  <sub>Built by <a href="https://github.com/Rachit315">Rachit</a> · <a href="https://pinui.xyz">pinui.xyz</a></sub>
</p>
