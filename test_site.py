"""Dependency-free checks for the published single-file learning game."""
import hashlib
from html.parser import HTMLParser
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
        self.assertIn('id="updated-label"',self.html)

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

    def test_chinese_help_is_complete_and_documented(self):
        for card in self.data['cards']:
            for key in ('a','b','word'):
                with self.subTest(word=card['word'],part=key):
                    self.assertRegex(card['zh'][key],r'[\u4e00-\u9fff]')
        self.assertIn('<summary id="word-help-summary">词语提示</summary>',self.html)
        self.assertIn('搜索中文或英文词组',self.html)
        meanings={card['word']:card['zh'] for card in self.data['cards']}
        self.assertEqual(meanings['hot dog']['word'],'热狗')
        self.assertIn('不是',meanings['hot dog']['note'])
        readme=(ROOT/'README.zh-CN.md').read_text()
        for text in ('词语提示','中文或英文','单词和朗读始终是英文','butterfly','默认收起'):
            self.assertIn(text,readme)
        self.assertNotIn('GitHub Pages 启用后可用',readme)

    def test_both_interface_languages_are_complete(self):
        ui=self.data['ui']
        self.assertEqual(set(ui),{'zh','en'})
        self.assertEqual(set(ui['zh']),set(ui['en']))
        for key in ui['zh']:
            self.assertTrue(ui['zh'][key].strip())
            self.assertTrue(ui['en'][key].strip())
            self.assertNotRegex(ui['en'][key],r'[\u4e00-\u9fff]')
        for card in self.data['cards']:
            self.assertEqual(bool(card['zh']['note']),bool(card['note_en']))
            self.assertNotRegex(card['note_en'],r'[\u4e00-\u9fff]')
        self.assertIn('href="?lang=zh" lang="zh-CN"',self.html)
        self.assertIn('href="?lang=en" lang="en"',self.html)

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
        readme=(ROOT/'README.zh-CN.md').read_text()
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
        english=(ROOT/'README.md').read_text()
        self.assertIn(f'Updated (California time): **{visible}**',english)
        self.assertIn(f"{len(self.data['cards'])} word groups",english)
        self.assertIn(f"{len(self.data['cards'])-pairs} written as one word and {pairs} written as two words",english)
        self.assertIn('[简体中文](README.zh-CN.md)',english)
        self.assertIn('[English](README.md)',readme)
        for doc in (english,readme):
            for language in ('zh','en'):
                self.assertIn(f'https://alpskyhere.github.io/word-together/?lang={language}',doc)
            self.assertNotIn('__UPDATED_',doc)

    def test_package_has_no_pdf_or_extra_files(self):
        expected={'.nojekyll','README.md','README.zh-CN.md','index.html','release.json','test_site.py','test_app.cjs'}
        files={p.name for p in ROOT.iterdir() if p.name!='__pycache__'}
        self.assertEqual(files,expected)
        self.assertFalse(re.search(r'(?:href|src)\s*=\s*[\"\'][^\"\']*\.pdf(?:[?#\"\'])',self.html,re.I))

    def test_public_feedback_links_and_documentation(self):
        class Links(HTMLParser):
            def __init__(self):
                super().__init__();self.links={}
            def handle_starttag(self,tag,attrs):
                attrs=dict(attrs)
                if tag=='a' and attrs.get('id','').startswith('feedback-'):
                    self.links[attrs['id']]=attrs
        parser=Links();parser.feed(self.html)
        expected={'feedback-link':'/issues/new','feedback-browse':'/issues'}
        self.assertEqual(set(parser.links),set(expected))
        for key,suffix in expected.items():
            link=parser.links[key]
            self.assertEqual(link['href'],'https://github.com/alpskyhere/word-together'+suffix)
            self.assertEqual(link['target'],'_blank')
            self.assertEqual(set(link['rel'].split()),{'noopener','noreferrer'})
            self.assertEqual(link['referrerpolicy'],'no-referrer')
            self.assertEqual(link['aria-describedby'],'feedback-notice')
        self.assertNotIn('mailto:',self.html)
        for filename,terms in [('README.md',('GitHub account','all posts are public','current word group','website version')),('README.zh-CN.md',('GitHub 账号','所有留言公开','当前词组','网页版本'))]:
            doc=(ROOT/filename).read_text()
            for text in terms:self.assertIn(text,doc)

    def test_shuffle_is_an_order_and_documented_in_both_languages(self):
        self.assertIn('id="random" type="button">打乱顺序</button>',self.html)
        self.assertIn('<option id="sort-shuffle" value="shuffle">随机顺序</option>',self.html)
        self.assertEqual(self.data['ui']['en']['random'],'Shuffle')
        self.assertEqual(self.data['ui']['en']['shuffle'],'Shuffled order')
        for filename,terms in [('README.md',('different order from the previous one','117 groups','Reloading preserves the order and position')),('README.zh-CN.md',('与上一次不同的顺序','117 组','刷新后保留顺序和位置'))]:
            doc=(ROOT/filename).read_text()
            for text in terms:self.assertIn(text,doc)
        for filename in ('README.md','README.zh-CN.md'):
            doc=(ROOT/filename).read_text()
            self.assertNotIn('随机一组',doc)
            self.assertNotIn('**Random**',doc)

    def test_optional_celebration_and_readme_link_guidance(self):
        self.assertIn('id="celebrate" type="button" aria-pressed="false"',self.html)
        self.assertIn('id="celebration" class="celebration" hidden',self.html)
        self.assertIn('pointer-events:none',self.html)
        self.assertIn('@media(prefers-reduced-motion:reduce){.confetti{display:none}}',self.html)
        self.assertEqual(self.data['ui']['en']['celebrationOff'],'Celebrate: off')
        self.assertEqual(self.data['ui']['zh']['celebrationOff'],'庆祝：关')
        for filename,terms in [('README.md',('off by default','10 different groups','2.6 seconds','⌘-click','Ctrl-click')),('README.zh-CN.md',('默认关闭','10 个不同词组','2.6 秒','按住 ⌘','按住 Ctrl'))]:
            doc=(ROOT/filename).read_text()
            for term in terms:self.assertIn(term,doc)
            for lang in ('zh','en'):
                self.assertIn(f'https://alpskyhere.github.io/word-together/?lang={lang}',doc)
            self.assertNotIn('target="_blank"',doc)

if __name__=='__main__':unittest.main()
