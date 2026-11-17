# LittleHampton-on-Sea village foundation

CaravanWeb remains the first playable implementation. The village uses a deliberately compressed, fictional Caister-inspired layout, with the existing park at the northern coastal edge. The previously chosen fictional names LittleHampton-on-Sea, Natwinch Road, HamptonVilla and QuickStop are retained.

The design draws on Caister's north–south main-road spine, eastward beach lanes, low-rise cottages and shops, church-side narrowing, playing field, heritage remains and independent lifeboat quarter. It rearranges geography for play, rather than reproducing real addresses or claiming a geographic scale.

| Caister reference | Fictional game treatment |
| --- | --- |
| Ormesby Road into High Street / Yarmouth Road | Natwinch Road, High Street and South Road |
| Western bypass | Coast bypass, with a roadworks test |
| Church / cemetery narrowing | Alternating single-lane Church Lane signals |
| Beach Road and fishing village | Beach Road, Fisher Lane and beach quarter |
| Playing field and pavilion | Kingfisher Green |
| Roman fort remains | Old fort meadow |
| Northern coastal holiday parks | Current saved park inset, named HamptonVilla on the village map |
| Later secure parking / shuttle idea | Reserved West field; purchases and timetables deferred |

## Working behavior

`village.html` opens from “Village map” in the park view. It supports pointer pan, wheel zoom, keyboard navigation, zoom / fit buttons, location inspection, a responsive places drawer, source information and world-layout export. The park inset reads the same browser-local saved game without changing it or advancing the park clock. It includes the current terrain, pitches, caravans, buildings and expansion field boundaries.

The traffic study routes journeys over the authored graph. Through traffic prefers the faster bypass; closing the bypass reroutes new journeys through the village. Park guest traffic in the current-park scenario depends on the saved pitch / booking counts. Holiday changeover is an explicit stress scenario. Vehicles leave following gaps, use left-side lane offsets, wait at alternating signals and do not enter the single-lane section while opposing traffic remains inside. Queues and completed-journey delay are measured from the running model. Bypass closures show a map marker; pause and restart controls are available.

These are game-model parameters, not observed or forecast Caister traffic. The study does not yet apply charges, booking delays or reputation penalties to the park economy. Secure parking, resident complaints, shuttle / road-train purchases and timetables remain future gameplay. Traffic and detailed village building interiors are not a completed Godot implementation.

## Shared layout and Godot direction

`data/village-world.json` version 1 contains bounds, named places, a road graph, authored building footprints / roof styles, the 60 × 40 / 16px park-grid mapping and source references. The browser renderer and traffic core read this data. This separates the world layout from the SVG presentation, providing a starting point for the agreed later Godot 4.4 adapter. Godot TileMapLayer terrain, collision bodies, bottom-centre anchors and resource conversion still require implementation and headless Godot validation. Some scenery, gardens and the shore remain procedural browser artwork.

Sources consulted on 17 November 2026:

- [Caister heritage trail](https://www.visitgreatyarmouth.co.uk/downloads/dmsimgs/Heritage_Trail_Jan14-_from_VGY-GYTABIA_1501167605.pdf)
- [Great Yarmouth Design Code, section 5.6](https://www.great-yarmouth.gov.uk/media/7214/Borough-Wide-Design-Code-Supplementary-Planning-Document-SPD/pdf/Borough-wide_Design_Code_Final_Draft_SPD_1o1kn37ceytfm.pdf?m=1715273367117)
- [Caister Parish Council newsletter: traffic concerns](https://caisterparishcouncil.gov.uk/wp-content/uploads/2025/03/CaisterNewsletter-No24-1.pdf)

Validation includes connected routes, bypass rerouting, finite vehicle positions, following gaps, single-lane exclusion, pause, bounded traffic and park-save isolation. An identical 400-second changeover simulation produces greater completed-journey delay and fewer completed journeys with bypass works than with the bypass open. Browser checks are recorded with the private preview evidence.

Browser validation on 17 November 2026: place inspection; keyboard pan, zoom and fit; changeover / bypass-works selection; a paused five-minute study showing 85 vehicles, 45 waiting and 53 seconds mean completed delay; return to the saved park; and pointer selection in a 390 × 844 iframe without outer horizontal overflow. The responsive check is not a physical-device touch test.
