# Figma Mockups Guide

> Si të krijosh Figma mockups nga screenshots ekzistuese të OraProjekt

---

## Pse Figma?

Edhe pse kemi app-in real, Figma është i dobishëm për:
- 🎨 Eksperimentim me dizajn pa prekur kodin
- 👥 Marrja e feedback nga klientë/stakeholder
- 📱 Krijimi i store screenshots me madhësi specifike
- 🔄 Variantet (dark/light, mobile/desktop)
- 📐 Spec design për developer

---

## Setup i Parë (10 minuta)

### Hapi 1: Krijo Figma account
1. Shko te https://figma.com
2. Sign up (falas për 3 projekte)

### Hapi 2: Krijo file
1. New File → emër "OraProjekt Mockups"
2. Nga toolbar → Frame (F)
3. Zgjidh një preset:
   - **Desktop:** 1440 × 900 (Web)
   - **Mobile:** 390 × 844 (iPhone 14)
   - **Tablet:** 1024 × 768 (iPad)

---

## Metoda 1: Import Screenshots si Reference (5 minuta)

Më e shpejta — përdor screenshots ekzistuese si bazë.

### Hapi 1: Import
```
File → Place Image → zgjidh nga docs/screenshots/
```

Screenshots të gatshme:
| File | Përmbajtja | Rezolucioni |
|------|------------|-------------|
| `01-login.png` | Ekran i hyrjes | 1440×900 |
| `02-dashboard.png` | Paneli menaxher | 1440×900 |
| `03-projects.png` | Lista projekteve | 1440×900 |
| `04-employees.png` | Lista punëtorëve | 1440×900 |
| `05-timesheets.png` | Regjistrimet | 1440×900 |
| `06-reports.png` | Raportet me grafikë | 1440×900 |
| `07-mobile.png` | Pamja mobile | 390×844 |
| `08-dark-mode.png` | Mënyra e errët | 1440×900 |
| `09-tenant-domains.png` | Cilësimet | 1440×900 |

### Hapi 2: Anoto
- Shto comments për features të reja
- Vizato shigjeta për user flow
- Shëno me ngjyra zones për ndryshim

---

## Metoda 2: Përdor "html.to.design" Plugin (15 minuta)

Kthen website real në Figma layers të editueshëm.

### Hapi 1: Instalo plugin
1. Në Figma → Plugins → Browse
2. Kërko "html.to.design"
3. Install

### Hapi 2: Import faqe
1. Run plugin
2. Vendos URL: `https://oraprojekt.com`
3. Zgjidh viewport: Desktop ose Mobile
4. Click "Import"

### Hapi 3: Edit
Tani ke të gjitha layers si komponentë Figma — mund të:
- Ndryshosh ngjyra
- Shtosh/lëshosh elementë
- Krijosh variants
- Export si SVG/PNG

---

## Metoda 3: Krijo nga Zero me komponentë (1 orë)

### Color Palette
```
Primary:    #10b981 (emerald-500)
Primary Dark: #059669 (emerald-600)
Accent:     #f59e0b (amber-500)
Background: #ffffff (light) / #0a0a0a (dark)
Text:       #0a0a0a (light) / #fafafa (dark)
Muted:      #71717a (zinc-500)
Border:     #e4e4e7 (zinc-200)
```

### Typography
```
Font:       Geist Sans (system-ui fallback)
H1:         48px / Bold / -2% line height
H2:         32px / Semibold
H3:         24px / Semibold
Body:       16px / Regular / 150% line height
Small:      14px / Regular
Caption:    12px / Medium
```

### Spacing Scale (8px base)
```
4px  = 0.5 (gap-1)
8px  = 1   (gap-2)
12px = 1.5 (gap-3)
16px = 2   (gap-4)
24px = 3   (gap-6)
32px = 4   (gap-8)
48px = 6   (gap-12)
64px = 8   (gap-16)
```

### Komponentë për të krijuar

Krijo këta si **Components** në Figma:

1. **Button** — 3 variants (primary, outline, ghost) × 3 sizes
2. **Input** — text, password, email, date, number
3. **Card** — me header + content
4. **Badge** — 4 statuses (draft, submitted, approved, rejected)
5. **Avatar** — me initials
6. **Sidebar item** — me icon + label + active state
7. **Table row** — për projects/employees/timesheets
8. **Chart** — area chart + pie chart (use Figma charts plugin)
9. **Dialog/Modal** — me header + content + footer
10. **Toast** — success + error variants

---

## Store Screenshots Generation (20 minuta)

App Store + Play Store kanë madhësi specifike për screenshots.

### iOS App Store Screenshots

