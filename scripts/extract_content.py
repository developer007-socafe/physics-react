#!/usr/bin/env python3
"""Port the static site's content into the React data model.

The static build in ~/Projects/physics-fundamentals is the source of truth for
prose and equations. This script parses it once and emits TypeScript, so the
React pages render the same words rather than a paraphrase of them.

Two conversions matter:

* Display equations move from ``$$ ... $$`` to ``\\[ ... \\]``. KaTeX is
  invoked explicitly here, so there is no delimiter auto-detection to get
  wrong.
* Inline ``$x$`` becomes ``\\(x\\)`` for the same reason.

Inline math is kept inside the paragraph text and marked with a sentinel so
the renderer can split on it. Using a sentinel rather than storing paragraphs
as HTML keeps the content free of markup, which is what lets the React side
avoid ``dangerouslySetInnerHTML`` entirely.
"""

from __future__ import annotations

import html
import json
import re
import sys
from pathlib import Path

SOURCE = Path("/home/faizal/Projects/physics-fundamentals")
TARGET = Path("/home/faizal/Projects/physics-react/src/content")

PAGES = [
    # slug, source file, title, tagline, icon, hue
    ("mechanics", "mechanics.html", "Classical Mechanics",
     "Motion, force, and the conservation laws that let you skip the hard part", "🔧", 28),
    ("thermodynamics", "thermodynamics.html", "Thermodynamics",
     "Heat, entropy, and why time only runs one way", "🌡️", 12),
    ("electromagnetism", "electromagnetism.html", "Electromagnetism",
     "Charges, fields, and the light that carries both", "⚡", 45),
    ("waves", "waves.html", "Waves & Oscillations",
     "Everything that repeats: sound, light, and the ocean", "🌊", 190),
    ("quantum", "quantum.html", "Quantum Mechanics",
     "Probability, uncertainty, and rules that will not bend", "⚛️", 268),
    ("relativity", "relativity.html", "Relativity",
     "Space and time as a single woven fabric", "🌌", 210),
    ("modern-physics", "modern-physics.html", "Modern Physics",
     "Atoms, nuclei, and the Standard Model", "🌠", 300),
    ("black-holes", "black-holes.html", "Black Holes & Gravitation",
     "Where gravity wins, and what it leaves behind", "⚫", 35),
    ("time-travel", "time-travel.html", "Time Travel & Causality",
     "Special relativity permits it. The universe mostly forbids it.", "⏳", 160),
]

# SVG diagrams in source order, mapped to the component export names.
DIAGRAM_NAMES = {
    "black-holes.html": [
        "horizonCrossSection", "redshift", "tidalStretch", "accretionDisk",
    ],
    "time-travel.html": [
        "lightCone", "twinParadox", "penroseDiagram", "wormhole",
    ],
}

TAG_RE = re.compile(r"<[^>]+>")
SECTION_RE = re.compile(
    r'<h2 id="(?P<id>[^"]+)" class="section-title">\s*'
    r'<span class="num">(?P<num>[\d.]+)</span>\s*(?P<title>.*?)</h2>',
    re.S,
)
EQUATION_RE = re.compile(r'<div class="equation">(.*?)</div>', re.S)
CALLOUT_RE = re.compile(
    r'<div class="(definition|tip|example)">\s*<strong>(.*?)</strong>\s*(.*?)</div>', re.S
)
DIAGRAM_RE = re.compile(
    r'<div class="diagram-scroll">\s*<svg[^>]*class="svg-diagram[^"]*"[^>]*>(.*?)</svg>'
    r'\s*(?:<div class="caption">(.*?)</div>)?\s*</div>',
    re.S,
)


def strip_tags(fragment: str) -> str:
    """Plain text from an HTML fragment, with entities decoded."""
    text = TAG_RE.sub(" ", fragment)
    text = html.unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def convert_math(text: str) -> str:
    """Rewrite $...$ delimiters into KaTeX's explicit \\( \\) and \\[ \\]."""
    # Display math first, so the inline pass cannot match across a $$ pair.
    text = re.sub(r"\$\$(.+?)\$\$", lambda m: "\\[" + m.group(1).strip() + "\\]", text, flags=re.S)
    text = re.sub(r"\$([^$\n]+?)\$", lambda m: "\\(" + m.group(1).strip() + "\\)", text)
    return text.strip()


