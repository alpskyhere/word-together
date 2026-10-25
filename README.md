# Word Together

**English** · [简体中文](README.zh-CN.md)

A picture-card word game for children and families. Explore **141 word groups**: 91 written as one word and 50 written as two words.

`snow + man → snowman` · `toy + car → toy car`

[Play in English](https://alpskyhere.github.io/word-together/?lang=en) · [使用中文版](https://alpskyhere.github.io/word-together/?lang=zh)

Keep GitHub open: ⌘-click (Mac) or Ctrl-click (Windows/Linux) either play link to open a new tab. On a phone, press and hold the link and choose a new tab.

## Language

Choose **中文 / English** at the top of the page. Buttons, instructions, word notes, status messages and accessibility labels use the selected language. The learning words, pictures and pronunciation stay the same; words and speech are always English.

Language-specific links take priority, followed by your saved language choice, then your browser language. Switching languages keeps the current card, reveal state, sorting and learning progress.

## How to play

1. Click a picture, word or **Listen** to hear it.
2. Choose **Clap & reveal** to see the combined word or phrase. Automatic reading can be turned off in **Settings**.
3. Choose **Next group** to continue, or **Show the parts** to revisit the same group.

Some combinations have a meaning of their own, such as `hot dog` and `butterfly`. Open **Word notes** for an explanation in the interface language. Notes start closed and close when you move to another group.

Use **Choose words** to filter, sort or search in English or Chinese. **Practice later** saves a group to the **Review list** inside the chooser. **Shuffle** rearranges the groups. Before revealing, the small **Skip** button moves past a group. Colors show word parts, not syllables; this game is not a complete phonics course.

**Settings** contains automatic reading, celebrations, sound and full screen. **Celebrate** and **Sound** are on by default. Every 10 different groups revealed in a batch brings three waves of confetti, ribbons and stars, plus a medal. The visual effect ends after 3.6 seconds and never blocks the controls. A soft reward chime follows pronunciation; use **Sound** to mute it without muting words. Moving on, starting another pronunciation or hiding the tab cancels pending sound. Reduced-motion settings show a still medal. Try it from **Settings → Preview celebration**, without changing progress. This update enables celebrations once for older records; later off/mute choices stay saved. Repeats within a batch do not count, reload does not replay rewards, and re-enabling celebrations starts a fresh batch.

## Categories and sorting

Inside **Choose words**, select **All / One word / Two words**. Sort by **Suggested order**, **Alphabetical A–Z**, **Shortest first**, or **Shuffled order**. Alphabetical order ignores spaces; shortest first counts letters, with A–Z for ties.

Changing the sort starts at the first group in the current selection and preserves learning records. Category, review mode and search share the same selection and sort. Exit review or change the category to broaden the results.

Each click on **Shuffle** creates a different order from the previous one and starts at the first group. **All** includes all 141 groups; a category or review list shows only its matching groups. **Next group** follows the new order without repeats in a complete pass. Reloading preserves the order and position. When updating from the 117-group edition, existing learning records and the saved shuffled order are kept, with new groups appended. With fewer than two groups, shuffling is unavailable.

## Progress and offline use

Progress and your explicit language choice stay in the current browser and are not uploaded. Devices do not sync automatically. Clearing browser data removes saved records. The main page shows the current group number; the total “Revealed” count is inside **Choose words**. “Revealed” means seen, not mastered.

You can also download the repository and open `index.html` in a browser, without installing anything. Words, pictures and both interface languages are embedded; speech availability depends on the browser and system voices. This release does not include PDFs.

## Feedback

Choose **Feedback** at the bottom of the page. In its panel, choose **Feedback** to open a [GitHub Issue](https://github.com/alpskyhere/word-together/issues/new), or **View feedback** to read and comment on [existing posts](https://github.com/alpskyhere/word-together/issues). Posting requires a GitHub account and an internet connection; all posts are public.

The draft includes the current word group and website version. Review it before submitting. Learning records and the site owner's email are not included. Please leave out email addresses, children's names and other personal information.

## Tests

No third-party packages are required:

```sh
python3 test_site.py
node test_app.cjs
```

Updated (California time): **10/25/2026 15:22 PDT (UTC-07:00)** · [Release information](release.json)
