#!/usr/bin/env python3
"""Atualiza o feed local de notícias da Asa Sul a partir da página Brasília.

O seletor de origem é deliberadamente a mesma área de cards exibida pelo
portal. A API REST só enriquece os cards selecionados com id e data.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import sys
import tempfile
import time
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "asasul" / "data" / "noticias.json"
SOURCE_URL = "https://comshalom.org/brasilia/"
REST_URL = "https://comshalom.org/wp-json/wp/v2/posts?slug={slug}&_fields=id,date,slug&_cb={cb}"
EXPECTED_COUNT = 3
ALLOWED_HOST = re.compile(r"(^|\.)comshalom\.org$", re.IGNORECASE)
USER_AGENT = "ShalomBrasiliaNewsUpdater/1.0 (+https://brasilia.comshalom.org/asasul/)"


class Node:
    def __init__(self, tag: str = "root", attrs: dict[str, str] | None = None):
        self.tag = tag
        self.attrs = attrs or {}
        self.children: list[Node | str] = []


class TreeParser(HTMLParser):
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node()
        self.stack = [self.root]

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        node = Node(tag.lower(), {k: v or "" for k, v in attrs})
        self.stack[-1].children.append(node)
        if tag.lower() not in self.VOID:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in self.VOID and len(self.stack) > 1:
            self.stack.pop()

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data: str) -> None:
        self.stack[-1].children.append(data)


def descendants(node: Node, predicate):
    for child in node.children:
        if isinstance(child, Node):
            if predicate(child):
                yield child
            yield from descendants(child, predicate)


def class_names(node: Node) -> set[str]:
    return set(node.attrs.get("class", "").split())


def text_content(node: Node) -> str:
    bits: list[str] = []
    for child in node.children:
        if isinstance(child, Node):
            bits.append(text_content(child))
        else:
            bits.append(child)
    return " ".join("".join(bits).split())


def first_descendant(node: Node, predicate) -> Node | None:
    return next(descendants(node, predicate), None)


def clean_text(value: str) -> str:
    value = re.sub(r"<[^>]*>", " ", html.unescape(value or ""))
    return " ".join(value.split()).strip()


def valid_url(value: str) -> bool:
    try:
        parsed = urlparse(value)
    except ValueError:
        return False
    return parsed.scheme == "https" and not parsed.username and not parsed.password and bool(ALLOWED_HOST.fullmatch(parsed.hostname or ""))


def fetch(url: str, kind: str) -> bytes:
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/json"})
    with urlopen(request, timeout=30) as response:
        final = response.geturl()
        parsed = urlparse(final)
        if parsed.scheme != "https" or parsed.username or parsed.password or (parsed.hostname or "").lower() != "comshalom.org":
            raise ValueError(f"redirect externo rejeitado: {final}")
        path = parsed.path.rstrip("/") or "/"
        if kind == "source" and path != "/brasilia":
            raise ValueError(f"redirect da fonte rejeitado: {final}")
        if kind == "rest" and not path.startswith("/wp-json/wp/v2/posts"):
            raise ValueError(f"redirect REST rejeitado: {final}")
        return response.read()


def selected_cards(source: str) -> list[dict[str, str]]:
    parser = TreeParser()
    parser.feed(source)
    article = first_descendant(parser.root, lambda n: n.tag == "article" and n.attrs.get("id") == "post-413137")
    if article is None:
        raise ValueError("article#post-413137 não encontrado")

    widgets = list(descendants(article, lambda n: "widget-body-post" in class_names(n) and "ajax" in class_names(n)))
    entries: list[Node] = []
    for widget in widgets:
        entries.extend(descendants(widget, lambda n: "widget-entry" in class_names(n)))
    cards: list[dict[str, str]] = []
    for entry in entries:
        link_node = first_descendant(entry, lambda n: "widget-entry-permalink" in class_names(n) and n.tag == "a")
        title_node = first_descendant(entry, lambda n: "widget-entry-title" in class_names(n))
        excerpt_node = first_descendant(entry, lambda n: "widget-entry-excerpt" in class_names(n))
        image_node = first_descendant(entry, lambda n: n.tag == "img" and (n.attrs.get("data-lazy-src") or n.attrs.get("src")))
        if not link_node or not title_node or not image_node:
            continue
        link = link_node.attrs.get("href", "").strip()
        image = (image_node.attrs.get("data-lazy-src") or image_node.attrs.get("src", "")).strip()
        title = clean_text(text_content(title_node))
        excerpt = clean_text(text_content(excerpt_node)) if excerpt_node else ""
        if not valid_url(link) or not valid_url(image) or not title:
            continue
        slug = urlparse(link).path.strip("/").split("/")[-1]
        if not slug:
            continue
        cards.append({"slug": slug, "link": link, "title": title, "excerpt": excerpt, "img": image})
    unique: list[dict[str, str]] = []
    seen: set[str] = set()
    for card in cards:
        if card["link"] in seen:
            continue
        seen.add(card["link"])
        unique.append(card)
    if len(unique) < EXPECTED_COUNT:
        raise ValueError(f"apenas {len(unique)} cards válidos encontrados; esperado pelo menos {EXPECTED_COUNT}")
    return unique[:EXPECTED_COUNT]


def enrich(card: dict[str, str]) -> dict[str, object]:
    url = REST_URL.format(slug=quote(card["slug"], safe=""), cb=time.strftime("%Y%m%d%H", time.gmtime()))
    payload = json.loads(fetch(url, "rest").decode("utf-8"))
    if not isinstance(payload, list) or not payload or not isinstance(payload[0], dict):
        raise ValueError(f"REST sem post para o slug {card['slug']}")
    post = payload[0]
    if str(post.get("slug", "")) != card["slug"] or not isinstance(post.get("id"), int) or not post.get("date"):
        raise ValueError(f"REST inválido para o slug {card['slug']}")
    return {
        "id": post["id"],
        "date": post["date"],
        "title": card["title"],
        "excerpt": card["excerpt"],
        "link": card["link"],
        "img": card["img"],
    }


def validate_feed(items: object) -> list[dict[str, object]]:
    if not isinstance(items, list) or len(items) < EXPECTED_COUNT:
        raise ValueError(f"feed deve conter pelo menos {EXPECTED_COUNT} itens")
    result: list[dict[str, object]] = []
    seen: set[str] = set()
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("item do feed não é objeto")
        required = ("id", "date", "title", "excerpt", "link", "img")
        if any(not item.get(key) for key in required):
            raise ValueError("item do feed incompleto")
        if not isinstance(item["id"], int) or not isinstance(item["date"], str):
            raise ValueError("id/data inválidos")
        for key in ("link", "img"):
            if not isinstance(item[key], str) or not valid_url(item[key]):
                raise ValueError(f"URL inválida em {key}")
        if item["link"] in seen:
            raise ValueError("links duplicados no feed")
        seen.add(item["link"])
        result.append({key: item[key] for key in required})
    return result


def atomic_write(items: list[dict[str, object]]) -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="noticias.", suffix=".json", dir=OUTPUT.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(items, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, OUTPUT)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def check() -> None:
    with OUTPUT.open(encoding="utf-8") as handle:
        validate_feed(json.load(handle))


def update() -> None:
    source = fetch(SOURCE_URL, "source").decode("utf-8", "replace")
    items = validate_feed([enrich(card) for card in selected_cards(source)])
    atomic_write(items)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="valida o JSON versionado sem acessar a rede")
    args = parser.parse_args()
    try:
        check() if args.check else update()
    except Exception as exc:  # preserve the previous JSON on every failure
        print(f"update-asasul-news: {exc}", file=sys.stderr)
        return 1
    print(f"OK: {OUTPUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
