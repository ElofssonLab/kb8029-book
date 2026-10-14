# KB8029 Course Book

An open-access companion to the redesigned KB8029 Bioinformatics course,
integrating classical bioinformatics and machine learning as one
day-by-day sequence rather than two separate blocks.

- **Live site:** https://course.bioinfo.se/
- **Rendered with:** [Quarto](https://quarto.org)
- **License:** CC BY-SA 4.0 (see `references.qmd` for the sources this
  book draws on and their individual licenses)

This repository holds only the book itself (pages and notebooks), kept
public specifically so its notebooks can be opened directly in
[Google Colab](https://colab.research.google.com/). The course's other
administrative material (grading, exam keys, etc.) lives in a separate,
private repository.

## Building locally

```sh
quarto render
```

## Feedback and contributions

Corrections and suggestions are very welcome: the course is new, and we know it
is not perfect. Please open an [issue](https://github.com/ElofssonLab/kb8029-book/issues)
for an error, something unclear or a notebook that does not run. Students can also
use the [feedback form](https://bioinfo.se/internal/kb8029-feedback/) (university
login, anonymous if you like).

Pull requests are welcome too, but they are not merged here: this repository is
copied from the course's private repository on every update, so a change merged
here would be overwritten. We make the change in the private repository instead,
and close the pull request with a link to it; the next update then carries your
fix. Your name is welcome in the acknowledgements.
