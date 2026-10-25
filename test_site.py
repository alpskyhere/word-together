"""Dependency-free checks for the published single-file learning game."""
import hashlib
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import unittest
import xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parent

class SiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.content=(ROOT/'index.html').read_bytes()
        cls.html=cls.content.decode('utf-8')
        cls.data=json.loads(re.search(r'<script id="word-data" type="application/json">(.*?)</script>',cls.html,re.S).group(1))

    def test_release_matches_html(self):
        release=json.loads((ROOT/'release.json').read_text())
        self.assertEqual(release['sha256'],hashlib.sha256(self.content).hexdigest())
        self.assertEqual(release['file'],'index.html')

    def test_visible_update_date_matches_release(self):
        release=json.loads((ROOT/'release.json').read_text())
        updated=datetime.fromisoformat(release['updated_at'].replace('Z','+00:00'))
        self.assertEqual(updated.utcoffset(),timezone.utc.utcoffset(None))
        match=re.search(r'<time id="updated-at" datetime="([^"]+)"[^>]*>([^<]+)</time>',self.html)
        self.assertIsNotNone(match)
        self.assertEqual(match.group(1),release['updated_at'])
        visible=re.fullmatch(r'(\d{2}/\d{2}/\d{4} \d{2}:\d{2}) (PDT|PST) \(UTC([+-]\d{2}:\d{2})\)',match.group(2))
        self.assertIsNotNone(visible)
        self.assertEqual(visible.group(3),'-07:00' if visible.group(2)=='PDT' else '-08:00')
        displayed=datetime.strptime(visible.group(1)+visible.group(3),'%m/%d/%Y %H:%M%z')
        self.assertEqual(displayed,updated.replace(second=0,microsecond=0))
        self.assertIn('更新于 <time',self.html)

    def test_vocabulary_and_categories(self):
        cards=self.data['cards']
        self.assertEqual(len(cards),117)
        self.assertEqual(len({c['word'] for c in cards}),117)
        self.assertEqual(sum(c['kind']=='pair' for c in cards),38)
        for card in cards:
            self.assertEqual(card['a']+card['b'],card['word'].replace(' ',''))
            self.assertEqual(card['kind']=='pair',' ' in card['word'])

    def test_all_art_is_available_and_valid(self):
        self.assertEqual(len(self.data['art']),261)
        for card in self.data['cards']:
            for word in (card['a'],card['b'],card['word']):
                root=ET.fromstring(self.data['art'][word])
                self.assertEqual(root.get('aria-label'),word)
                self.assertTrue(root.tag.endswith('svg'))
        self.assertEqual(ET.fromstring(self.data['art']['pot@flower']).get('aria-label'),'pot')

    def test_images_differ_by_more_than_color(self):
        def shape(word):
            root=ET.fromstring(self.data['art'][word])
            for el in root.iter():
                for key in ('aria-label','fill','stroke'):el.attrib.pop(key,None)
            return ET.tostring(root)
        for a,b in [('blue','pencil'),('black','pencil'),('ice','cube'),('ice','ice cube'),('fruit','apple'),('butter','gold'),('police','police car'),('toy','toy box'),('shake','milk'),('play','toy'),('fall','rise'),('sunrise','sunset'),('sail','sailboat'),('port','airport'),('farm','farmhouse'),('flake','snowflake'),('ground','earth'),('board','cube'),('rubber','ring')]:
            with self.subTest(words=(a,b)):self.assertNotEqual(shape(a),shape(b))

    def test_no_external_resources_or_build_placeholders(self):
        self.assertNotIn('/*__',self.html)
        self.assertFalse(re.search(r'<script[^>]+src=',self.html))
        self.assertFalse(re.search(r'<link[^>]+href=',self.html))
        self.assertNotIn('fetch(',self.html)
        self.assertNotIn('file:///',self.html)
        self.assertNotIn('127.0.0.1',self.html)

    def test_readme_matches_this_release(self):
        readme=(ROOT/'README.md').read_text()
        release=json.loads((ROOT/'release.json').read_text())
        visible=re.search(r'<time id="updated-at"[^>]*>([^<]+)</time>',self.html).group(1)
        self.assertIn(f'网页更新时间（加州时间）：**{visible}**',readme)
        self.assertIn('[版本信息](release.json)',readme)
        self.assertIn(f"{len(self.data['cards'])} 组词语组合",readme)
        pairs=sum(c['kind']=='pair' for c in self.data['cards'])
        self.assertIn(f"{len(self.data['cards'])-pairs} 组连着写、{pairs} 组分开写",readme)
        self.assertIn('https://alpskyhere.github.io/word-together/',readme)
        self.assertNotIn('__UPDATED_AT__',readme)
        self.assertNotIn('__UPDATED_DISPLAY__',readme)
        self.assertNotIn('__SHA256__',readme)

    def test_package_has_no_pdf_or_extra_files(self):
        expected={'.nojekyll','README.md','index.html','release.json','test_site.py','test_app.cjs'}
        files={p.name for p in ROOT.iterdir() if p.name!='__pycache__'}
        self.assertEqual(files,expected)
        self.assertFalse(re.search(r'(?:href|src)\s*=\s*[\"\'][^\"\']*\.pdf(?:[?#\"\'])',self.html,re.I))

if __name__=='__main__':unittest.main()
