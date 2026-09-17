// Self-contained "check your understanding" quiz widget.
// No external dependencies, by design (see the Colab-button lesson in
// this repo's history: an external asset that fails to load silently is
// worse than a plain HTML/CSS/JS element that always works).
//
// Usage, from a qmd page:
//
//   ```{=html}
//   <div id="some-unique-id"></div>
//   <script>
//   renderQuiz("some-unique-id", [
//     {
//       question: "What is 2 + 2?",
//       choices: ["3", "4", "5"],
//       correctIndex: 1,
//       explanation: "2 + 2 = 4."
//     }
//   ]);
//   </script>
//   ```

function renderQuiz(containerId, questions) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!document.getElementById("quiz-widget-style")) {
    const style = document.createElement("style");
    style.id = "quiz-widget-style";
    style.textContent = `
      .quiz-widget-q { border: 1px solid rgba(0,0,0,0.15); border-radius: 8px;
        padding: 1em 1.2em; margin-bottom: 1.2em; }
      .quiz-widget-q p.quiz-widget-qtext { font-weight: 600; margin-bottom: 0.75em; }
      .quiz-widget-q pre { margin: 0.5em 0 1em 0; }
      .quiz-widget-choice { display: block; margin: 0.4em 0; cursor: pointer; }
      .quiz-widget-feedback { margin-top: 0.75em; padding: 0.6em 0.9em;
        border-radius: 6px; display: none; }
      .quiz-widget-feedback.correct { background: #d4edda; color: #155724; display: block; }
      .quiz-widget-feedback.incorrect { background: #f8d7da; color: #721c24; display: block; }
      .quiz-widget-check { margin-top: 0.6em; padding: 6px 16px; border: none;
        border-radius: 6px; background: #0d6efd; color: white; cursor: pointer;
        font-size: 0.9em; }
      .quiz-widget-check:hover { background: #0b5ed7; }
    `;
    document.head.appendChild(style);
  }

  questions.forEach((q, qi) => {
    const qDiv = document.createElement("div");
    qDiv.className = "quiz-widget-q";
    const qName = `${containerId}-q${qi}`;

    const choicesHtml = q.choices
      .map(
        (c, ci) => `
        <label class="quiz-widget-choice">
          <input type="radio" name="${qName}" value="${ci}"> ${c}
        </label>`
      )
      .join("");

    qDiv.innerHTML = `
      <p class="quiz-widget-qtext">${qi + 1}. ${q.question}</p>
      ${choicesHtml}
      <button class="quiz-widget-check" type="button">Check answer</button>
      <div class="quiz-widget-feedback"></div>
    `;
    container.appendChild(qDiv);

    const btn = qDiv.querySelector(".quiz-widget-check");
    const feedback = qDiv.querySelector(".quiz-widget-feedback");
    btn.addEventListener("click", () => {
      const selected = qDiv.querySelector(`input[name="${qName}"]:checked`);
      if (!selected) {
        feedback.className = "quiz-widget-feedback incorrect";
        feedback.textContent = "Select an answer first.";
        return;
      }
      const idx = parseInt(selected.value, 10);
      if (idx === q.correctIndex) {
        feedback.className = "quiz-widget-feedback correct";
        feedback.innerHTML = "&#10003; Correct. " + (q.explanation || "");
      } else {
        feedback.className = "quiz-widget-feedback incorrect";
        feedback.innerHTML = "&#10007; Not quite. " + (q.explanation || "");
      }
    });
  });
}
