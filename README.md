# Word Together

**English** · [简体中文](README.zh-CN.md)

A picture-card word game for children and families. Explore **117 word groups**: 79 written as one word and 38 written as two words.

`snow + man → snowman` · `toy + car → toy car`

[Play in English](https://alpskyhere.github.io/word-together/?lang=en) · [使用中文版](https://alpskyhere.github.io/word-together/?lang=zh)

Keep GitHub open: ⌘-click (Mac) or Ctrl-click (Windows/Linux) either play link to open a new tab. On a phone, press and hold the link and choose a new tab.

## Language

Choose **中文 / English** at the top of the page. Buttons, instructions, word notes, status messages and accessibility labels use the selected language. The learning words, pictures and pronunciation stay the same; words and speech are always English.

Language-specific links take priority, followed by your saved language choice, then your browser language. Switching languages keeps the current card, reveal state, sorting and learning progress.

## How to play

1. Click a picture, word or **Listen** to hear it.
2. Choose **Clap & reveal** to see the combined word or phrase. Automatic reading can be turned off.
3. Choose **Next group** to continue, or **Show the parts** to revisit the same group.

Some combinations have a meaning of their own, such as `hot dog` and `butterfly`. Open **Word notes** for an explanation in the interface language. Notes start closed and close when you move to another group.

Use **Choose words** to search in English or Chinese, **Shuffle** to rearrange the groups, and **Practice later** to save a group to your practice list. Colors show word parts, not syllables; this game is not a complete phonics course.

**Celebrate** is off by default. Turn it on for silent confetti and a medal after every 10 different groups revealed in a batch, including practice. Repeated reveals within the batch do not count. The effect ends after 2.6 seconds and never blocks the controls or interrupts pronunciation. Reduced-motion settings show a still medal instead. The setting and unfinished batch stay in this browser; reloading does not replay a reward, and turning celebrations on again starts a new batch.

## Categories and sorting

Choose **All / One word / Two words**. Sort by **Suggested order**, **Alphabetical A–Z / Z–A**, **Shortest first**, or **Shuffled order**. Alphabetical order ignores spaces; shortest first counts letters, with A–Z for ties.

Changing the sort starts at the first group in the current selection and preserves learning records. The chooser and practice list follow the same sort.

Each click on **Shuffle** creates a different order from the previous one and starts at the first group. **All** includes all 117 groups; a category or practice list shows only its matching groups. **Next group** follows the new order without repeats in a complete pass. Reloading preserves the order and position. With fewer than two groups, shuffling is unavailable.

## Progress and offline use

Progress and your explicit language choice stay in the current browser and are not uploaded. Devices do not sync automatically. Clearing browser data removes saved records. “Revealed” means seen, not mastered.

You can also download the repository and open `index.html` in a browser, without installing anything. Words, pictures and both interface languages are embedded; speech availability depends on the browser and system voices. This release does not include PDFs.

## Feedback

Choose **Feedback** at the bottom of the page to open a [GitHub Issue](https://github.com/alpskyhere/word-together/issues/new), or **View feedback** to read and comment on [existing posts](https://github.com/alpskyhere/word-together/issues). Posting requires a GitHub account and an internet connection; all posts are public.

The draft includes the current word group and website version. Review it before submitting. Learning records and the site owner's email are not included. Please leave out email addresses, children's names and other personal information.

## Tests

No third-party packages are required:

```sh
python3 test_site.py
node test_app.cjs
```

Updated (California time): **10/25/2026 12:43 PDT (UTC-07:00)** · [Release information](release.json)