def parse_page(path: Path, diagram_ids: list[str]) -> list[dict]:
    """One page -> list of section dicts."""
    markup = path.read_text(encoding="utf-8")
    matches = list(SECTION_RE.finditer(markup))
    sections: list[dict] = []

    diagram_cursor = 0

    for index, section_match in enumerate(matches):
        start = section_match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(markup)
        body = markup[start:end]

        blocks: list[dict] = []
        cursor = 0

        def add_paragraphs(chunk: str) -> None:
            for para in re.split(r"</p>", chunk):
                text = strip_tags(para)
                if len(text) > 1:
                    blocks.append({"kind": "para", "text": convert_math(text)})

        # Walk equations, callouts and diagrams in document order so the
        # paragraphs between them keep their position.
        landmarks = []
        for m in EQUATION_RE.finditer(body):
            landmarks.append((m.start(), "equation", m))
        for m in CALLOUT_RE.finditer(body):
            landmarks.append((m.start(), "callout", m))
        for m in DIAGRAM_RE.finditer(body):
            landmarks.append((m.start(), "diagram", m))
        landmarks.sort(key=lambda item: item[0])

        for position, kind, match in landmarks:
            add_paragraphs(body[cursor:position])
            cursor = position + len(match.group(0))

            if kind == "equation":
                # convert_math only handles $...$, and a display block that has
                # already lost its $$ fences must be wrapped explicitly.
                tex = strip_tags(match.group(1))
                tex = re.sub(r"^\$\$|\$\$", "", tex).strip()
                tex = tex.strip("$").strip()
                if tex:
                    blocks.append({"kind": "equation", "tex": "\\[" + tex + "\\]"})
            elif kind == "callout":
                variant, title, rest = match.group(1), match.group(2), match.group(3)
                text = convert_math(strip_tags(rest))
                if text:
                    blocks.append({
                        "kind": "callout",
                        "variant": variant,
                        "title": convert_math(strip_tags(title)),
                        "text": text,
                    })
            else:  # diagram
                if diagram_cursor < len(diagram_ids):
                    blocks.append({
                        "kind": "diagram",
                        "diagram": diagram_ids[diagram_cursor],
                        "caption": strip_tags(match.group(2) or ""),
                    })
                    diagram_cursor += 1

        add_paragraphs(body[cursor:])

        # Trailing "Next: X" link card is navigation, not content.
        blocks = [b for b in blocks
                  if not (b["kind"] == "para" and b["text"].startswith("Next:"))]

        sections.append({
            "id": section_match.group("id"),
            "number": int(float(section_match.group("num"))),
            "title": strip_tags(section_match.group("title")),
            "blocks": blocks,
        })

    return sections


def main() -> int:
    TARGET.mkdir(parents=True, exist_ok=True)
    topics = []

    for slug, filename, title, tagline, icon, hue in PAGES:
        path = SOURCE / filename
        if not path.exists():
            print(f"missing source: {path}", file=sys.stderr)
            return 1

        sections = parse_page(path, DIAGRAM_NAMES.get(filename, []))
        topics.append({
            "slug": slug,
            "title": title,
            "tagline": tagline,
            "intro": tagline,
            "icon": icon,
            "hue": hue,
            "sections": sections,
        })

        blocks = sum(len(s["blocks"]) for s in sections)
        equations = sum(1 for s in sections for b in s["blocks"] if b["kind"] == "equation")
        diagrams = sum(1 for s in sections for b in s["blocks"] if b["kind"] == "diagram")
        print(f"{slug:18} sections={len(sections):2} blocks={blocks:3} eq={equations:2} diag={diagrams}")

    payload = json.dumps(topics, indent=2, ensure_ascii=False)
    out = TARGET / "topics.json"
    out.write_text(payload, encoding="utf-8")
    print(f"\nwrote {out} ({len(payload) // 1024} KB)")

    resolve = TARGET / "topics.ts"
    resolve.write_text(
        "import type { Topic } from './types'\n"
        "import raw from './topics.json'\n\n"
        "/** All topics, imported once and typed at the boundary. */\n"
        "export const topics: Topic[] = raw as Topic[]\n\n"
        "export const topicSlugs = topics.map((t) => t.slug)\n\n"
        "export function findTopic(slug: string): Topic | undefined {\n"
        "  return topics.find((t) => t.slug === slug)\n"
        "}\n",
        encoding="utf-8",
    )
    print(f"wrote {resolve}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())