| Device | Rezolucioni | Sasia |
|--------|-------------|-------|
| iPhone 6.7" (15 Pro Max) | 1290 × 2796 | e domosdoshme |
| iPhone 6.5" (14 Plus) | 1242 × 2688 | e domosdoshme |
| iPad 12.9" (Pro) | 2048 × 2732 | opsionale |

### Android Play Store Screenshots
- Format: 16:9 ose 9:16
- Min: 320px
- Max: 3840px
- Sasia: 2-8

### Hapi 1: Krijo Frames në Figma

```
Krijo 6 frames për secilën device size:
1. Login screen
2. Dashboard
3. Projects list
4. Log time dialog
5. Reports
6. Settings
```

### Hapi 2: Shto Device Frame (opsionale)

Për pamje më profesionale:
1. Plugins → "Device Frames"
2. Zgjidh iPhone 15 Pro Max / Samsung Galaxy S24
3. Vendos screenshot brenda frame

### Hapi 3: Shto Marketing Text

Shto tekst mbi secilën screenshot:

```
[ Login ]     "Hyr në llogarinë tënde"
[ Dashboard ] "Shiko KPIs në kohë reale"
[ Projects ]  "Menaxho projekte me ekip"
[ Log Time ]  "Regjistro orët me një klik"
[ Reports ]   "Raporte me grafikë"
[ Settings ]  "Cilësime + Dark Mode"
```

### Hapi 4: Export

```
Selekto frame → Export → PNG → 2x
```

Emri: `store-screenshot-01-login-iphone15.png`, etj.

---

## User Flow Diagram (10 minuta)

Krijo diagram për user flow kryesor:

```
[Login] → [Dashboard] → [Projects] → [Log Time]
                ↓             ↓
          [Reports]    [Employees]
                ↓             ↓
          [Export CSV]  [Approve/Reject]
```

Në Figma:
1. Krijo frames për çdo screen
2. Përdor "Prototype" tab
3. Lidh me shigjeta (N for connector)
4. Shto interaksione (On Click → Navigate To)

---

## Design System Page (15 minuta)

Krijo një page "Design System" me:

### Colors
```
[Bashkë] 5 ngjyra primary + 5 neutral
```

### Typography
```
[H1] 48px Bold
[H2] 32px Semibold
[Body] 16px Regular
[Caption] 12px Medium
```

### Components
```
[Button Primary] [Button Outline] [Button Ghost]
[Input] [Select] [Checkbox] [Radio]
[Card] [Badge] [Avatar]
```

### Icons
```
Përdor Lucide icons (https://lucide.dev)
Import si SVG në Figma
```

---

## Collaborate me Ekipin

### Share File
1. Click "Share" (top-right)
2. Shto email e ekipit
3. Permission: "Can edit" (për designer) ose "Can view" (për stakeholder)

### Comments
1. Selekto element
2. Press `C` për comment
3. @mention për njoftim

### Version History
1. File → Version History
2. Save version para ndryshimeve të mëdha
3. Emër: "v1.0 — pre-release"

---

## Export për Development

### CSS Variables
```
Në Figma → Inspect panel → Code → CSS
Kopjo --color-primary: #10b981; etj.
```

### SVG Icons
```
Selekto icon → Export → SVG
Vendos në /public/icons/
```

### PNG Assets
```
Selekto → Export → PNG → 1x, 2x, 3x
```

---

## Templates & Resources

### Figma Templates (falas)
- **shadcn/ui Figma**: https://figma.com/community/file/1234
- **Tailwind UI Kit**: https://figma.com/@tailwindlabs
- **iOS App Store Screenshots**: https://figma.com/community/file/5678

### Plugins të rekomanduar
- **html.to.design** — import web pages
- **Device Frames** — shto phone/tablet mockups
- **Iconify** — 100k+ icons
- **Unsplash** — stock photos
- **Color Styles** — generate color palettes
- **Figma Charts** — krijimi i grafikëve

---

## Për Çfarë të Përdor Figma?

| Qëllimi | Përdor |
|---------|--------|
| Store screenshots | Figma (me device frames) |
| Design system | Figma Components |
| User flow | Figma Prototype |
| Feedback nga klientë | Figma Comments |
| Spec për dev | Figma Inspect |
| Eksperimentim | Figma variants |

**Mos e përdor për:**
- Krijim i kode (përdor Next.js direkt)
- Testing interaktiv (përdor app-in real)
- Version control (përdor Git)

---

## Koha e Prafunduar

| Task | Koha |
|------|------|
| Import screenshots si reference | 5 min |
| html.to.design import | 15 min |
| Krijim nga zero me komponentë | 1 orë |
| Store screenshots | 20 min |
| Design system page | 15 min |
| User flow diagram | 10 min |
| **Total (opsioni i shpejtë)** | **30 min** |
| **Total (komplet me design system)** | **2 orë** |
