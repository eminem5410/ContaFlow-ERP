#!/usr/bin/env python3
"""Render all ERP diagram HTML files to PNG using Playwright."""
import asyncio
import os
from playwright.async_api import async_playwright

DIAGRAMS_DIR = "/home/z/my-project/download/erp-diagrams"
FILES = [
    ("01-architecture.html", "01-arquitectura-del-sistema.png"),
    ("02-er-model.html", "02-modelo-de-datos-er.png"),
    ("03-accounting-flow.html", "03-flujo-contable-partida-doble.png"),
    ("04-roadmap.html", "04-roadmap-de-desarrollo.png"),
    ("05-bounded-contexts.html", "05-bounded-contexts-ddd.png"),
]

async def render_html_to_png(html_path, png_path, width=1200, scale=2):
    """Generic HTML → PNG renderer."""
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(
            viewport={'width': width, 'height': 800},
            device_scale_factor=scale
        )
        await page.goto(f'file://{html_path}', wait_until='networkidle', timeout=30000)
        await page.wait_for_timeout(800)

        # For mermaid diagrams, wait for SVG
        if 'mermaid' in open(html_path).read():
            await page.wait_for_selector('#diagram svg', timeout=15000)
            await page.wait_for_timeout(1000)
            svg_size = await page.evaluate('''() => {
                const svg = document.querySelector('#diagram svg');
                if (!svg) return null;
                const r = svg.getBoundingClientRect();
                return { width: r.width, height: r.height };
            }''')
            el = page.locator('#diagram')
            css_bbox = await el.bounding_box()
            svg_w = svg_size['width'] if svg_size else width
            svg_h = svg_size['height'] if svg_size else 800
            css_w = css_bbox['width'] if css_bbox else width
            css_h = css_bbox['height'] if css_bbox else 800
            fit_w = max(width, int(max(svg_w, css_w) + 200))
            fit_h = int(max(svg_h, css_h) + 200)
        else:
            el = page.locator('#root') if await page.locator('#root').count() > 0 else page.locator('#mindmap')
            bbox = await el.bounding_box()
            if bbox:
                fit_w = max(width, int(bbox['width'] + 120))
                fit_h = int(bbox['height'] + 120)
            else:
                fit_w = width
                fit_h = 1200

        await page.set_viewport_size({'width': fit_w, 'height': fit_h})
        await page.wait_for_timeout(400)

        # For mindmap, trigger connector drawing
        if await page.locator('#mindmap').count() > 0:
            await page.evaluate('if(typeof drawAllLines==="function") drawAllLines()')
            await page.wait_for_timeout(300)

        await el.screenshot(path=png_path)
        await browser.close()
        size_kb = os.path.getsize(png_path) / 1024
        print(f"OK {png_path} ({size_kb:.0f}KB) [{fit_w}x{fit_h}]")

async def main():
    print("=== Rendering ERP Diagrams ===\n")
    for html_file, png_file in FILES:
        html_path = os.path.join(DIAGRAMS_DIR, html_file)
        png_path = os.path.join(DIAGRAMS_DIR, png_file)
        if not os.path.exists(html_path):
            print(f"SKIP {html_file} (not found)")
            continue
        try:
            await render_html_to_png(html_path, png_path)
        except Exception as e:
            print(f"ERROR {html_file}: {e}")
    print("\n=== Done ===")

asyncio.run(main())
